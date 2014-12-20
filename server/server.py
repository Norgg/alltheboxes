import json
import traceback
from datetime import datetime

from client import Client

from editor import Editor

from tornado.gen import coroutine
from tornado.httpserver import HTTPServer
from tornado.web import Application, RequestHandler, StaticFileHandler
from tornado.websocket import WebSocketHandler


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    if isinstance(obj, datetime):
        serial = obj.isoformat()
        return serial


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

    @coroutine
    def on_message(self, message):
        try:
            data = json.loads(message)
            yield self.client.on_message(data)
        except Exception:
            traceback.print_exc()

    def send(self, obj):
        self.write_message(json.dumps(obj, default=json_serial))

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
        print("Listening on {}".format(self.port))

    def send_update(self):
        pass
