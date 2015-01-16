from inspect import getdoc

from tornado.gen import coroutine


class Player(object):
    commands = ['help', 'go', 'register', 'login', 'look', 'me']

    def __init__(self, client):
        self.client = client

    @coroutine
    def on_cmd(self, cmd, cmd_arg):
        if cmd in Player.commands and hasattr(self, cmd):
            yield getattr(self, cmd)(cmd_arg)
        elif self.client.entity.location is not None and cmd in self.client.entity.location.data['exits']:
            self.go(cmd)
        else:
            print("Command {} not recognised.".format(cmd))

    @coroutine
    def help(self, cmd_arg):
        """
        /help [command]
        Display this help text.
        """
        if cmd_arg is "":
            for command in self.commands:
                if command in Player.commands and hasattr(self, command):
                    docs = getdoc(getattr(self, command))
                    head = docs.splitlines()[0]
                    rest = "\n".join(docs.splitlines()[1:])
                    self.client.send(output=[
                        {'tags': ['help header'], 'text': head},
                        {'tags': ['help text'], 'text': rest}
                    ])
        else:
            command = cmd_arg.strip()
            if command in self.commands and hasattr(self, command):
                docs = getdoc(getattr(self, command))
                head = docs.splitlines()[0]
                rest = "\n".join(docs.splitlines()[1:])
                self.client.send(output=[
                    {'tags': ['help header'], 'text': head},
                    {'tags': ['help text'], 'text': rest}
                ])
            else:
                self.client.send("Command {} not found.".format(command))

    @coroutine
    def register(self, cmd_arg):
        """
        /register username, password
        Create a new account with the provided username and password.  Your progress as a guest will be saved.
        """
        args = cmd_arg.split()
        if len(args) != 2:
            self.client.send("Usage: /register username password")

        if len(args) == 2:
            args.append(None)

        # Email currently unused.
        username, password, email = args

        yield self.client.register(username, password, email)

    @coroutine
    def login(self, cmd_arg):
        """
        /login username password
        Log in to an existing account.  If you are using a guest account you will lose access to it.
        """
        args = cmd_arg.split()
        if(len(args) != 2):
            self.client.send("Usage: /login username password")

        username, password = cmd_arg.split()
        yield self.client.login(username, password)

    @coroutine
    def go(self, exit):
        """
        /go direction
        Go through an exit in a direction
        """
        old_location = self.client.entity.location

        new_location_id = old_location.data['exits'].get(exit)
        if new_location_id is None:
            self.client.send("Couldn't find exit {}".format(exit))
        else:
            old_location.remove_entity(self.client.entity)
            yield old_location.save()
            new_location = self.client.world.locations.get(new_location_id)
            print("{} going {} to {}".format(self.client.data['username'], exit, new_location.data['name']))
            yield new_location.add_entity(self.client.entity)
            yield new_location.save()
            self.send_location_description()
            self.client.send_event("{} entered.".format(self.client.data['username']))

    @coroutine
    def look(self, cmd_arg):
        """
        /look [at]
        Look around you [or at a thing].
        """
        if self.client.entity.location is not None:
            if cmd_arg is "":
                self.send_location_description()
            else:
                for entity in self.client.entity.location.entities:
                    if entity.data['name'].startswith(cmd_arg):
                        desc = entity.data['description']
                        print(desc)
                        self.client.send(output=[{'text': desc, 'tags': ['description']}])
                        break

    def emote(self, cmd_arg):
        """
        /me [action]
        Describe doing a thing.
        """
        self.entity.location.broadcast(output=[
            {'tags': ['actionuser'], 'text': self.data['username']},
            {'tags': ['action'], 'text': " {}".format(cmd_arg)}
        ])

    def send_location_description(self):
        self.client.send(output=[{'tags': ['header'], 'text': self.client.entity.location.data['name']},
                                 {'text': self.client.entity.location.describe()}],
                         contents=self.client.entity.location.contents())
