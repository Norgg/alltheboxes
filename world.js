var Room = require('./room').Room

var WorldMethods = {
  getRoom: function(roomName, callback) {
    self = this;
    this.rooms.findOne({name: roomName}, function(err, room) {
      if (err) {
        console.log(err);
        callback(err, null);
      } else if (room) {
        Room.load(room);
        console.log("Found " + room.name);
        callback(null, room);
      } else {
        self.createRoom(roomName, callback);
      }
    });
  },

  createRoom: function(roomName, callback) {
    console.log("Creating " + roomName);
    self.rooms.insert(new Room(roomName), {safe: true}, function(err, rooms) {
      if (err) {
        console.log(err);
        callback(err, []);
      } else {
        this.rooms.findOne({name: roomName}, function(err, room) {
          if (err) {
            console.log(err);
            callback(err, null);
          } else if (room) {
            callback(null, room);
          }
        });
      }
    });
  },

  saveRoom: function(room, callback) {
    console.log("saving: " + room._id);
    if (!callback) callback = function(err, rooms) {if (err) console.log(err); else console.log(room.name + " saved");};
    this.rooms.save(room, callback);
  },
};

World = function(rooms) {
  this.rooms = rooms;
};

World.prototype = WorldMethods;

exports.World = World;
