var Entity = require('./entity.js').Entity
  , ObjectID = require('mongodb').ObjectID;

var RoomMethods = {
  createItem: function(itemName) {
    var item = new Entity(itemName);
    this.contents.push(item);
  },

  destroyItem: function(itemName) {
    return this.contents.some(function(item, index) {
      if (item.name == itemName) {
        this.contents.splice(index, 1)
        return true;
      }
    }, this);
  },

  describe: function() {
    var exitsArr = [];
    for (exit in this.exits) {
      exitsArr.push(exit);
    }
    var desc = this.description;
    if (exitsArr) desc += "\nExits: " + exitsArr.join(", ");
    return desc;
  },

};

Room = function(name) {
  this.name = name;
  this.description = "An empty room.";
  this.contents = [];
  this.exits = {};
};

Room.load = function(roomData) {
  if (!roomData.contents) roomData.contents = [];
  if (!roomData.exits) roomData.exits = {};
  if (!roomData.editX) roomData.editX = 0;
  if (!roomData.editY) roomData.editY = 0;
  console.log(roomData._id.length);
  if (roomData._id && typeof(roomData._id) == "string") roomData._id = ObjectID.createFromHexString(roomData._id);
  roomData.__proto__ = RoomMethods;
};

Room.prototype = RoomMethods;

exports.Room = Room;
