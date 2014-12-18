class Location(object):
    def __init__(self, name):
        self.name = name
        self.entities = []

    def __repr__(self):
        return 'Location: "{}"'.format(self.name)
