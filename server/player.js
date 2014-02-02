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
    var msg = data;

    this.sendMessages(msg, msg, {user: this.name});
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
    var room = this.world.getRoom(roomName);

    if (room) {
      var oldRoom = self.room;
      if (oldRoom) {
        self.socket.leave(oldRoom.name);
        self.sendMessages(null, null, {contents: self.getContents(false)});
      }
      self.room = room;
      self.socket.join(self.room.name);
      var msg = 'Entered ' + self.room.name + ".\n" + self.room.describe();
      self.sendMessages(msg, self.name + ' entered.', {contents: self.getContents(true)});
      self.socket.emit('room', roomName);
    } else {
      self.sendMessages("No such room: " + roomName);
    }
  },

  go: function(exit) {
    this.refreshRoom();
    if (this.room && this.room.exits[exit]) {
      this.sendMessages(null, this.name + " went " + exit + ".");
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
    if (!itemName) {
      this.sendMessages("Make what?");
      return;
    }
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
    this.refreshRoom();
    this.sendMessages(this.room.describe());
  },

  refreshRoom: function() {
    if (this.room) this.room = this.world.rooms[this.room._id];
  },
  
  help: function() {
    var msg = "";
    for (cmd in this.commands) {
      msg += cmd + ": " + this.commands[cmd].desc + "\n";
    }
    this.sendMessages(msg);
  },

  /******* Editor functions, TODO: Move these elsewhere. Seriously. *******/
  sendWorld: function() {
    console.log("Editor joined.");
    this.socket.join("_editor");
    this.socket.emit("world", this.world.rooms);
  },

  editRoom: function(room) {
    console.log(room);
    Room.load(room);
    this.world.rooms[room._id] = room;
    this.world.saveRoom(room);
    this.socket.emit("roomSaved", room._id)
    this.socket.broadcast.to('_editor').emit('roomUpdated', room);
  },

  moveRoom: function(roomData) {
    var room = this.world.rooms[roomData._id];
    room.editX = roomData.editX;
    room.editY = roomData.editY;
    this.world.saveRoom(room);
    this.socket.broadcast.to('_editor').emit('roomMoved', room);
  },

  destroyRoom: function(roomId) {
    var self = this;
    this.world.destroyRoom(roomId, function() {
      self.socket.emit("roomDestroyed", roomId)
      self.socket.broadcast.to('_editor').emit('roomDestroyed', roomId);
    });
  },

  createRoom: function(roomName) {
    var self = this;
    if (!roomName) return;
    this.world.createRoom(roomName, function(err, room) {
      if (err) {
        //TODO: Send error message to editor, especially for duplicate name.
        console.log(err);
      } else {
        self.socket.emit("roomCreated", room);
        self.socket.broadcast.to('_editor').emit('roomCreated', room);
        
        room.editX = 200;
        room.editY = 200;
        self.socket.emit("roomMoved", room);
        self.socket.broadcast.to('_editor').emit('roomMoved', room);
      }
    });
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

  socket.on('chat',        function (data) { self.chat(data); });
  socket.on('cmd',         function(data) { self.cmd(data); });
  socket.on('disconnect',  function() { self.disconnect(); });

  socket.on('getWorld',    function() { self.sendWorld(); });
  socket.on('editRoom',    function(data) { self.editRoom(data); });
  socket.on('moveRoom',    function(data) { self.moveRoom(data); });
  socket.on('destroyRoom', function(data) { self.destroyRoom(data); });
  socket.on('createRoom',  function(data) { self.createRoom(data); });
};
Player.prototype = PlayerMethods;
exports.Player = Player;

