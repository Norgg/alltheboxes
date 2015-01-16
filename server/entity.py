from random import random

from persisted import Persisted

from randname import randname

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
        if self.data.get('location_id') is None:
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
        del self.world.entities[self.id]
        yield super(Entity, self).destroy()

    @coroutine
    def update(self):
        if self.data.get('aspects') is not None:
            if 'guest' in self.data['aspects']:
                if self.client is None or self.client.connection.stream.closed():
                    print("Destroying disconnected guest {}.".format(self.data['name']))
                    yield self.destroy()

            if 'npc' in self.data['aspects']:
                if (random() < 0.1):
                    sentence = " ".join([randname(int(4 + 4 * random())) for i in range(int(4 + 5 * random()))])
                    sentence = sentence.capitalize() + "."
                    self.location.send_chat(self.data['name'], sentence)

    def __repr__(self):
        return 'Entity: "{}"'.format(self.data['name'])
