import traceback

from persisted import Persisted

from tornado.gen import coroutine


class Location(Persisted):
    table = "locations"

    def __init__(self, *args, **kwargs):
        super(Location, self).__init__(*args, **kwargs)

        if self.data.get('description') is None:
            self.data['description'] = "No description yet."

        self.data['exits'] = {}
        self.entities = []

    def __repr__(self):
        return 'Location: "{}"'.format(self.data['name'])

    @coroutine
    def load_exits(self):
        exit_rows = yield self.world.db.query('select * from exits where location_from = %s', [self.id])
        for row in exit_rows:
            self.data['exits'][row['name']] = row['location_to']
        exit_rows.free()

    @coroutine
    def add_entity(self, entity, save=True):
        if entity not in self.entities:
            self.entities.append(entity)
            entity.data['location_id'] = self.id
            if save:
                yield entity.save()
        entity.location = self
        self.send_contents()
        print("Added entity {} to {}".format(entity, self))

    def remove_entity(self, entity):
        if entity in self.entities:
            self.entities.remove(entity)
        else:
            print("Warning: removed entity {} from location it wasn't in: {}".format(entity, self))
        entity.location = None
        self.send_contents()
        print("Removed client {} from {}".format(entity, self))

    def contents(self):
        contents = [entity.contents_data() for entity in self.entities]
        return contents

    def send_contents(self):
        self.broadcast(output={'contents': self.contents()})

    def send_chat(self, username, text):
        self.broadcast(output={'text': text, 'user': username})

    def send_event(self, text):
        self.broadcast(output={'text': text})

    def broadcast(self, **kwargs):
        for entity in self.entities:
            print("broadcasting {} to {}".format(kwargs, entity.data['name']))
            try:
                entity.send(kwargs)
            except:
                print("Couldn't send to {}".format(entity))
                traceback.print_exc()

    @coroutine
    def save(self):
        exits = self.data.pop('exits')
        yield super(Location, self).save()
        for name, to_id in exits.items():
            try:
                results = yield self.world.db.query(
                    'insert into exits (location_from, location_to, name) select %s, %s, %s \
                        where not exists (select 1 from exits where location_from = %s and location_to = %s);',
                    [self.id, to_id, name, self.id, to_id]
                )
                results.free()
            except:
                print("Exit already exists?")
                traceback.print_exc()
        self.data['exits'] = exits
        return self

    def describe(self):
        exit_desc = "Exits: {}".format(", ".join(name for name, location_id in self.data['exits'].items()))
        return "{}\n{}".format(self.data['description'], exit_desc)
