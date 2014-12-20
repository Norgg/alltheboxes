#!/usr/bin/env python
from server import Server

from tornado.gen import coroutine
from tornado.ioloop import IOLoop, PeriodicCallback

from world import World


@coroutine
def main():
    world = World()

    yield world.wipe()

    yield world.load()
    server = Server(world, 9876)
    server.listen()

    def update():
        world.update()
        server.send_update()

    update_task = PeriodicCallback(update, 1000)
    update_task.start()


if __name__ == "__main__":
    IOLoop.instance().add_callback(main)
    IOLoop.instance().start()
