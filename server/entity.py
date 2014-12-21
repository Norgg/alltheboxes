from persisted import Persisted

from tornado.gen import coroutine


class Entity(Persisted):
    table = "entities"

    def __init__(self, *args, **kwargs):
        self.location = None
        self.client = None
        super(Entity, self).__init__(*args, **kwargs)
        self.data['description'] = "No description yet."

        if self.data.get('location_id') is not None:
            self.world.locations[self.data['location_id']].add_entity(self, save=False)

    @coroutine
    def save(self, *args, **kwargs):
        yield super(Entity, self).save(*args, **kwargs)
        if self.data['location_id'] is None:
            self.data['location_id'] = self.world.start_location.id
            print("Put entity in start location")
            yield self.save()
            self.world.locations[self.data['location_id']].add_entity(self)
        return self

    def contents_data(self):
        return {'name': self.data['name'], 'description': self.data['description']}

    def send(self, *args, **kwargs):
        if self.client is not None:
            self.client.connection.send(*args, **kwargs)

    @coroutine
    def destroy(self):
        if self.location is not None:
            self.location.remove_entity(self)
        yield super(Entity, self).destroy()

    def __repr__(self):
        return 'Entity: "{}"'.format(self.data['name'])
