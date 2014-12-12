import json

from client import Client

from editor import Editor

from tornado.httpserver import HTTPServer
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.websocket import WebSocketHandler


class Index(RequestHandler):
    def get(self):
        with open('../client/index.html') as index:
            self.write(index.read())


class ClientConnection(WebSocketHandler):
    def open(self):
        print("New connection.")
        self.application.server.clients.append(self)
        self.client = Client(self)
        self.editor = Editor(self)

    def on_message(self, message):
        try:
            data = json.loads(message)
        except ValueError:
            print("nope")
        else:
            self.client.on_message(data)

    def on_close(self):
        self.application.server.clients.remove(self)


class Server(object):
    def __init__(self, world, port):
        self.application = Application([
            (r'/', Index),
            (r'/ws', ClientConnection),
            (r'/(.*)', StaticFileHandler, {'path': '../client/'}),
        ], debug=True)
        self.application.server = self

        self.world = world
        self.port = port
        self.http_server = HTTPServer(self.application)
        self.clients = []

    def listen(self):
        self.http_server.listen(self.port)

    def send_update(self):
        pass
