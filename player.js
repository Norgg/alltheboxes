var PlayerMethods = {
  commands: { 
    help: {
      desc: "Get help.",
      func: function(data) { this.help(); }
    },
    name: {
      desc: "Set name.",
      func: function(data) { this.setName(data); }
    },
    go: {
      desc: "Teleport to a location.",
      func: function(data) { this.join(data); }
    },
    desc: {
      desc: "Set the desciption for this location.",
      func: function(data) { this.describe(data); }
    },
    look: {
      desc: "Look around.",
      func: function(data) { this.look(); }
    },
    make: {
      desc: "Create an object.",
      func: function(data) { this.createItem(data); }
    },
    destroy: {
      desc: "Destroy an object.",
      func: function(data) { this.destroyItem(data); }
    }
  },

  chat: function(data) {
    var msg = '['+this.name+'] ' + data;

    this.socket.broadcast.to(this.room.name).emit('output', msg);
    this.socket.emit('output', msg);
    console.log(new Date().toUTCString() + " [" + this.name + "] " + data);
  },

  cmd: function(data) {
    var toks = data.split(' ');
    var commandName = toks[0];
    var remaining = data.slice(commandName.length+1);

    var command = this.commands[commandName];
    
    if (command) {
      command.func.call(this, remaining);
    } else {
      this.sendMessages("Unknown command: " + commandName);
    }
    console.log(new Date().toUTCString() + " <" + this.name + "> " + data);
  },

  sendMessages: function(userMessage, roomMessage) {
    if (userMessage) this.socket.emit('output', userMessage);
    if (roomMessage && this.room) this.socket.broadcast.to(this.room.name).emit('output', roomMessage);
  },

  setName: function(name) {
    if (!name) this.sendMessage('Change name to what?');
    var oldNick = this.name;
    this.name = name;
    this.sendMessages('Hi ' + this.name, oldNick + ' is now ' + this.name + ".");
    this.socket.emit('name', name);
    this.updateContents(true);
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
      var msg = 'Entered ' + self.room.name + ".\n" + self.look();
      self.sendMessages(msg, self.name + ' entered.');
      self.socket.emit('room', roomName);
      self.updateContents(true);
    });
  },

  describe: function(desc) {
    this.room.description = desc;
    this.world.saveRoom(this.room);
    this.sendMessages("Description set", this.name + ' set the description');
  },

  createItem: function(itemName) {
    this.room.createItem(itemName);
    this.saveAndUpdateRoom();
  },

  destroyItem: function(itemName) {
    this.room.destroyItem(itemName);
    this.saveAndUpdateRoom();
  },

  disconnect: function() {
    this.sendMessages(null, this.name + ' exploded.');
    this.updateContents(false);
  },

  saveAndUpdateRoom: function() {
    var self = this;
    this.world.saveRoom(this.room, function(err, room) {
      if (err) {
        console.log(err);
      } else {
        self.updateContents(true);
      }
    });
  },
  
  //TODO: This should probably be a method on rooms.
  updateContents: function(includeSelf) {
    var self=this;
    if (!this.room) return;
    var contents = [];
    this.io.sockets.clients(this.room.name).forEach(function(socket) {
      if (includeSelf || socket != self.socket) {
        contents.push("@"+socket.player.name);
      }
    });

    this.room.contents.forEach(function(entity) {
      contents.push(entity.name);
    });

    if (includeSelf) this.socket.emit('contents', contents);
    this.socket.broadcast.to(this.room.name).emit('contents', contents);
  },

  look: function() {
    if (!this.room) return "You don't seem to be anywhere...";
    var msg = this.room.description;
    return msg;
  },
  
  help: function() {
    var msg = "";
    for (cmd in this.commands) {
      msg += cmd + ": " + this.commands[cmd].desc + "\n";
    }
    this.sendMessages(msg);
  },
};

var Player = function(socket, io, db, world) {
  var self = this;
  this.socket = socket;
  this.io = io;
  this.socket.player = this;
  this.db = db;
  this.world = world;

  this.name = 'anon' + Math.floor(Math.random()*1000);

  //this.join('home');

  socket.on('chat', function (data) { self.chat(data); });
  socket.on('cmd', function(data) { self.cmd(data); });
  socket.on('disconnect', function() { self.disconnect(); });

};
Player.prototype = PlayerMethods;
exports.Player = Player;

