var WorldMethods = {
  getRoom: function(roomName, callback) {
    self = this;
    this.rooms.findOne({name: roomName}, function(err, room) {
      if (err) {
        console.log(err);
        callback(err, []);
      } else if (room) {
        console.log("Found " + room.name);
        callback(null, [room]);
      } else {
        console.log("Creating " + roomName);
        self.rooms.insert({name: roomName, description: "An empty room.", contents: []}, {safe: true}, callback);
      }
    });
  },

  saveRoom: function(room) {
    this.rooms.save(room, function(err, rooms) {if (err) console.log(err); else console.log(room.name + " saved");});
  },

  createItem: function(room, item) {
    room.contents.push(item);
    this.saveRoom(room);
  },
  
};
World = function(rooms) {
  this.rooms = rooms;
};
World.prototype = WorldMethods;

var RoomMethods = {
}
Room = function() {};
Room.prototype = RoomMethods;

exports.World = World;
