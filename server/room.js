var Entity = require('./entity.js').Entity
  , ObjectID = require('mongodb').ObjectID;

var RoomMethods = {
  createItem: function(itemName, entitiesDB, callback) {
    console.log("Creating item in " + this.name);
    var self = this;
    var itemData = new Entity(itemName, {_id:123}, entitiesDB);
    itemData.save(function(err, item){
      if (err) {
        console.log(err);
      } else {
        console.log("Item saved, adding to contents: " + item._id);
        self.contents.push(item);
        self.save(function(err, i) {
          if (err) {
            console.log(err);
          } else {
            callback();
          }
        });
      }
    });
  },

  addItem: function(item, callback) {
    if (this.contents.indexOf(item) < 0) {
      this.contents.push(item);
      this.save(callback);
    } else {
      callback(null, this);
    }
  },

  removeItem: function(itemName) { // TODO: Base this on item id or something.
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

  save: function(callback) {
    if (!callback) callback = function(err, room) { if (err) console.log(err); };
    this.db.save(this.data(), callback);
  },

  data: function() {
    var content_ids = [];
    console.log("Saving room.");
    for (i in this.contents) {
      content_ids.push(this.contents[i]._id);
    }
    return {_id: this._id, name: this.name, description: this.description, exits: this.exits, contents: content_ids, editX: this.editX, editY: this.editY};
  },
};

Room = function(name, db) {
  this.name = name;
  this.description = "An empty room.";
  this.contents = [];
  this.exits = {};
  this.db = db;
};

Room.load = function(roomData, db) {
  if (!roomData.contents) roomData.contents = [];
  var objContents = []; // Load in objects for the room
  for (i in roomData.contents) {
    var id = roomData.contents[i];
    if (id instanceof ObjectID) {
      objContents.push(Entity.all[id]);
    }
  }
  roomData.contents = objContents;

  if (!roomData.exits) roomData.exits = {};
  if (!roomData.editX) roomData.editX = 0;
  if (!roomData.editY) roomData.editY = 0;
  if (roomData._id && typeof(roomData._id) == "string") roomData._id = ObjectID.createFromHexString(roomData._id);
  roomData.db = db;
  roomData.__proto__ = RoomMethods;
};

Room.loadAll = function(db, callback) {
  db.find().toArray(function(err, rooms) {
    if (err) {
      console.log(err);
    } else {
      Room.all = {};
      rooms.forEach(function(room) {
        Room.load(room, db);
        Room.all[room._id] = room;
        //console.log("Loaded " + room.name);
      });
      callback();
    }
  });
};

Room.prototype = RoomMethods;

exports.Room = Room;
