from tornado.gen import coroutine


class Client(object):
    def __init__(self, connection):
        self.connection = connection
        self.world = connection.application.server.world

    @coroutine
    def on_message(self, message):
        print("Client message: {}".format(message))
        # self.connection.send({'output': 'yep'})

        # editor messages:
        if 'getWorld' in message:
            world_data = {'world': {id: location.data for id, location in self.world.locations.items()}}
            print(world_data)
            yield self.connection.send(world_data)
        if 'createRoom' in message:
            location = yield self.world.make_location(message['createRoom'])
            yield self.connection.send({'roomCreated': location.data})

        # client messages:
