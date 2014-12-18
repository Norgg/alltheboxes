class Client(object):
    def __init__(self, connection):
        self.connection = connection

    def on_message(self, message):
        self.connection.send({'output': 'yep'})
        print("Client message: {}".format(message))
