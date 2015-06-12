var EditorMethods = {
    onConnect: function(evt) {
        this.editDiv.empty();
        console.log("Connected");
        this.emit({'getWorld': true});
    },

    onWorld: function(world) {
        console.log("Got world.");
        this.rooms = world.locations;
        this.entities = world.entities;
        console.log(world);
        this.roomEditors = {};
        for (var roomId in this.rooms) {
            var roomEditor = RoomEditor(this, this.rooms[roomId]);
            this.roomEditors[roomId] = roomEditor;
        }

        this.entityEditors = {};
        for (var entityId in this.entities) {
            var entityEditor = EntityEditor(this, this.entities[entityId]);
            this.entityEditors[entityId] = entityEditor;
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
        var roomEditor = this.roomEditors[room.id];
        roomEditor.data = room;
        roomEditor.refreshContent();
        roomEditor.div.find('.headTitle').text(room.name);
        this.onMoved(room);
    },

    onMoved: function(room) {
        var roomEditor = this.roomEditors[room.id];
        roomEditor.moveTo(room.edit_x, room.edit_y);

        this.drawLines();
    },

    onCreated: function(room) {
        console.log(room)
        this.rooms[room.id] = room;
        var roomEditor = RoomEditor(this, room);
        this.roomEditors[room.id] = roomEditor;
        roomEditor.makeRoomBox(this);
        this.drawLines();
    },

    createRoom: function(evt) {
        evt.preventDefault();
        if (this.newRoomName.val()) this.emit({'createRoom': this.newRoomName.val()});
        this.newRoomName.val("");
    },
    
    createEntity: function(evt) {
        evt.preventDefault();
        if (this.newEntityName.val()) this.emit({'createEntity': this.newEntityName.val()});
        this.newEntityName.val("");
    },

    resize: function(evt) {
        console.log("resizing");
        this.cvs.width($(document).width());
        this.cvs.height($(document).height());
        this.cvs.attr("width",    this.cvs.width());
        this.cvs.attr("height", this.cvs.height());
        this.drawLines();
    },

    drawLines: function() {
        this.cvs[0].width = this.cvs[0].width;
        //this.gfx.clearRect(0, 0, this.cvs.width(), this.cvs.height());
        for (var roomId in this.roomEditors) {
            this.roomEditors[roomId].exitLines();
        }
    },

    onMessage: function(evt) {
        var msg = JSON.parse(evt.data);
        console.log(msg);
        if (msg.world) this.onWorld(msg.world);
        if (msg.roomSaved) this.onSaved(msg.roomSaved);
        if (msg.roomDestroyed) this.onDestroyed(msg.roomDestroyed);
        if (msg.roomCreated) this.onCreated(msg.roomCreated);
        if (msg.roomUpdated) this.onUpdated(msg.roomUpdated);
        if (msg.roomMoved) this.onMoved(msg.roomMoved);
        if (msg.refresh) window.location.reload(true);
    }, 

    emit: function(obj) {
        this.socket.send(JSON.stringify(obj));
    }
};

var Editor = function() {
    var self = this;
    self.maxZ = 1;

    this.editDiv = $('#editor');
    console.log(this.editDiv);
    this.newRoomName = $('#newRoomName');
    this.newEntityName = $('#newEntityName');

    var url = 'ws://'+location.hostname+(location.port ? ':'+location.port: '') + '/ws';
    this.socket = new WebSocket(url);
    this.socket.onopen = function(evt) { self.onConnect(evt); };
    this.socket.onmessage = function(evt) { console.log(evt); self.onMessage(evt); };
    $('#newRoomForm').submit(function(evt) { self.createRoom(evt); });
    $('#newEntityForm').submit(function(evt) { self.createEntity(evt); });

    this.cvs = $('#lines');
    this.gfx = $('#lines')[0].getContext("2d");

    $(document).scroll(function(evt) { self.resize(); });
    $(window).resize(function(evt)     { self.resize(); });
    this.resize();

    var url;
};

Editor.prototype = EditorMethods;
