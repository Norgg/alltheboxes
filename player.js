var PlayerMethods = {
  chat: function(data) {
    var msg = '['+this.name+'] ' + data;

    this.socket.broadcast.to(this.room.name).emit('output', msg);
    this.socket.emit('output', msg);
    console.log(new Date().toUTCString() + " [" + this.name + "] " + data);
  },

  cmd: function(data) {
    var toks = data.split(' ');
    var command = toks[0];
    
    if (command == 'name') {
      this.setName(toks[1]);
    } else if (command == 'go') {
      this.join(toks[1]);
    } else if (command == 'desc') {
      this.describe(data.slice(5));
    } else if (command == 'look') {
      this.sendMessages(this.look());
    } else {
      this.sendMessages("Unknown command: " + command);
    }
    console.log(new Date().toUTCString() + " <" + this.name + "> " + data);
  },

  sendMessages: function(userMessage, roomMessage) {
    if (userMessage) this.socket.emit('output', userMessage);
    if (roomMessage) this.socket.broadcast.to(this.room.name).emit('output', roomMessage);
  },

  setName: function(name) {
  if (!name) return ['Change name to what?'];
    var oldNick = this.name;
    this.name = name;
    this.sendMessages('Hi ' + this.name, oldNick + ' is now ' + this.name);
  },

  join: function(roomName) {
    var self = this;
    if (!roomName) return ['Join where?'];
    if (this.room && roomName == this.room.name) return ['Already there.'];
    this.world.getRoom(roomName, function(err, room) {
      if (self.room) {
        self.socket.leave(self.room.name);
        self.socket.broadcast.to(self.room.name).emit('output', self.name + " went to " + room.name + ".");
      }
      self.room = room;
      self.socket.join(self.room.name);
      var msg = 'Entered ' + self.room.name + "\n" + self.look();
      self.sendMessages(msg, self.name + ' entered.');
    });
  },

  describe: function(desc) {
    this.room.description = desc;
    this.world.saveRoom(this.room);
    this.sendMessages("Description set", this.name + ' set the description');
  },

  look: function() {
    var players = [];
    this.io.sockets.clients(this.room.name).forEach(function(socket) {
      players.push(socket.player.name);
    });
    var msg = "";
    msg += this.room.description + "\n";
    msg += "Here: " + players.join(", ");
    return msg;
  }
};

var Player = function(socket, io, db, world) {
  var self = this;
  this.socket = socket;
  this.io = io;
  this.socket.player = this;
  this.db = db;
  this.world = world;

  this.name = 'anon' + Math.floor(Math.random()*1000);

  this.join('home');

  socket.on('chat', function (data) {
    self.chat(data);
  });

  socket.on('cmd', function(data) {
    self.cmd(data);
  });
};
Player.prototype = PlayerMethods;
exports.Player = Player;

