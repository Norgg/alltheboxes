var EntityMethods = {
  save: function(callback) {
    var self = this;
    var content_ids = [];
    for (i in this.contents) {
      content_ids.push(this.contents[i]._id);
    }
    
    this.db.save(
      {_id: this._id, name: this.name, description: this.description, contents: content_ids, player: this.player, roomid: this.roomid}, 
      function(err, entity) {
        if (err) {
          console.log(err);
        } else {
          if (!self._id) self._id = entity._id;
          if (callback) callback(err, self);
        }
      }
    );
  },
};

var Entity = function(name, type, db) {
  this.db = db;
  this.name = name;
  this.type = type._id;
  this.contents = [];
  this.description = "Something nondescript.";
  this.player = false;
};

Entity.load = function(entityData, db) {
  var objContents = []; // Load in contents of this entity
  for (i in entityData.contents) {
    var id = entityData.contents[i];
    if (id instanceof ObjectID) {
      objContents.push(Entity.all[id]);
    }
  }
  entityData.contents = objContents;
  
  if (entityData._id && typeof(entityData._id) == "string") entityData._id = ObjectID.createFromHexString(entityData._id);
  entityData.db = db;
  entityData.__proto__ = EntityMethods;
};

Entity.loadAll = function(db, callback) {
  db.find().toArray(function(err, entities) {
    if (err) {
      console.log(err);
    } else {
      Entity.all = {}
      entities.forEach(function(entity) {
        Entity.load(entity, db);
        Entity.all[entity._id] = entity;
      });
      callback();
    }
  });
};

Entity.prototype = EntityMethods;
Entity.all = [];

exports.Entity = Entity;
