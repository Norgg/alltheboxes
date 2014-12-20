from persisted import Persisted

from tornado.gen import coroutine


class Location(Persisted):
    table = "locations"

    def __init__(self, *args, **kwargs):
        super(Location, self).__init__(*args, **kwargs)
        self.data['description'] = "No description yet."
        self.clients = []

    def __repr__(self):
        return 'Location: "{}"'.format(self.data['name'])

    @coroutine
    def add_client(self, client):
        self.clients.append(client)
        client.entity.data['location_id'] = self.id
        yield client.entity.save()
        client.location = self
        print("Added client {} to {}".format(client, self))

    def remove_client(self, client):
        self.clients.remove(client)
        client.location = None
        print("Removed client {} from {}".format(client, self))

    def contents(self):
        contents = [{'name': client.data['username']} for client in self.clients]
        return contents
