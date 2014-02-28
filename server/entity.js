var EntityMethods = {
  save: function(callback) {
    var content_ids = [];
    for (i in this.contents) {
      content_ids.push(this.contents[i]._id);
    }
    
    this.db.save(
      {_id: this._id, name: this.name, description: this.description, contents: content_ids}, 
      callback
    );
  },
};

var Entity = function(name, type, db) {
  console.log(db);
  this.db = db;
  this.name = name;
  this.type = type._id;
  this.contents = [];
  this.description = "";
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
        Entity.load(entity);
        Entity.all[entity._id] = entity;
        console.log("Loaded " + entity.name);
      });
      callback();
    }
  });
};

Entity.prototype = EntityMethods;
Entity.all = [];

exports.Entity = Entity;
