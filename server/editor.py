class Editor(object):
    def __init__(self, connection):
        self.connection = connection

    def on_message(self, message):
        print("Editor message: {}".format(message))
