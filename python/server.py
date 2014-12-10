# import json

import asyncio

import aiohttp
from aiohttp import websocket, web

import os

# from client import Client
#
# from editor import Editor


@asyncio.coroutine
def index(request):
    with open('../js/client/index.html') as index:
        return web.Response(request, bytes(index.read(), encoding="utf-8"))


class WebsocketRequestHandler(aiohttp.server.ServerHttpProtocol):
    clients = []  # list of all active connections

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @asyncio.coroutine
    def handle_request(self, message, payload):
        upgrade = 'websocket' in message.headers.get('UPGRADE', '').lower()

        if upgrade:
            self.transport = message.transport
            # websocket handshake
            status, headers, parser, writer, protocol = websocket.do_handshake(
                message.method, message.headers, message.transport)
            resp = aiohttp.Response(message._writer, status, http_version=message.version)
            resp.add_headers(*headers)
            resp.send_headers()

            # install websocket parser
            print(message.__dict__)
            dataqueue = message._payload.set_parser(parser)

            # notify everybody
            print('{}: Someone joined.'.format(os.getpid()))
            for wsc in self.clients:
                wsc.send(b'Someone joined.')
            self.clients.append(writer)

            # chat dispatcher
            while True:
                try:
                    msg = yield from dataqueue.read()
                    print(msg)
                    print(dataqueue._buffer)
                except:
                    # client dropped connection
                    break

                if msg.tp == websocket.MSG_PING:
                    writer.pong()

                elif msg.tp == websocket.MSG_TEXT:
                    data = msg.data.strip()
                    print('{}: {}'.format(os.getpid(), data))
                    for wsc in self.clients:
                        if wsc is not writer:
                            wsc.send(data.encode())

                elif msg.tp == websocket.MSG_CLOSE:
                    break

            # notify everybody
            print('{}: Someone disconnected.'.format(os.getpid()))
            self.clients.remove(writer)
            for wsc in self.clients:
                wsc.send(b'Someone disconnected.')

# class ClientConnection(WebSocketHandler):
#     def open(self):
#         self.app.server.clients.append(self)
#         self.client = Client(self)
#         self.editor = Editor(self)
#
#     def on_message(self, message):
#         data = json.loads(message)
#         self.client.on_message(data)
#
#     def on_close(self):
#         self.app.server.clients.remove(self)


class Server(object):
    def __init__(self, world, port):
        self.app = web.Application()
        self.app.router.add_route('GET', r'/', index)
        self.app.router.add_route('GET', r'/ws', lambda request: WebsocketRequestHandler().handle_request(request, None))
        self.app.router.add_static(r'/', '../js/client')

        self.app.server = self

        self.world = world
        self.port = port
        self.clients = []

    def listen(self):
        return asyncio.get_event_loop().create_server(self.app.make_handler, '0.0.0.0', self.port)

    def send_update(self):
        pass
