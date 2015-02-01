import traceback

from entity import Entity

from location import Location

import psycopg2
from psycopg2.extras import register_hstore

from queries import OperationalError, TornadoSession

from tornado.gen import coroutine


class World(object):
    def __init__(self):
        self.entities = {}
        self.locations = {}
        self.editors = []
        db_url = 'postgresql://alltheboxes:alltheboxes@localhost/alltheboxes'
        self.db = TornadoSession(db_url, pool_max_size=6000)

        tmp_conn = psycopg2.connect(db_url)
        register_hstore(tmp_conn, globally=True)
        tmp_conn.close()

        print("Created world.")

    @coroutine
    def wipe(self):
        result = yield self.db.query(open('schema.sql').read())
        result.free()
        start = yield Location(self, {'name': 'start'}).save()
        self.start_location = start
        self.locations[start.id] = start
        yield Entity(self, {'name': 'Twiglet', 'aspects': ['npc']}).save()
        print("World wiped")

    @coroutine
    def load(self):
        try:
            yield self.db.validate()
        except OperationalError as error:
            print('Error connecting to the database: %s', error)

        try:
            locations = yield self.db.query('select * from locations order by id limit 1;')
        except psycopg2.ProgrammingError:
            print('Initialising database.')
            yield self.wipe()

        try:
            locations = yield self.db.query('select * from locations order by id;')
            print(locations)

            first = True
            for row in locations:
                print(row)
                location = Location(self, row)
                self.locations[location.id] = location

                if first:
                    print("Start location set.")
                    first = False
                    self.start_location = location
        finally:
            locations.free()

        for id, location in self.locations.items():
            yield location.load_exits()

        try:
            entities = yield self.db.query('select * from entities')
            for row in entities:
                self.entities[row['id']] = Entity(self, row)
        finally:
            entities.free()

        print(self.locations)
        print(self.entities)

    @coroutine
    def make_location(self, name):
        location = yield Location(self, {'name': name}).save()
        self.locations[location.id] = location
        return location

    @coroutine
    def make_entity(self, name):
        entity = yield Entity(self, {'name': name}).save()
        self.entities[entity.id] = entity
        return entity

    @coroutine
    def update(self):
        for id, entity in list(self.entities.items()):
            try:
                yield entity.update()
            except Exception:
                traceback.print_exc()
