from entity import Entity

from location import Location

from queries import OperationalError, TornadoSession

from tornado.gen import coroutine


class World(object):
    def __init__(self):
        self.entities = {}
        self.locations = {}
        self.db = TornadoSession('postgresql://alltheboxes:alltheboxes@localhost/alltheboxes')

    @coroutine
    def wipe(self):
        yield self.db.query(open('schema.sql').read())

    @coroutine
    def load(self):

        yield Location(self, {'name': 'start'}).save()
        yield Location(self, {'name': 'end'}).save()
        yield Entity(self, {'name': 'bob'}).save()

        try:
            yield self.db.validate()
        except OperationalError as error:
            print('Error connecting to the database: %s', error)
            raise Exception("What. :(")

        locations = yield self.db.query('select * from locations')
        for row in locations:
            self.locations[row['id']] = Location(self, row)

        entities = yield self.db.query('select * from entities')
        for row in entities:
            self.entities[row['id']] = Entity(self, row)

        print(self.locations)
        print(self.entities)

    def update(self):
        pass
