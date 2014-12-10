from asyncio import get_event_loop

from server import Server


def main():
    world = None
    server = Server(world, 9876)

    loop = get_event_loop()
    loop.run_until_complete(server.listen())

    # def update():
    #      world.update()
    #      server.send_update()

    # update_task = PeriodicCallback(update, 1000)
    # update_task.start()
    try:
        loop.run_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
