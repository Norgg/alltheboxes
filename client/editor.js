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

    /**************** ROOM METHODS *****************/
    self.onRoomSaved = function(roomId) {
        var roomEditor = self.roomEditors[roomId];
        roomEditor.div.find('.boxContent').hide(200, function(){self.drawLines()});
        roomEditor.refreshContent();
    };

    self.onRoomDestroyed = function(roomId) {
        self.roomEditors[roomId].div.remove();
        self.drawLines();
    };

    self.onRoomUpdated = function(room) {
        console.log("Got update for " + room.name);
        var roomEditor = self.roomEditors[room.id];
        roomEditor.data = room;
        roomEditor.refreshContent();
        roomEditor.div.find('.headTitle').text(room.name);
        self.onRoomMoved(room);
    };

    self.onRoomMoved = function(room) {
        var roomEditor = self.roomEditors[room.id];
        roomEditor.moveTo(room.edit_x, room.edit_y);

        self.drawLines();
    };

    self.onRoomCreated = function(room) {
        self.rooms[room.id] = room;
        var roomEditor = RoomEditor(self, room);
        self.roomEditors[room.id] = roomEditor;
        self.drawLines();
    };

    self.createRoom = function(evt) {
        evt.preventDefault();
        if (self.newRoomName.val()) self.emit({'createRoom': self.newRoomName.val()});
        self.newRoomName.val("");
    };

    /**************** ENTITY METHODS *****************/

    self.onEntitySaved = function(entityId) {
        var entityEditor = self.entityEditors[entityId];
        entityEditor.div.find('.boxContent').hide(200);
        entityEditor.refreshContent();
    };

    self.onEntityDestroyed = function(entityId) {
        self.entityEditors[entityId].div.remove();
        self.drawLines();
    };

    self.onEntityUpdated = function(entity) {
        console.log("Got update for " + entity.name);
        var entityEditor = self.entityEditors[entity.id];
        entityEditor.data = entity;
        entityEditor.refreshContent();
        entityEditor.div.find('.headTitle').text(entity.name);
        self.onEntityMoved(entity);
    };

    self.onEntityMoved = function(entity) {
        var entityEditor = self.entityEditors[entity.id];
        entityEditor.moveTo(entity.edit_x, entity.edit_y);

        self.drawLines();
    };

    self.onEntityCreated = function(entity) {
        console.log("Creating entity " + entity);
        self.entities[entity.id] = entity;
        var entityEditor = EntityEditor(self, entity);
        self.entityEditors[entity.id] = entityEditor;
        self.drawLines();
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
        if (msg.roomSaved) self.onRoomSaved(msg.roomSaved);
        if (msg.roomDestroyed) self.onRoomDestroyed(msg.roomDestroyed);
        if (msg.roomCreated) self.onRoomCreated(msg.roomCreated);
        if (msg.roomUpdated) self.onRoomUpdated(msg.roomUpdated);
        if (msg.roomMoved) self.onRoomMoved(msg.roomMoved);
        
        if (msg.entitySaved) self.onEntitySaved(msg.entitySaved);
        if (msg.entityDestroyed) self.onEntityDestroyed(msg.entityDestroyed);
        if (msg.entityCreated) self.onEntityCreated(msg.entityCreated);
        if (msg.entityUpdated) self.onEntityUpdated(msg.entityUpdated);
        if (msg.entityMoved) self.onEntityMoved(msg.entityMoved);

        if (msg.refresh) window.location.reload(true);
    }; 

    self.emit = function(obj) {
        self.socket.send(JSON.stringify(obj));
    }
    
    self.resize();
    return self;
};
