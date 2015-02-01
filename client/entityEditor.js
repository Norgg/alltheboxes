function EntityEditor(data, editor) {
    var self = {};

    self.editor = editor;
    self.data = data;
    
    var editor = this.editor;

    var div = $('<div class="editbox entityEditbox">');

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
        /*drag: function(evt, ui) {
            editor.drawLines();
        },*/
        stop: function(evt, ui) {
            //self.savePos();
        },
    });

    var head = $('<div class="entityHead">'); //Header, clicked on to expand.
    head.append($('<h1 class="headTitle">' + self.data.name + '</h1>'));

    head.click(function() {
        if (editor.noclick) {
            editor.noclick = false;
        } else {
            self.content.toggle(200, function(){
                //editor.drawLines();
            });
        }
    });

    self.content = $('<div class="entityContent">');

    //this.refreshContent();

    div.append(head);
    div.append(self.content);

    div.css('position', 'absolute');
    self.data.edit_y = 300;
    self.data.edit_x = 300;
    div.offset({top: self.data.edit_y, left: self.data.edit_x});

    self.div = div;

    editor.editDiv.append(div);

    return self;
}
