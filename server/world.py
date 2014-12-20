from entity import Entity

from location import Location

from queries import OperationalError, TornadoSession

from tornado.gen import coroutine


class World(object):
    def __init__(self):
        self.entities = {}
        self.locations = {}
        self.editors = []
        self.db = TornadoSession('postgresql://alltheboxes:alltheboxes@localhost/alltheboxes')
        print("Created world.")

    @coroutine
    def wipe(self):
        yield self.db.query(open('schema.sql').read())

    @coroutine
    def gen_test_data(self):
        yield Location(self, {'name': 'start'}).save()
        yield Location(self, {'name': 'end'}).save()
        yield Entity(self, {'name': 'bob'}).save()

    @coroutine
    def load(self):
        yield self.gen_test_data()

        try:
            yield self.db.validate()
        except OperationalError as error:
            print('Error connecting to the database: %s', error)

        locations = yield self.db.query('select * from locations')
        for row in locations:
            location = Location(self, row)
            self.locations[location.id] = location

        for id, location in self.locations.items():
            yield location.load_exits()

        entities = yield self.db.query('select * from entities')
        for row in entities:
            self.entities[row['id']] = Entity(self, row)

        print(self.locations)
        print(self.entities)

    @coroutine
    def make_location(self, name):
        location = yield Location(self, {'name': name}).save()
        self.locations[location.id] = location
        return location

    def update(self):
        pass
