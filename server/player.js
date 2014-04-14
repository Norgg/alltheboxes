var Entity = require('./entity').Entity;

var PlayerMethods = {
  commands: { 
    help: {
      desc: "Get help.",
      func: function(data) { this.help(); },
      level: "all"
    },
    name: {
      desc: "Set name.",
      func: function(data) { this.setName(data); },
      level: "all",
    },
    go: {
      desc: "Go through an exit.",
      func: function(data) { this.go(data); },
      level: "all",
    },
    join: {
      desc: "Teleport to a place.",
      func: function(data) { this.join(data); },
      level: "all",
    },
    desc: {
      desc: "Describe this place.",
      func: function(data) { this.describe(data); },
      level: "admin",
    },
    descitem: {
      desc: "Describe an item here.",
      func: function(data) { this.describeItem(data); },
      level: "admin",
    },
    look: {
      desc: "Look around.",
      func: function(data) { this.look(data); },
      level: "all",
    },
    make: {
      desc: "Create an object.",
      func: function(data) { this.createItem(data); },
      level: "all",
    },
    destroy: {
      desc: "Destroy an object.",
      func: function(data) { this.removeItem(data); },
      level: "admin",
    },
    auth: {
      desc: "Become good.",
      func: function(data) { this.auth(data); },
      level: "all",
    }
  },

  chat: function(data) {
    var msg = data;

    this.sendMessages(msg, msg, {user: this.entity.name});
    console.log(new Date().toUTCString() + " [" + this.entity.name + "] " + data);
  },

  cmd: function(data) {
    var toks = data.split(' ');
    var commandName = toks[0];
    var remaining = data.slice(commandName.length+1);

    var command = this.commands[commandName];
    
    if (command) {
      if (command.level == "all" || this.admin) {
        command.func.call(this, remaining);
      } else {
        this.sendMessages("No, bad.");
      }
    } else {
      this.sendMessages("Unknown command: " + commandName);
    }
    console.log(new Date().toUTCString() + " [" + this.entity.name + "] /" + data);
  },

  sendMessages: function(userMessage, roomMessage, extra, roomExtra) {
    var data = extra || {};
    data.text = userMessage;
    //console.log(data.text);
    if (userMessage || extra) this.socket.emit('output', data);
    
    if (!roomExtra) roomExtra = extra;
    var data = roomExtra || {};
    data.text = roomMessage;
    if ((roomMessage || roomExtra) && this.room) this.socket.broadcast.to(this.room._id).emit('output', data);
  },

  setName: function(name) {
    if (!name) this.sendMessage('Change name to what?');
    var oldNick = this.entity.name;
    this.entity.name = name;
    this.entity.save();
    this.sendMessages('Hi ' + this.entity.name, oldNick + ' is now ' + this.entity.name + ".", {contents: this.getContents(true)});
    this.socket.emit('name', name);
  },

  join: function(roomId) {
    console.log("joining: " + roomId);
    var self = this;
    //if (!roomId) return ['Join where?'];
    if (this.room && roomId == this.room._id) return ['Already there.'];
    var room = Room.all[roomId];

    if (room) {
      var oldRoom = self.room;
      if (oldRoom) {
        self.socket.leave(oldRoom._id);
        self.room.removeItem(self.entity.name);
        self.sendMessages(null, null, null, {contents: self.getContents(false)});
      }
      self.room = room;
      self.room.addItem(self.entity, function(err, item) {
        if (err) {
          console.log(err);
        } else {
          self.socket.join(self.room._id);
          self.sendMessages(self.room.describe(), self.entity.name + ' entered.', {joined: self.room.name, contents: self.getContents(true)}, {contents: self.getContents(true)});
          self.socket.emit('room', roomId);
          self.entity.roomid = room._id;
          self.entity.save();
        }
      });
    } else {
      self.sendMessages("Help, no such room: " + roomId);
      if (!self.room) {
        self.sendMessages("You are not anywhere, sending you home.");
        self.world.getHome(function(err, home) {
          if (err) {
            console.log(err);
          } else {
            if (!home) {
              console.log("Oh no, there's no Home location, making one.");
              self.createRoom("Home", function(home){ 
                self.join(home._id);
                self.saveRoom();
              });
            } else { 
              self.join(home._id);
            }
          }
        });

      }
    }
  },

  go: function(exit) {
    this.refreshRoom();
    if (this.room && this.room.exits[exit]) {
      this.sendMessages(null, this.entity.name + " went " + exit + ".");
      this.join(this.room.exits[exit]);
    } else {
      this.sendMessages("Couldn't go " + exit);
    }
  },

  describe: function(desc) {
    this.room.description = desc;
    this.room.save();
    this.sendMessages("Description set", this.entity.name + ' set the description');
  },
  
  describeItem: function(desc) {
    for (i in this.room.contents) {
      var item = this.room.contents[i];
      var idx = desc.indexOf(item.name+" ");
      if (idx == 0) {
        item.description = desc.slice(item.name.length+1);
        item.save();
        this.sendMessages(item.name + " description set", this.entity.name + " described " + item.name);
        return;
      }
    }
    this.sendMessages("Couldn't find item to describe for: " + desc);
  },

  createItem: function(itemName) {
    var self = this;
    
    self.refreshRoom();
    if (!itemName) {
      this.sendMessages("Make what?");
      return;
    }
    this.room.createItem(itemName, this.world.entitiesDB, function() {
      console.log(self.getContents(true));
      self.sendMessages(itemName + " created.", self.entity.name + " created " + itemName, {contents: self.getContents(true)});
    });
  },

  removeItem: function(itemName) {
    if (this.room.removeItem(itemName)) {
      this.sendMessages(itemName + " destroyed.", this.entity.name + " destroyed " + itemName, {contents: this.getContents(true)});
      this.saveRoom();
    } else {
      this.sendMessages("There's no " + itemName + " here.");
    }
  },

  disconnect: function() {
    if (this.entity) this.entity.connected = false;
    if (this.room) {
      this.saveRoom();
      this.sendMessages("", "", null, {contents: this.getContents(true)});
    }
  },

  saveRoom: function() {
    var self = this;
    this.room.save(function(err, room) {
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

    this.room.contents.forEach(function(entity) {
      var n = entity.name;
      if (entity.player && entity.connected) {
        n = "~"+n;
      }
      contents.push({name: n, description: entity.description});
    });

    return contents;
  },

  look: function(data) {
    if (!this.room) {
      this.sendMessages("You don't seem to be anywhere...");
      return;
    }
    if (data) {
      for (i in this.room.contents) {
        if (this.room.contents[i].name == data) {
          this.sendMessages(this.room.contents[i].description);
        }
      }
    } else {
      this.refreshRoom();
      this.sendMessages(this.room.describe());
    }
  },

  refreshRoom: function() {
    if (this.room) this.room = Room.all[this.room._id];
  },
  
  help: function() {
    var msg = "";
    for (cmd in this.commands) {
      msg += cmd + ": " + this.commands[cmd].desc + "\n";
    }
    this.sendMessages(msg);
  },

  auth: function(data) {
    if (data == "dumbkoala") {
      this.admin = true;
      this.sendMessages("Authed.");
    } else {
      this.sendMessages("Wrong.");
    }
  },

  login: function(data) {
    var self = this;
    if (Entity.all[data]) {
      console.log("Logged in existing player");
      this.entity = Entity.all[data];
      this.entity.player = true;
      this.entity.connected = true;
      this.socket.emit("_id", this.entity._id);
      this.join(this.entity.roomid);
    } else {
      // New player.
      console.log("Logged in new player" + this.world.entitiesDB);
      this.entity = new Entity('anon' + Math.floor(Math.random()*1000), {_id: 123}, this.world.entitiesDB);
      this.entity.player = true;
      this.entity.connected = true;
      this.entity.save(function(){
        self.socket.emit("_id", self.entity._id);
      });
      this.join(null);
    }
  },

  /******* Editor functions, TODO: Move these elsewhere. Seriously. *******/
  sendWorld: function() {
    console.log("Editor joined.");
    this.socket.join("_editor");
    var rooms = {};
    for (i in Room.all) {
      var room = Room.all[i];
      rooms[room._id] = room.data();
    }
    this.socket.emit("world", rooms);
  },

  editRoom: function(room) {
    //TODO: Error messages for these?
    if (!Room.all[room._id]) return;
    if (Room.all[room._id].name == "Home" && room.name != "Home") return; //Protect name of Home.

    Room.load(room, this.world.roomsDB);
    room.contents = Room.all[room._id].contents;
    Room.all[room._id] = room;
    room.save();
    this.socket.emit("roomSaved", room._id)
    this.socket.broadcast.to('_editor').emit('roomUpdated', room.data());
  },

  moveRoom: function(roomData) {
    var room = Room.all[roomData._id];
    room.editX = roomData.editX;
    room.editY = roomData.editY;
    room.save();
    this.socket.broadcast.to('_editor').emit('roomMoved', room.data());
  },

  destroyRoom: function(roomId) {
    var self = this;
    this.world.destroyRoom(roomId, function() {
      self.socket.emit("roomDestroyed", roomId)
      self.socket.broadcast.to('_editor').emit('roomDestroyed', roomId);
    });
  },

  createRoom: function(roomName, callback) {
    var self = this;
    if (!roomName) return;
    this.world.createRoom(roomName, function(err, room) {
      if (err) {
        //TODO: Send error message to editor, especially for duplicate name.
        console.log(err);
      } else {
        console.log("Created.");
        self.socket.emit("roomCreated", room.data());
        self.socket.broadcast.to('_editor').emit('roomCreated', room.data());
        
        room.editX = 200;
        room.editY = 200;
        self.socket.emit("roomMoved", room.data());
        self.socket.broadcast.to('_editor').emit('roomMoved', room.data());
        callback(room);
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
  this.admin = false;

  socket.on('chat',        function (data) { self.chat(data); });
  socket.on('cmd',         function(data) { self.cmd(data); });
  socket.on('login',       function(data) { self.login(data); });
  socket.on('disconnect',  function() { self.disconnect(); });

  socket.on('getWorld',    function() { self.sendWorld(); });
  socket.on('editRoom',    function(data) { self.editRoom(data); });
  socket.on('moveRoom',    function(data) { self.moveRoom(data); });
  socket.on('destroyRoom', function(data) { self.destroyRoom(data); });
  socket.on('createRoom',  function(data) { self.createRoom(data); });
};
Player.prototype = PlayerMethods;
exports.Player = Player;

