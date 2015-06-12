import os

from hashlib import sha512
from random import random
from uuid import uuid4

from editor import Editor

from entity import Entity

from persisted import Persisted

from player import Player

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

        self.entity = None
        self.ghosted = False

        self.editor = Editor(self)
        self.player = Player(self)

    @coroutine
    def on_message(self, message):
        print("Client message: {}".format(message))

        # editor messages:
        if 'getWorld' in message:
            world_data = {
                'locations': {id: location.data for id, location in self.world.locations.items()},
                'entities': {id: entity.data for id, entity in self.world.entities.items()}
            }
            self.send(world=world_data)
            self.world.editors.append(self)
        if 'createRoom' in message:
            location = yield self.world.make_location(message['createRoom'])
            self.editor_broadcast(roomCreated=location.data)
        if 'createEntity' in message:
            data = message['createEntity']
            entity = yield self.world.make_entity(message['createEntity'])
            self.editor_broadcast(entityCreated=entity.data)
        if 'editRoom' in message:
            data = message['editRoom']
            print(data)
            location = self.world.locations.get(data['id'])
            if location is not None:
                location.data = data
                yield location.save()
                self.editor_broadcast(roomUpdated=location.data)
        if 'editEntity' in message:
            data = message['editEntity']
            entity = self.world.entities.get(data['id'])
            if entity is not None:
                entity.data = data
                yield entity.save()
                self.editor_broadcast(entityUpdated=entity.data)
        if 'moveRoom' in message:
            data = message['moveRoom']
            location = self.world.locations.get(data['id'])
            if location is not None:
                location.data['edit_x'] = data['edit_x']
                location.data['edit_y'] = data['edit_y']
                yield location.save()
                self.editor_broadcast(roomMoved=data)
        if 'moveEntity' in message:
            data = message['moveEntity']
            entity = self.world.entities.get(data['id'])
            if entity is not None:
                entity.data['edit_x'] = data['edit_x']
                entity.data['edit_y'] = data['edit_y']
                yield entity.save()
                self.editor_broadcast(entityMoved=data)
        if 'destroyRoom' in message:
            id = message['destroyRoom']
            location = self.world.locations.get(id)
            if location is not None:
                print("Destroying location {}".format(location.data['name']))
                del self.world.locations[location.id]
                location.destroy()
        if 'destroyEntity' in message:
            id = message['destroyEntity']
            entity = self.world.entities.get(id)
            if entity is not None:
                print("Destroying entity {}".format(entity.data['name']))
                del self.world.entities[id]
                entity.destroy()

        # player messages:
        if 'cmd' in message:
            cmd = message['cmd'].split()[0]
            cmd_arg = message['cmd'][len(cmd) + 1:].strip()
            print('cmd: "{}", cmd_arg: "{}"'.format(cmd, cmd_arg))
            yield self.player.on_cmd(cmd, cmd_arg)
        if 'chat' in message:
            if self.entity.location is not None:
                chat_msg = message['chat']
                if self.entity.location:
                    self.entity.location.send_chat(self.data['username'], chat_msg)
                else:
                    self.send("You seem to be nowhere.")

        # universal messages:
        if 'login_token' in message:
            yield self.login_with_token(message['login_token'])
        if 'guest' in message:
            yield self.login_as_guest()

    @coroutine
    def register(self, username, password, email):
        print("Registering {}".format(username))

        self.data['username'] = username
        salt = uuid4().hex
        hashed_password = sha512((salt + Client.sekrit + password).encode('utf8')).hexdigest()
        self.data['password'] = "{}:{}".format(salt, hashed_password)
        self.data['email'] = email
        self.data['entity_id'] = self.entity.id
        yield self.save()

        self.entity.data['name'] = self.data['username']
        if self.entity.data.get('aspects') and 'guest' in self.entity.data['aspets']:
            self.entity.data['aspects'].remove('guest')
        yield self.entity.save()

        token = yield self.create_token()
        self.send("Registered as {}".format(username), token=token)
        print(self.world.entities)

    @coroutine
    def login(self, username, password):
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
        self.entity = yield Entity(self.world, data={'name': self.data['username'], 'aspects': ['guest']}).save()
        yield self.world.locations[self.entity.data['location_id']].add_entity(self.entity)
        self.entity.client = self
        self.world.entities[self.entity.id] = self.entity
        self.send("Logged in as a guest. Hi {}.".format(self.data['username']))
        self.entity.location.send_event("{} has formed.".format(self.data['username']))
        self.post_login()

    @coroutine
    def login_success(self, data):
        self.data = data
        self.id = data['id']

        if self.entity is not None and 'guest' in self.entity.data['aspects']:
            self.entity.destroy()

        self.entity = self.world.entities[data['entity_id']]
        yield self.entity.save()

        if self.entity.client is not None:
            try:
                self.entity.client.ghosted = True
                self.entity.client.send("You have been replaced.", disconnect=True)
            except WebSocketClosedError:
                pass
        else:
            self.entity.location.send_event("{} woke up.".format(self.data['username']))

        print("{} logged in successfully.".format(self.data['username']))
        self.send("Logged in as {}".format(self.data['username']))
        self.post_login()

    def post_login(self):
        self.entity.client = self
        styles = sorted(os.listdir('../client/styles/'))
        self.send(styles=styles)
        self.player.send_location_description()

    @coroutine
    def create_token(self):
        token = uuid4().hex
        result = yield self.world.db.query('insert into tokens (token, player_id) values (%s, %s);', [token, self.id])
        result.free()
        return token

    def send(self, text=None, **kwargs):
        if text is not None:
            kwargs['output'] = [{'text': text}]
            if self.entity is not None and self.entity.location is not None:
                kwargs['contents'] = self.entity.location.contents()
        self.connection.send(kwargs)

    def editor_broadcast(self, **kwargs):
        for client in self.world.editors:
            try:
                client.send(**kwargs)
            except WebSocketClosedError:
                self.world.editors.remove(client)

    @coroutine
    def on_close(self):
        if self.entity is not None and self.entity.location is not None:
            if self.id is None:
                old_location = self.entity.location
                yield self.entity.destroy()
                old_location.send_event("{} was vapourized.".format(self.data['username']))
            else:
                if not self.ghosted:
                    self.entity.location.send_event("{} went to sleep.".format(self.data['username']))
