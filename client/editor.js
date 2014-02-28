var RoomEditorMethods = {
  //TODO: Split this up and move into the initialiser?
  makeRoomBox: function() {
    var self = this;
    var editor = this.editor;
    
    var div = $('<div class="editbox">');

    div.mousedown(function() {
      if (div.css('z-index') != editor.maxZ) {
        div.css('z-index', ++editor.maxZ);
      }
    });

    div.draggable({
      distance: 5,
      appendTo: '#editor',
      scroll: true,
      start: function(evt, ui) {
        editor.noclick = true;
      },
      drag: function(evt, ui) {
        editor.drawLines();
      },
      stop: function(evt, ui) {
        self.savePos();
      },
    });

    div.droppable({
      accept: ".exitTarget",
      drop: function(evt, ui) {
        console.log(ui.draggable.data("roomEditor"));
        if (ui.draggable.data("exitInput").val()) {
          ui.draggable.data("roomEditor").data.exits[ui.draggable.data("exitInput").val()] = self.data._id;
        }
        ui.draggable.data("targetName").text(self.data.name);
        ui.draggable.data("roomEditor").editor.drawLines();
      },
    });

    var head = $('<div class="roomHead">'); //Header, clicked on to expand.
    head.append($('<h1 class="headTitle">' + this.data.name + '</h1>'));

    head.click(function() {
      if (editor.noclick) {
        editor.noclick = false;
      } else {
        self.content.toggle(200, function(){
          editor.drawLines();
        });
      }
    });

    this.content = $('<div class="roomContent">');

    this.refreshContent();
    
    div.append(head);
    div.append(this.content);

    div.css('position', 'absolute');
    div.offset({top: this.data.editY, left: this.data.editX});
    
    this.div = div;

    editor.editDiv.append(div);
  },

  refreshContent: function() {
    this.content.empty();
    var self = this;
    var form = $('<form>');
    form.submit(function(evt) {
      evt.preventDefault();
      console.log(self.data);
      self.div.find('.headTitle').text(self.data.name);
      self.editor.socket.emit('editRoom', self.data);
      return false;
    });
  
    var table = $('<table>');
    table.append(self.row("id:", '<input readonly value="' + self.data._id + '">'));
    table.append(self.makeInput('name', self.data.name));
    table.append(self.makeTextarea('description', self.data.description));

    /******** EXITS ********/
    table.append(self.row("<b>exits</b>"));
    for (exit in self.data.exits) {
      table.append(self.makeExit(exit, self.data.exits[exit]));
    }

    var newExit = self.makeExit('','');
    table.append(newExit);

    function newExitKeyUp(evt) {
      if (!newExit.find('input').val()) return;
      var newNewExit = self.makeExit('','');
      newExit.after(newNewExit);

      newExit.unbind('keydown', newExitKeyUp);
      newExit = newNewExit;
      newExit.keydown(newExitKeyUp);
    };

    newExit.keydown(newExitKeyUp);

    var saveButton = $('<input type="submit" class="save" value="save"/>');
   
    var destroyButton = $('<button class="destroy">destroy</button>');
    destroyButton.click(function(evt) {
      evt.preventDefault();
      if (confirm("Sure?")) self.editor.socket.emit('destroyRoom', self.data._id);
    });

    table.append(self.row(saveButton, destroyButton));

    form.append(table);
    this.content.append(form);
  },

  moveTo: function(x, y) {
    this.data.editX = x;
    this.data.editY = y;
    this.div.animate({left: x, top: y}, 200);
  },

  savePos: function() {
    var offset = this.div.offset();
    this.data.editX = offset.left;
    this.data.editY = offset.top;
    this.editor.socket.emit('moveRoom', this.data);
  },

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

    console.log(name + "=" + val);
    if (name == "name" && val == "Home") input.attr('readonly', true);

    input.attr('name', name);
    input.val(val);
    input.keyup(function() { if (input.val()) self.data[name]=input.val(); });
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

    exitInput.keyup(function() {
      var target = self.data.exits[exitInput.data('oldval')];
      delete self.data.exits[exitInput.data('oldval')];
      exitInput.data('oldval', exitInput.val());
      if (exitInput.val()) self.data.exits[exitInput.val()] = target;
    });
    
    var targetChange = function(evt) {
    };

    var targetName = $("<span>-</span>");
    if (this.editor.rooms[target]) targetName.text(this.editor.rooms[target].name);
    
    var targetDropper = $('<span class="exitTarget">o</span>');
    targetDropper.draggable({
      helper: "clone"
    });

    targetDropper.data("roomEditor", this);
    targetDropper.data("exitInput", exitInput);
    targetDropper.data("targetName", targetName);


    return this.row(exitInput, targetName, targetDropper);
  },

  exitLines: function() {
    for (var exit in this.data.exits) {
      var target = this.data.exits[exit];
      var targetEditor = this.editor.roomEditors[target];
      if (targetEditor) {
        var pos = this.center();
        var targetPos = targetEditor.center();

        this.gfx.lineCap = 'round';
        this.gfx.beginPath();
        this.gfx.moveTo(pos.left, pos.top);
        this.gfx.lineTo(targetPos.left, targetPos.top);
        this.gfx.strokeStyle = "black";
        this.gfx.stroke();
      }
    }
  },

  center: function() {
    var pos = this.div.offset();
    pos.top += this.div.height()/2;
    pos.left += this.div.width()/2;
    return pos;
  },
}

var RoomEditor = function(data, editor) {
  this.data = data;
  this.editor = editor;
  this.gfx = $('#lines')[0].getContext("2d");
}

RoomEditor.prototype = RoomEditorMethods;

var EditorMethods = {
  onConnect: function(evt) {
    this.editDiv.empty();
    console.log("Connected");
    this.socket.emit('getWorld');
  },

  onWorld: function(rooms) {
    this.rooms = rooms;
    console.log(rooms);
    this.roomEditors = {};
    for (var roomId in rooms) {
      var roomEditor = new RoomEditor(rooms[roomId], this);
      this.roomEditors[roomId] = roomEditor;
      roomEditor.makeRoomBox();
    }
    this.drawLines();
  },

  onSaved: function(roomId) {
    var self = this;
    var roomEditor = this.roomEditors[roomId];
    roomEditor.div.find('.roomContent').hide(200, function(){self.drawLines()});
    roomEditor.refreshContent();
  },

  onDestroyed: function(roomId) {
    this.roomEditors[roomId].div.remove();
    this.drawLines();
  },

  onUpdated: function(room) {
    console.log("Got update for " + room.name);
    var roomEditor = this.roomEditors[room._id];
    roomEditor.data = room;
    roomEditor.refreshContent();
    roomEditor.div.find('.headTitle').text(room.name);
    this.onMoved(room);
  },

  onMoved: function(room) {
    var roomEditor = this.roomEditors[room._id];
    roomEditor.moveTo(room.editX, room.editY);

    this.drawLines();
  },

  onCreated: function(room) {
    this.rooms[room._id] = room;
    var roomEditor = new RoomEditor(room, this);
    this.roomEditors[room._id] = roomEditor;
    roomEditor.makeRoomBox(this);
    this.drawLines();
  },

  createRoom: function(evt) {
    evt.preventDefault();
    if (this.newRoomName.val()) this.socket.emit('createRoom', this.newRoomName.val());
    this.newRoomName.val("");
  },

  resize: function(evt) {
    console.log("resizing");
    this.cvs.width($(document).width());
    this.cvs.height($(document).height());
    this.cvs.attr("width",  this.cvs.width());
    this.cvs.attr("height", this.cvs.height());
    this.drawLines();
  },

  drawLines: function() {
    this.cvs[0].width = this.cvs[0].width;
    //this.gfx.clearRect(0, 0, this.cvs.width(), this.cvs.height());
    for (var roomId in this.roomEditors) {
      this.roomEditors[roomId].exitLines();
    }
  }
};

var Editor = function() {
  var self = this;
  self.maxZ = 1;
  
  this.socket = io.connect(url);
  this.editDiv = $('#editor');
  this.newRoomName = $('#newRoomName');
  
  $('#newRoomForm').submit(function(evt)           { self.createRoom(evt); });
  this.socket.on('connect', function(evt)          { self.onConnect(evt); });
  this.socket.on('world', function(world)          { self.onWorld(world); });
  this.socket.on('roomSaved', function(roomId)     { self.onSaved(roomId); });
  this.socket.on('roomDestroyed', function(roomId) { self.onDestroyed(roomId); });
  this.socket.on('roomCreated', function(room)     { self.onCreated(room); });
  this.socket.on('roomUpdated', function(room)     { self.onUpdated(room); });
  this.socket.on('roomMoved', function(room)       { self.onMoved(room); });
  this.socket.on('refresh', function(evt)          { window.location.reload(true); });

  this.cvs = $('#lines');
  this.gfx = $('#lines')[0].getContext("2d");
  
  $(document).scroll(function(evt) { self.resize(); });
  $(window).resize(function(evt)   { self.resize(); });
  this.resize();

  var url;
};

Editor.prototype = EditorMethods;
