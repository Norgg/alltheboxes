var Entity = require('./entity.js').Entity;

var RoomMethods = {
  createItem: function(itemName) {
    var item = new Entity(itemName);
    this.contents.push(item);
  },

  destroyItem: function(itemName) {
    this.contents.some(function(item, index) {
      if (item.name == itemName) {
        this.contents.splice(index, 1)
        return true;
      }
    }, this);
  },
};

Room = function(name) {
  console.log("Creating new room: " + name);
  this.name = name;
  this.description = "An empty room.";
  this.contents = [];
  this.exits = {};
};

Room.load = function(roomData) {
  if (!roomData.contents) roomData.contents = [];
  if (!roomData.exits) roomData.exits = {};
  roomData.__proto__ = RoomMethods;
};

Room.prototype = RoomMethods;

exports.Room = Room;
