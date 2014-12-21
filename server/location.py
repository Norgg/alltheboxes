import traceback

from persisted import Persisted

from tornado.gen import coroutine


class Location(Persisted):
    table = "locations"

    def __init__(self, *args, **kwargs):
        super(Location, self).__init__(*args, **kwargs)
        self.data['description'] = "No description yet."
        self.data['exits'] = {}
        self.clients = []

    def __repr__(self):
        return 'Location: "{}"'.format(self.data['name'])

    @coroutine
    def load_exits(self):
        exit_rows = yield self.world.db.query('select * from exits where location_from = %s', [self.id])
        for row in exit_rows:
            self.data['exits'][row['name']] = row['location_to']

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

    @coroutine
    def save(self):
        exits = self.data.pop('exits')
        yield super(Location, self).save()
        for name, to_id in exits.items():
            try:
                yield self.world.db.query(
                    'insert into exits (location_from, location_to, name) select %s, %s, %s where not exists (select 1 from exits where location_from = %s and location_to = %s);',  # noqa
                    [self.id, to_id, name, self.id, to_id]
                )
            except:
                print("Exit already exists?")
                traceback.print_exc()
        self.data['exits'] = exits
        return self

    def describe(self):
        exit_desc = "Exits: {}".format(", ".join(name for name, location_id in self.data['exits'].items()))
        return "{}\n{}".format(self.data['description'], exit_desc)
