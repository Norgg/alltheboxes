import traceback

from tornado.gen import coroutine


class Client(object):
    def __init__(self, connection):
        self.connection = connection
        self.world = connection.application.server.world
        self.location = None

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
            print("joining {}".format(cmd_arg))
            old_location = self.location
            if old_location is not None:
                old_location.remove_client(self)
                yield old_location.save()

            try:
                new_location = self.world.locations.get(int(cmd_arg))
                new_location.add_client(self)
                yield new_location.save()
                self.send('joined {}'.format(new_location.data['name']))
            except Exception:
                print("Problem joining room:")
                traceback.print_exc()
        else:
            print("Command {} not recognised.".format(cmd))

    def send(self, output=None, **kwargs):
        if output is not None:
            kwargs.update({'output': output})
        self.connection.send(kwargs)
