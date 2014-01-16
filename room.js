var RoomMethods = {
  createItem: function(room, item) {
    room.contents.push(item);
    this.saveRoom(room);
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
