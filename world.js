var Room = require('./room').Room
var ObjectID = require('mongodb').ObjectID;

var WorldMethods = {
  getRoom: function(roomName) {
    return this.rooms[this.roomIDs[roomName]];
  },

  createRoom: function(roomName, callback) {
    //TODO: Change this to support creating non-uniquely named rooms.
    var self = this;
    console.log("Creating " + roomName);
    var newRoom = new Room(roomName);
    self.roomsDB.insert(newRoom, {safe: true}, function(err, rooms) {
      if (err) {
        console.log(err);
        callback(err, []);
      } else {
        self.roomsDB.findOne({name: roomName}, function(err, room) {
          if (err) {
            console.log(err);
            callback(err, null);
          } else if (room) {
            Room.load(room);
            console.log(room.describe());
            self.rooms[room._id] = room;
            self.roomIDs[room.name] = room._id;
            callback(null, room);
          }
        });
      }
    });
  },

  destroyRoom: function(roomId, callback) {
    var self = this;
    console.log("Destroying " + roomId);
    var room = this.rooms[roomId];
    this.roomsDB.remove({'_id': room._id}, true, function(err) {
      if (err) {
        console.log(err);
      } else {
        delete self.rooms[roomId];
        callback();
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
  //roomsDB.remove(function(){});
  roomsDB.find().toArray(function(err, rooms) {
    if (err) {
      console.log(err);
    } else {
      self.rooms = {};
      self.roomIDs = {};
      rooms.forEach(function(room) {
        Room.load(room);
        self.rooms[room._id] = room;
        self.roomIDs[room.name] = room._id;
        console.log("Loaded " + room.name);
      });
      callback();
    }
  });
};

World.prototype = WorldMethods;

exports.World = World;
