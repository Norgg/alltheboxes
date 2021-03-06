from tornado.gen import coroutine


class Persisted(object):
    table = ""

    def __init__(self, world, data=None):
        if data is None:
            self.data = {}
        else:
            self.data = data

        self.world = world
        self.id = self.data.get('id')

    @coroutine
    def save(self):
        fields, values = zip(*self.data.items())
        if self.id is None:
            print("Creating {}".format(self.__class__.__name__))
            fieldstr = ','.join(fields)
            valstr = ','.join('%s' for _ in values)
            create_query = 'insert into {} ({}) values ({}) returning *'.format(self.__class__.table, fieldstr, valstr)
            result = yield self.world.db.query(create_query, values)
            self.data = result.as_dict()
            result.free()
            self.id = self.data.get('id')
            print("Created {} with id: {}".format(self.__class__.__name__, self.id))
            return self
        else:
            fieldstr = ','.join(['{} = %s'.format(field) for field in fields])
            update_query = 'update {} set {} where id = {}'.format(self.__class__.table, fieldstr, self.id)
            result = yield self.world.db.query(update_query, values)
            result.free()
            return self

    @coroutine
    def destroy(self):
        result = yield self.world.db.query('delete from {} where id = %s'.format(self.__class__.table), [self.id])
        result.free()

    def __getitem__(self, *args, **kwargs):
        return self.data.__getitem__(*args, **kwargs)

    def __setitem__(self, *args, **kwargs):
        return self.data.__setitem__(*args, **kwargs)
