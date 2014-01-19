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
      desc: "Go through an exit.",
      func: function(data) { this.go(data); }
    },
    join: {
      desc: "Teleport to a place.",
      func: function(data) { this.join(data); }
    },
    desc: {
      desc: "Describe this place.",
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

    this.sendMessages(msg, msg);
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
    console.log(new Date().toUTCString() + " [" + this.name + "] /" + data);
  },

  sendMessages: function(userMessage, roomMessage, extra) {
    var data = extra || {};
    data.text = userMessage;
    //console.log(data.text);
    if (userMessage || extra) this.socket.emit('output', data);
    data.text = roomMessage;
    if ((roomMessage || extra) && this.room) this.socket.broadcast.to(this.room.name).emit('output', data);
  },

  setName: function(name) {
    if (!name) this.sendMessage('Change name to what?');
    var oldNick = this.name;
    this.name = name;
    this.sendMessages('Hi ' + this.name, oldNick + ' is now ' + this.name + ".", {contents: this.getContents(true)});
    this.socket.emit('name', name);
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
      var msg = 'Entered ' + self.room.name + ".\n" + self.room.describe();
      self.sendMessages(msg, self.name + ' entered.', {contents: self.getContents(true)});
      self.socket.emit('room', roomName);
    });
  },

  go: function(exit) {
    if (this.room.exits[exit]) {
      this.join(this.room.exits[exit]);
    } else {
      this.sendMessages("Couldn't go " + exit);
    }
  },

  describe: function(desc) {
    this.room.description = desc;
    this.world.saveRoom(this.room);
    this.sendMessages("Description set", this.name + ' set the description');
  },

  createItem: function(itemName) {
    this.room.createItem(itemName);
    this.sendMessages(itemName + " created.", this.name + " created " + itemName, {contents: this.getContents(true)});
  },

  destroyItem: function(itemName) {
    if (this.room.destroyItem(itemName)) {
      this.sendMessages(itemName + " destroyed.", this.name + " destroyed " + itemName, {contents: this.getContents(true)});
      this.saveRoom();
    } else {
      this.sendMessages("There's no " + itemName + " here.");
    }
  },

  disconnect: function() {
    this.sendMessages(null, this.name + ' evaporated.', {contents: this.getContents(false)});
    if (this.room) this.saveRoom();
  },

  saveRoom: function() {
    var self = this;
    this.world.saveRoom(this.room, function(err, room) {
      if (err) {
        console.log(err);
      }
    });
  },
  
  //TODO: This should probably be a method on rooms.
  getContents: function(includeSelf) {
    var self=this;
    if (!this.room) return;
    var contents = [];
    this.io.sockets.clients(this.room.name).forEach(function(socket) {
      if (includeSelf || socket != self.socket) {
        contents.push({name: "@"+socket.player.name});
      }
    });

    this.room.contents.forEach(function(entity) {
      contents.push(entity);
    });

    return contents;
  },

  look: function() {
    if (!this.room) return "You don't seem to be anywhere...";
    this.sendMessages(this.room.describe());
  },
  
  help: function() {
    var msg = "";
    for (cmd in this.commands) {
      msg += cmd + ": " + this.commands[cmd].desc + "\n";
    }
    this.sendMessages(msg);
  },

  /******* Editor functions, TODO: Move these elsewhere. *******/
  sendWorld: function() {
    console.log("Sending world.");
    this.socket.emit("world", this.world.rooms);
  },

  editRoom: function(room) {
    console.log(room);
    Room.load(room);
    this.world.rooms[room._id] = room;
    this.world.saveRoom(room);
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

  socket.on('chat', function (data) { self.chat(data); });
  socket.on('cmd', function(data) { self.cmd(data); });
  socket.on('disconnect', function() { self.disconnect(); });

  socket.on('getWorld', function() { self.sendWorld(); });
  socket.on('editRoom', function(data) { self.editRoom(data); });
};
Player.prototype = PlayerMethods;
exports.Player = Player;

