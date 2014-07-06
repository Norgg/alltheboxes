var EntityTypeMethods = {
  data: function() {
    var data = {};
    ['_id', 'name', 'mass', 'volume'].forEach(function(f) {
      data[f] = this[f];
    }
    return data;
  }
}

var EntityType = function(name, db) {
  
}
