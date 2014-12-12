from server import Server

from tornado.ioloop import IOLoop, PeriodicCallback


def main():
    world = None
    server = Server(world, 9876)
    server.listen()

    def update():
        # world.update()
        server.send_update()

    update_task = PeriodicCallback(update, 1000)
    update_task.start()

    IOLoop.instance().start()


if __name__ == "__main__":
    main()
