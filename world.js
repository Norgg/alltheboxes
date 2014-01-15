var WorldMethods = {
  getRoom: function(roomName, callback) {
    self = this;
    this.rooms.findOne({name: roomName}, function(err, room) {
      if (room) {
        callback(null, [room]);
      } else {
        console.log("Creating " + roomName);
        self.rooms.insert({name: roomName, description: "test"}, {safe: true}, callback);
      }
    });
  },

  saveRoom: function(room) {
    this.rooms.save(room, function(err, rooms) {if (err) console.log(err); else console.log(room.name + " saved");});
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
