from persisted import Persisted


class Entity(Persisted):
    table = "entities"

    def __repr__(self):
        return 'Entity: "{}"'.format(self.data['name'])
