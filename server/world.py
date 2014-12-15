from entity import Entity

from queries import OperationalError, TornadoSession

from room import Room

from tornado.gen import coroutine


class World(object):
    def __init__(self):
        self.entities = {}
        self.rooms = {}
        self.db = TornadoSession('postgresql://alltheboxes:alltheboxes@localhost/alltheboxes')

    @coroutine
    def wipe(self):
        yield self.db.query(open('schema.sql').read())

    @coroutine
    def load(self):

        yield self.db.query("insert into rooms (name) values ('start')")
        yield self.db.query("insert into rooms (name) values ('end')")
        yield self.db.query("insert into entities (name) values ('bob')")

        try:
            yield self.db.validate()
        except OperationalError as error:
            print('Error connecting to the database: %s', error)
            raise Exception("What. :(")

        rooms = yield self.db.query('select * from rooms')
        for row in rooms:
            self.rooms[row['name']] = Room(row['name'])

        entities = yield self.db.query('select * from entities')
        for row in entities:
            self.entities[row['name']] = Entity(row['name'])

        print(self.rooms)
        print(self.entities)

    def update(self):
        pass
