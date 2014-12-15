class Entity(object):
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return 'Entity: "{}"'.format(self.name)
