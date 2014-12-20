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

        entity_id = self.data.get('entity_id')
        if entity_id is not None:
            self.entity = self.world.entities[entity_id]

        if self.data.get('username') is None:
            self.data['username'] = randname(5 + int(random() * 3))
            self.send("Hi {}".format(self.data['username']))

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
            chat_msg = message['chat']
            if self.location is not None:
                for client in self.location.clients:
                    client.send(chat_msg)

    @coroutine
    def on_cmd(self, cmd, cmd_arg):
        print("on_cmd called.")
        if cmd == 'join':
            yield self.join(cmd_arg)
        elif cmd == 'register':
            yield self.register(cmd_arg)
        else:
            print("Command {} not recognised.".format(cmd))

    @coroutine
    def register(self, cmd_arg):
        args = cmd_arg.split()
        if len(args) < 2 or len(args) > 3:
            self.send("Usage /register username password [email]")

        if len(args) == 2:
            args.append(None)

        username, password, email = args

        print("Registering {}".format(username))

        self.entity = yield Entity(self.world, data={'name': username}).save()
        self.world.entities[self.entity.id] = self.entity

        self.data['username'] = username
        salt = uuid4().hex
        hashed_pass = str(sha512((salt + Client.sekrit + password).encode('utf8')))
        self.data['password'] = "{}:{}".format(salt, hashed_pass)
        self.data['email'] = email
        self.data['entity_id'] = self.entity.id
        yield self.save()
        self.send("Registered as {}".format(username))
        print(self.world.entities)

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
            self.send('joined {}'.format(new_location.data['name']))
        except Exception:
            print("Problem joining room:")
            traceback.print_exc()

    def send(self, output=None, **kwargs):
        if output is not None:
            kwargs.update({'output': output})
        self.connection.send(kwargs)
