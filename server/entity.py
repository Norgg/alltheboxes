from persisted import Persisted

from tornado.gen import coroutine


class Entity(Persisted):
    table = "entities"

    @coroutine
    def save(self, *args, **kwargs):
        yield super(Entity, self).save(*args, **kwargs)
        if self.data['location_id'] is None:
            self.data['location_id'] = self.world.start_location.id
            print("Put entity in start location")
            yield self.save()
        return self

    def __repr__(self):
        return 'Entity: "{}"'.format(self.data['name'])
