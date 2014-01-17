var Room = require('./room').Room

var WorldMethods = {
  getRoom: function(roomName, callback) {
    self = this;
    var room = this.rooms[roomName];
    if (room) {
      Room.load(room);
      console.log("Found " + room.name);
      callback(null, room);
    } else {
      self.createRoom(roomName, callback);
    }
  },

  createRoom: function(roomName, callback) {
    console.log("Creating " + roomName);
    self.roomsDB.insert(new Room(roomName), {safe: true}, function(err, rooms) {
      if (err) {
        console.log(err);
        callback(err, []);
      } else {
        this.roomsDB.findOne({name: roomName}, function(err, room) {
          if (err) {
            console.log(err);
            callback(err, null);
          } else if (room) {
            rooms[roomName] = room;
            callback(null, room);
          }
        });
      }
    });
  },

  saveRoom: function(room, callback) {
    console.log("saving: " + room._id);
    if (!callback) callback = function(err, rooms) {if (err) console.log(err); else console.log(room.name + " saved");};
    this.roomsDB.save(room, callback);
  },

};

World = function(roomsDB, callback) {
  var self = this;
  this.roomsDB = roomsDB;
  roomsDB.find().toArray(function(err, rooms) {
    if (err) {
      console.log(err);
    } else {
      self.rooms = {};
      rooms.forEach(function(room) {
        self.rooms[room.name] = room;
      });
      console.log(self.rooms);
      callback();
    }
  });
};

World.prototype = WorldMethods;

exports.World = World;
