var Room = require('./room').Room;
var Entity = require('./entity').Entity;
var ObjectID = require('mongodb').ObjectID;

var WorldMethods = {
  getHome: function(callback) {
    this.roomsDB.findOne({name: 'Home'}, callback);
  },
  
  createRoom: function(roomName, callback) {
    //TODO: Change this to support creating non-uniquely named rooms.
    var self = this;
    console.log("Creating " + roomName);
    var newRoom = new Room(roomName, self.roomsDB);
    self.roomsDB.insert(newRoom.data(), {safe: true}, function(err, rooms) {
      if (err) {
        console.log(err);
        callback(err, null);
      } else {
        self.roomsDB.findOne({name: roomName}, function(err, room) {
          if (err) {
            console.log(err);
            callback(err, null);
          } else if (room) {
            Room.load(room, self.roomsDB);
            console.log(room.describe());
            Room.all[room._id] = room;
            callback(null, room);
          }
        });
      }
    });
  },

  destroyRoom: function(roomId, callback) {
    var self = this;
    console.log("Destroying " + roomId);
    var room = Room.all[roomId];
    this.roomsDB.remove({'_id': room._id}, true, function(err) {
      if (err) {
        console.log(err);
      } else {
        delete self.rooms[roomId];
        console.log("destroyed.");
        callback();
      }
    });
  },

  createEntity: function(name, type, callback) {
    console.log("Creating a " + type + " called \"" + name + "\"");

    var self = this;
    var newEntity = new Entity(name);
    self.entitiesDB.insert(newEntity, {safe: true}, function(err, entities) {
      if (err) {
        console.log(err);
        callback(err, null);
      } else {
        self.roomsDB.findOne({name: name}, function(err, entity) {
          if (err) {
            console.log(err);
            callback(err, null);
          } else if (entity) {
            Entity.load(entity);
            console.log(entity + " created.");
            self.entities[entity._id] = entity;
            callback(null, entity);
          }
        });
      }
    });

    return entity;
  },

};

World = function(roomsDB, entitiesDB, typesDB, callback) {
  var self = this;
  this.roomsDB = roomsDB;
  this.entitiesDB = entitiesDB;
  this.typesDB = typesDB;
  
  Entity.loadAll(entitiesDB, function() {
    Room.loadAll(roomsDB, callback);
  });
};

World.prototype = WorldMethods;

exports.World = World;
