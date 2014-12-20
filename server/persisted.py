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
            self.id = self.data.get('id')
            return self
        else:
            fieldstr = ','.join(['{} = %s'.format(field) for field in fields])
            update_query = 'update {} set {} where id = {}'.format(self.__class__.table, fieldstr, self.id)
            yield self.world.db.query(update_query, values)
            return self

    def __getitem__(self, *args, **kwargs):
        return self.data.__getitem__(*args, **kwargs)

    def __setitem__(self, *args, **kwargs):
        return self.data.__setitem__(*args, **kwargs)
