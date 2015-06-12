var RoomEditor = function(editor, data) {
    var self = Box(editor, data.name, data);

    self.type = "Room";
    self.gfx = $('#lines')[0].getContext("2d");

    // TODO: Make it so that dragging a connector before naming an exit still
    // works and doesn't just forget it.
    self.div.droppable({
        accept: ".exitTarget",
        drop: function(evt, ui) {
            console.log(ui.draggable.data("roomEditor"));
            if (ui.draggable.data("exitInput").val()) {
                ui.draggable.data("roomEditor").data.exits[ui.draggable.data("exitInput").val()] = self.data.id;
            }
            ui.draggable.data("targetName").text(self.data.name);
            ui.draggable.data("roomEditor").editor.drawLines();
        },
    });

    self.refreshContent = function() {
        self.content.empty();
        var form = $('<form>');
        form.submit(function(evt) {
            evt.preventDefault();
            console.log(self.data);
            self.div.find('.headTitle').text(self.data.name);
            self.editor.emit({'editRoom': self.data});
            return false;
        });

        var table = $('<table>');
        table.append(self.row("id:", '<input readonly value="' + self.data.id + '">'));
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
            if (confirm("Sure?")) self.editor.emit({'destroyRoom': self.data.id});
        });

        table.append(self.row(saveButton, destroyButton));

        form.append(table);
        self.content.append(form);
    };

    self.makeExit = function(exit, target) {
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
        if (self.editor.rooms[target]) targetName.text(self.editor.rooms[target].name);

        var targetDropper = $('<span class="exitTarget">o</span>');
        targetDropper.draggable({
            helper: "clone"
        });

        targetDropper.data("roomEditor", self);
        targetDropper.data("exitInput", exitInput);
        targetDropper.data("targetName", targetName);


        return self.row(exitInput, targetName, targetDropper);
    };

    self.exitLines = function() {
        for (var exit in self.data.exits) {
            var target = self.data.exits[exit];
            var targetEditor = self.editor.roomEditors[target];
            if (targetEditor) {
                var pos = self.center();
                var targetPos = targetEditor.center();

                self.gfx.lineCap = 'round';
                self.gfx.beginPath();
                self.gfx.moveTo(pos.left, pos.top);
                self.gfx.lineTo(targetPos.left, targetPos.top);
                self.gfx.strokeStyle = "black";
                self.gfx.stroke();
            }
        }
    };
    self.refreshContent();
    return self;
}
