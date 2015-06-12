var Editor = function() {
    var self = {};
    self.maxZ = 1;

    self.editDiv = $('#editor');
    self.newRoomName = $('#newRoomName');
    self.newEntityName = $('#newEntityName');

    var url = 'ws://'+location.hostname+(location.port ? ':'+location.port: '') + '/ws';
    self.socket = new WebSocket(url);
    self.socket.onopen = function(evt) { self.onConnect(evt); };
    self.socket.onmessage = function(evt) { console.log(evt); self.onMessage(evt); };
    $('#newRoomForm').submit(function(evt) { self.createRoom(evt); });
    $('#newEntityForm').submit(function(evt) { self.createEntity(evt); });

    self.cvs = $('#lines');
    self.gfx = $('#lines')[0].getContext("2d");

    $(document).scroll(function(evt) { self.resize(); });
    $(window).resize(function(evt)     { self.resize(); });

    self.onConnect = function(evt) {
        self.editDiv.empty();
        console.log("Connected");
        self.emit({'getWorld': true});
    };

    self.onWorld = function(world) {
        console.log("Got world.");
        self.rooms = world.locations;
        self.entities = world.entities;
        self.roomEditors = {};
        for (var roomId in self.rooms) {
            var roomEditor = RoomEditor(self, self.rooms[roomId]);
            self.roomEditors[roomId] = roomEditor;
        }

        self.entityEditors = {};
        for (var entityId in self.entities) {
            var entityEditor = EntityEditor(self, self.entities[entityId]);
            self.entityEditors[entityId] = entityEditor;
        }
        self.drawLines();
    };

    self.onSaved = function(roomId) {
        var roomEditor = self.roomEditors[roomId];
        roomEditor.div.find('.roomContent').hide(200, function(){self.drawLines()});
        roomEditor.refreshContent();
    };

    self.onDestroyed = function(roomId) {
        self.roomEditors[roomId].div.remove();
        self.drawLines();
    };

    self.onUpdated = function(room) {
        console.log("Got update for " + room.name);
        var roomEditor = self.roomEditors[room.id];
        roomEditor.data = room;
        roomEditor.refreshContent();
        roomEditor.div.find('.headTitle').text(room.name);
        self.onMoved(room);
    };

    self.onMoved = function(room) {
        var roomEditor = self.roomEditors[room.id];
        roomEditor.moveTo(room.edit_x, room.edit_y);

        self.drawLines();
    };

    self.onCreated = function(room) {
        self.rooms[room.id] = room;
        var roomEditor = RoomEditor(self, room);
        self.roomEditors[room.id] = roomEditor;
        roomEditor.makeRoomBox(self);
        self.drawLines();
    };

    self.createRoom = function(evt) {
        evt.preventDefault();
        if (self.newRoomName.val()) self.emit({'createRoom': self.newRoomName.val()});
        self.newRoomName.val("");
    };
    
    self.createEntity = function(evt) {
        evt.preventDefault();
        if (self.newEntityName.val()) self.emit({'createEntity': self.newEntityName.val()});
        self.newEntityName.val("");
    };

    self.resize = function(evt) {
        console.log("resizing");
        self.cvs.width($(document).width());
        self.cvs.height($(document).height());
        self.cvs.attr("width",    self.cvs.width());
        self.cvs.attr("height", self.cvs.height());
        self.drawLines();
    };

    self.drawLines = function() {
        self.cvs[0].width = self.cvs[0].width;
        //self.gfx.clearRect(0, 0, self.cvs.width(), self.cvs.height());
        for (var roomId in self.roomEditors) {
            self.roomEditors[roomId].exitLines();
        }
    };

    self.onMessage = function(evt) {
        var msg = JSON.parse(evt.data);
        if (msg.world) self.onWorld(msg.world);
        if (msg.roomSaved) self.onSaved(msg.roomSaved);
        if (msg.roomDestroyed) self.onDestroyed(msg.roomDestroyed);
        if (msg.roomCreated) self.onCreated(msg.roomCreated);
        if (msg.roomUpdated) self.onUpdated(msg.roomUpdated);
        if (msg.roomMoved) self.onMoved(msg.roomMoved);
        if (msg.refresh) window.location.reload(true);
    }; 

    self.emit = function(obj) {
        self.socket.send(JSON.stringify(obj));
    }
    
    self.resize();
    return self;
};
