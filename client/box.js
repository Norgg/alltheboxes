var Box = function(editor, title, data) {
    var self = {};
    
    self.editor = editor;
    self.title = title;
    self.data = data;
    self.type = "Box";
    
    self.div = $('<div class="editbox">');
    self.div.mousedown(function() {
        if (self.div.css('z-index') != editor.maxZ) {
            self.div.css('z-index', ++editor.maxZ);
        }
    });

    self.div.draggable({
        distance: 5,
        appendTo: '#editor',
        scroll: true,
        start: function(evt, ui) {
            self.editor.noclick = true;
        },
    });
    
    self.head = $('<div class="boxHead">'); //Header, clicked on to expand.
    self.head.append($('<h1 class="headTitle">' + self.data.name + '</h1>'));

    self.head.click(function() {
        if (editor.noclick) {
            editor.noclick = false;
        } else {
            self.content.toggle(200, function(){
                editor.drawLines();
            });
        }
    });

    self.content = $('<div class="boxContent">');

    self.div.append(self.head);
    self.div.append(self.content);

    self.div.css('position', 'absolute');
    self.div.offset({top: self.data.edit_y, left: self.data.edit_x});

    self.editor.editDiv.append(self.div);

    self.moveTo = function(x, y) {
        self.data.edit_x = x;
        self.data.edit_y = y;
        self.div.animate({left: x, top: y}, 200);
    };

    self.savePos = function() {
        var offset = self.div.offset();
        self.data.edit_x = offset.left;
        self.data.edit_y = offset.top;
        var cmd = {};
        cmd['move' + self.type] = self.data;
        self.editor.emit(cmd);
    };

    self.form = function() {
        var form = $('<form>');

        form.submit(function(evt) {
            evt.preventDefault();
            self.div.find('.headTitle').text(self.data.name);
            var cmd = {};
            cmd['edit'+self.type] = self.data;
            self.editor.emit(cmd);
            return false;
        });
        return form;
    };

    self.addButtons = function(table) {
        var saveButton = $('<input type="submit" class="save" value="save"/>');

        var destroyButton = $('<button class="destroy">destroy</button>');
        destroyButton.click(function(evt) {
            evt.preventDefault();
            var cmd = {};
            cmd['destroy'+self.type] = self.data.id;
            if (confirm("Sure?")) self.editor.emit(cmd);
        });

        table.append(self.row(saveButton, destroyButton));
    };

    self.row = function() {
        var tr = $('<tr>');
        Array.prototype.slice.call(arguments, 0).forEach(function(item) {
            var td = $('<td>');
            td.append(item);
            tr.append(td);
        });
        return tr;
    };

    self.makeInput = function(name, val) {
        var input = $('<input>');

        console.log(name + "=" + val);
        if (name == "name" && val == "Home") input.attr('readonly', true);

        input.attr('name', name);
        input.val(val);
        input.keyup(function() { 
            if (input.val()) self.data[name] = input.val();
        });
        return self.row(name+":", input);
    };
    
    self.makeTextarea = function(name, val) {
        var input = $('<textarea>');
        input.attr('name', name);
        input.text(val);
        input.keyup(function() { 
            self.data[name]=input.val();
        });
        return self.row(name+":", input);
    };

    self.center = function() {
        var pos = this.div.offset();
        pos.top += this.div.height()/2;
        pos.left += this.div.width()/2;
        return pos;
    };

    return self;
}


