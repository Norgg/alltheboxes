from persisted import Persisted


class Location(Persisted):
    table = "locations"

    def __init__(self, *args, **kwargs):
        super(Location, self).__init__(*args, **kwargs)
        self.data['description'] = "No description yet."
        self.clients = []

    def __repr__(self):
        return 'Location: "{}"'.format(self.data['name'])

    def add_client(self, client):
        self.clients.append(client)
        client.location = self

    def remove_client(self, client):
        self.clients.remove(client)
        client.location = None

    def contents(self):
        contents = [{'name': client.data['username'] for client in self.clients}]
        print("Contents: {}".format(contents))
        return contents
