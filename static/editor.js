var RoomEditorMethods = {
  row: function() {
    var tr = $('<tr>');
    Array.prototype.slice.call(arguments, 0).forEach(function(item) {
      var td = $('<td>');
      td.append(item);
      tr.append(td);
    });
    return tr;
  },

  makeInput: function(name, val) {
    var self = this;
    var input = $('<input>');
    input.attr('name', name);
    input.val(val);
    input.keyup(function() { self.data[name]=input.val(); });
    return this.row(name+":", input);
  },

  makeTextarea: function(name, val) {
    var self = this;
    var input = $('<textarea>');
    input.attr('name', name);
    input.text(val);
    input.keyup(function() { self.data[name]=input.val(); });
    return this.row(name+":", input);
  },

  makeExit: function(exit, target) {
    var self = this;
    var exitInput = $('<input>');
    exitInput.attr('name', 'exit[]');
    exitInput.val(exit);
    exitInput.data('oldval', exit);
    var targetInput = $('<input>');
    targetInput.attr('name', 'target[]');
    targetInput.val(target);

    exitInput.keyup(function() {
      var target = self.data.exits[exitInput.data('oldval')];
      delete self.data.exits[exitInput.data('oldval')];
      exitInput.data('oldval', exitInput.val());
      self.data.exits[exitInput.val()] = target;
    });
    
    targetInput.keyup(function() {
      self.data.exits[exitInput.val()] = targetInput.val();
    });

    return this.row(exitInput, targetInput);
  }
}

var RoomEditor = function(data) {
  console.log(data);
  this.data = data;
}

RoomEditor.prototype = RoomEditorMethods;

var EditorMethods = {
  onConnect: function(evt) {
    this.editDiv.empty();
    console.log("Connected");
    this.socket.emit('getWorld');
    this.socket.emit('join', '_editor');
  },

  onWorld: function(rooms) {
    this.rooms = rooms;
    console.log(rooms);
    for (var room in rooms) {
      this.makeRoomBox(new RoomEditor(rooms[room]));
    }
  },

  makeRoomBox: function(room) {
    var self = this;

    var div = $('<div class="editbox">');
 
    var head = $('<div class="roomHead">'); //Header, clicked on to expand.
    head.append($('<h1 class="headTitle">' + room.data.name + '</h1>'));
    
    var content = $('<div class="roomContent">');
  
    var table = $('<table>');
    table.append(room.makeInput('name', room.data.name));
    table.append(room.makeTextarea('description', room.data.description));

    /******** EXITS ********/
    table.append(room.row("<b>exits</b>"));
    for (exit in room.data.exits) {
      table.append(room.makeExit(exit, room.data.exits[exit]));
    }

    var newExit = room.makeExit('','');
    table.append(newExit);

    function newExitKeyUp(evt) {
      if (!newExit.find('input').val()) return;
      var newNewExit = room.makeExit('','');
      newExit.after(newNewExit);

      newExit.unbind('keydown', newExitKeyUp);
      newExit = newNewExit;
      newExit.keydown(newExitKeyUp);
    };

    newExit.keydown(newExitKeyUp);

    /******* CONTENTS *******/
    table.append(room.row("<b>contents</b>"));
    room.data.contents.forEach(function(item) {
      table.append(room.row(item.name));
    });

    var saveButton = $('<button class="save">save</button>');
    saveButton.click(function() {
      console.log(room.data);
      self.socket.emit('editRoom', room.data);
    });

    table.append(room.row(saveButton));

    content.append(table);

    head.click(function() {
      if (self.noclick) self.noclick = false;
      else content.toggle(200)
    });

    div.append(head);
    div.append(content);

    div.draggable({
      start: function(evt, ui) {
        self.noclick = true;
      },
      stop: function(evt, ui) {
        var offset = div.offset();
        room.data.editX = offset.left;
        room.data.editY = offset.top;
        self.socket.emit('moveRoom', room.data);
      },
    });
    div.css('position', 'absolute');
    div.offset({top: room.data.editY, left: room.data.editX});

    this.editDiv.append(div);
  },
};

var Editor = function() {
  var self = this;
  this.socket = io.connect(url);
  this.editDiv = $('#editor');
  
  this.socket.on('connect', function(evt) { self.onConnect(evt); });
  //this.socket.on('reconnect', function(evt) { self.onConnect(evt); });
  this.socket.on('world', function(world) { self.onWorld(world); });

  var url;
};

Editor.prototype = EditorMethods;
