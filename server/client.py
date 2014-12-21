from hashlib import sha512
from inspect import cleandoc
from random import random
from uuid import uuid4

from entity import Entity

from persisted import Persisted

from randname import randname

from tornado.gen import coroutine
from tornado.websocket import WebSocketClosedError

# TODO: Split up funcationality from this into player and editor classes.


class Client(Persisted):
    table = "players"
    sekrit = '679d621ade4a4be4a15f00c78c4fc3b4'

    def __init__(self, connection):
        self.connection = connection

        super(Client, self).__init__(connection.application.server.world)

        if self.data.get('username') is None:
            self.data['username'] = randname(5 + int(random() * 3))
            self.id = None
            self.guest = True
        else:
            self.guest = False

        self.entity = None

        self.commands = {
            'help': self.help,
            'go': self.go,
            'register': self.register,
            'login': self.login
        }

    @coroutine
    def on_message(self, message):
        print("Client message: {}".format(message))

        # editor messages:
        if 'getWorld' in message:
            world_data = {id: location.data for id, location in self.world.locations.items()}
            self.send(world=world_data)
            self.world.editors.append(self)
        if 'createRoom' in message:
            location = yield self.world.make_location(message['createRoom'])
            for client in self.world.editors:
                try:
                    client.send(roomCreated=location.data)
                except WebSocketClosedError:
                    self.world.editors.remove(client)
        if 'editRoom' in message:
            data = message['editRoom']
            print(data)
            location = self.world.locations.get(data['id'])
            if location is not None:
                location.data = data
                yield location.save()
                for client in self.world.editors:
                    try:
                        client.send(roomUpdated=location.data)
                    except WebSocketClosedError:
                        self.world.editors.remove(client)
        if 'moveRoom' in message:
            data = message['moveRoom']
            location = self.world.locations.get(data['id'])
            if location is not None:
                location.data['edit_x'] = data['edit_x']
                location.data['edit_y'] = data['edit_y']
                yield location.save()
                for client in self.world.editors:
                    try:
                        client.send(roomMoved=data)
                    except WebSocketClosedError:
                        self.world.editors.remove(client)

        # client messages:
        if 'cmd' in message:
            cmd = message['cmd'].split()[0]
            cmd_arg = message['cmd'][len(cmd) + 1:]
            print('cmd: "{}", cmd_arg: "{}"'.format(cmd, cmd_arg))
            yield self.on_cmd(cmd, cmd_arg)
        if 'chat' in message:
            if self.entity.location is not None:
                chat_msg = message['chat']
                if self.entity.location:
                    self.entity.location.send_chat(self.data['username'], chat_msg)
                else:
                    self.send("You seem to be nowhere.")
        if 'login_token' in message:
            yield self.login_with_token(message['login_token'])
        if 'guest' in message:
            yield self.login_as_guest()

    @coroutine
    def on_cmd(self, cmd, cmd_arg):
        command = self.commands[cmd]
        if command is not None:
            yield command(cmd_arg)
        else:
            print("Command {} not recognised.".format(cmd))

    @coroutine
    def help(self, cmd_arg):
        """Display this help text."""
        if cmd_arg is "":
            for command, func in self.commands.items():
                self.send(output=dict(text=cleandoc(func.__doc__), header=command))
        else:
            command = cmd_arg.strip()
            if command in self.commands:
                self.send(output=dict(text=cleandoc(self.commands[command].__doc__), header=command))
            else:
                self.send("Command {} not found.".format(command))

    @coroutine
    def register(self, cmd_arg):
        """
        /register username, password
        Create a new account with the provided username and password.  Your progress as a guest will be saved.
        """
        args = cmd_arg.split()
        if len(args) != 2:
            self.send("Usage: /register username password")

        if len(args) == 2:
            args.append(None)

        # Email currently unused.
        username, password, email = args

        print("Registering {}".format(username))

        self.data['username'] = username
        salt = uuid4().hex
        hashed_password = sha512((salt + Client.sekrit + password).encode('utf8')).hexdigest()
        self.data['password'] = "{}:{}".format(salt, hashed_password)
        self.data['email'] = email
        self.data['entity_id'] = self.entity.id
        yield self.save()

        self.entity.data['name'] = self.data['username']
        if self.entity.data.get('attributes') and self.entity.data['attributes'].get('guest'):
            del self.entity.data['attributes']['guest']
        yield self.entity.save()

        token = yield self.create_token()
        self.send("Registered as {}".format(username), token=token)
        print(self.world.entities)

    @coroutine
    def login(self, cmd_arg):
        """
        /login username password
        Log in to an existing account.  If you are using a guest account you will lose access to it.
        """
        args = cmd_arg.split()
        if(len(args) != 2):
            self.send("Usage: /login username password")

        username, password = cmd_arg.split()

        result = yield self.world.db.query('select * from players where username = %s', [username])

        if result:
            data = result.as_dict()
            salt, hashed_password = data['password'].split(':')

            if sha512((salt + Client.sekrit + password).encode('utf8')).hexdigest() == hashed_password:
                yield self.login_success(data)
                token = yield self.create_token()
                self.send(token=token)
            else:
                self.send("Wrong username/password")
        else:
            self.send("Wrong username/password")

        result.free()

    @coroutine
    def login_with_token(self, token):
        try:
            result = yield self.world.db.query('select * from tokens where token = %s', [token])
            if result:
                user_id = result.as_dict()['player_id']
                try:
                    data = yield self.world.db.query('select * from players where id = %s', [user_id])
                    yield self.login_success(data.as_dict())
                finally:
                    data.free()
            else:
                self.send("Login token invalid or expired.")
                yield self.login_as_guest()
        finally:
            result.free()

    @coroutine
    def login_as_guest(self):
        print("New guest connection.")
        self.entity = yield Entity(self.world, data={'name': self.data['username'],
                                                     'attributes': {'guest': 'true'}}).save()
        self.entity.client = self
        self.world.entities[self.entity.id] = self.entity
        yield self.world.locations[self.entity.data['location_id']].add_entity(self.entity)
        self.send("Logged in as a guest. Hi {}.".format(self.data['username']))
        self.send_location_description()
        self.entity.location.send_event("{} has formed.".format(self.data['username']))

    @coroutine
    def login_success(self, data):
        self.data = data
        self.id = data['id']
        self.entity = self.world.entities[data['entity_id']]
        self.entity.client = self
        print("{} logged in successfully.".format(self.data['username']))
        yield self.world.locations[self.entity.data['location_id']].add_entity(self.entity)
        self.send("Logged in as {}".format(self.data['username']))
        self.send_location_description()
        self.entity.location.send_event("{} woke up.".format(self.data['username']))

    @coroutine
    def create_token(self):
        token = uuid4().hex
        result = yield self.world.db.query('insert into tokens (token, player_id) values (%s, %s);', [token, self.id])
        result.free()
        return token

    @coroutine
    def go(self, exit):
        """
        /go direction
        Go through an exit in a direction
        """
        old_location = self.entity.location

        new_location_id = old_location.data['exits'].get(exit)
        if new_location_id is None:
            self.send("Couldn't find exit {}".format(exit))
        else:
            old_location.remove_client(self)
            yield old_location.save()
            new_location = self.world.locations.get(new_location_id)
            print("{} going {} to {}".format(self.data['username'], exit, new_location.data['name']))
            yield new_location.add_entity(self.entity)
            yield new_location.save()
            self.send_location_description()
            self.send_event("{} entered.".format(self.data['username']))

    def send(self, text=None, **kwargs):
        if text is not None:
            kwargs['output'] = {'text': text}
            if self.entity is not None and self.entity.location is not None:
                kwargs['output']['contents'] = self.entity.location.contents()
        self.connection.send(kwargs)

    def send_location_description(self):
        self.send(output=dict(
            text=self.entity.location.describe(),
            header=self.entity.location.data['name'],
            contents=self.entity.location.contents()
        ))

    @coroutine
    def on_close(self):
        if self.entity.location is not None:
            if self.id is None:
                old_location = self.entity.location
                yield self.entity.destroy()
                old_location.send_event("{} was vapourized.".format(self.data['username']))
            else:
                self.entity.location.send_event("{} went to sleep.".format(self.data['username']))
