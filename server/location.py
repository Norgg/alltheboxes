from persisted import Persisted


class Location(Persisted):
    table = "locations"

    def __repr__(self):
        return 'Location: "{}"'.format(self.data['name'])
