import traceback

from hashlib import sha512
from random import random
from uuid import uuid4

from entity import Entity

from persisted import Persisted

from randname import randname

from tornado.gen import coroutine


class Client(Persisted):
    table = "players"
    sekrit = '679d621ade4a4be4a15f00c78c4fc3b4'

    def __init__(self, connection):
        self.connection = connection
        self.location = None

        super(Client, self).__init__(connection.application.server.world)

        if self.data.get('username') is None:
            self.data['username'] = randname(5 + int(random() * 3))

        self.entity = None

    @coroutine
    def on_message(self, message):
        print("Client message: {}".format(message))

        # self.connection.send({'output': 'yep'})

        # editor messages:
        if 'getWorld' in message:
            world_data = {id: location.data for id, location in self.world.locations.items()}
            self.send(world=world_data)
        if 'createRoom' in message:
            location = yield self.world.make_location(message['createRoom'])
            self.send(roomCreated=location.data)

        # client messages:
        if 'cmd' in message:
            cmd = message['cmd'].split()[0]
            cmd_arg = message['cmd'][len(cmd) + 1:]
            print('cmd: "{}", cmd_arg: "{}"'.format(cmd, cmd_arg))
            yield self.on_cmd(cmd, cmd_arg)
        if 'chat' in message:
            if self.location is not None:
                chat_msg = message['chat']
                self.broadcast(chat_msg)
        if 'login_token' in message:
            yield self.login_with_token(message['login_token'])
        if 'guest' in message:
            yield self.login_as_guest()

    @coroutine
    def on_cmd(self, cmd, cmd_arg):
        print("on_cmd called.")
        if cmd == 'join':
            yield self.join(cmd_arg)
        elif cmd == 'register':
            yield self.register(cmd_arg)
        elif cmd == 'login':
            yield self.login(cmd_arg)
        else:
            print("Command {} not recognised.".format(cmd))

    @coroutine
    def register(self, cmd_arg):
        args = cmd_arg.split()
        if len(args) < 2 or len(args) > 3:
            self.send("Usage: /register username password [email]")

        if len(args) == 2:
            args.append(None)

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

        token = yield self.create_token()
        self.send("Registered as {}".format(username), token=token)
        print(self.world.entities)

    @coroutine
    def login(self, cmd_arg):
        args = cmd_arg.split()
        if(len(args) != 2):
            self.send("Usage: /login username password")

        username, password = cmd_arg.split()

        result = yield self.world.db.query('select * from players where username = %s', [username])

        if result:
            data = result.as_dict()
            salt, hashed_password = data['password'].split(':')

            if sha512((salt + Client.sekrit + password).encode('utf8')).hexdigest() == hashed_password:
                self.login_success(data)
                token = yield self.create_token()
                self.send(token=token)
            else:
                self.send("Wrong username/password")
        else:
            self.send("Wrong username/password")

    @coroutine
    def login_with_token(self, token):
        result = yield self.world.db.query('select * from tokens where token = %s', [token])
        if result:
            user_id = result.as_dict()['player_id']
            data = yield self.world.db.query('select * from players where id = %s', [user_id])
            self.login_success(data.as_dict())
        else:
            self.send("Login token invalid or expired.")
            yield self.login_as_guest()

    @coroutine
    def login_as_guest(self):
        self.entity = yield Entity(self.world, data={'name': self.data['username']}).save()
        self.world.entities[self.entity.id] = self.entity
        self.send("Logged in as a guest. Hi {}.".format(self.data['username']))

    def login_success(self, data):
        self.data = data
        self.id = data['id']
        self.entity = self.world.entities[data['entity_id']]
        self.send("Logged in as {}".format(self.data['username']))

    @coroutine
    def create_token(self):
        token = uuid4().hex
        yield self.world.db.query('insert into tokens (token, player_id) values (%s, %s);', [token, self.id])
        return token

    @coroutine
    def join(self, location_id):
        print("joining {}".format(location_id))
        old_location = self.location
        if old_location is not None:
            old_location.remove_client(self)
            yield old_location.save()

        try:
            new_location = self.world.locations.get(int(location_id))
            new_location.add_client(self)
            yield new_location.save()
            self.send(output=dict(
                text=new_location.data['description'],
                joined=new_location.data['name'],
                contents=new_location.contents()
            ))
            self.broadcast(output=dict(
                text="{} entered.".format(self.data['username']),
                contents=new_location.contents()
            ))
        except Exception:
            print("Problem joining room:")
            traceback.print_exc()

    def send(self, text=None, **kwargs):
        if text is not None:
            kwargs['output'] = {
                'text': text,
                'contents': self.location.contents() if self.location is not None else None
            }
        self.connection.send(kwargs)

    def broadcast(self, text=None, **kwargs):
        if text is not None:
            kwargs['output'] = {
                'text': text,
                'user': self.data['username'],
                'contents': self.location.contents() if self.location is not None else None
            }

        if self.location is not None:
            for client in self.location.clients:
                client.connection.send(kwargs)
        else:
            self.send("Oh no, you're not anywhere.")
