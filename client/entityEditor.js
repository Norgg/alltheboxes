function EntityEditor(editor, data) {
    var self = Box(editor, data.name, data);
    self.type = "Entity";

    self.refreshContent = function() {
        //TODO: Factor out general form stuff
        self.content.empty();
        var form = self.form();

        var table = $('<table>');
        table.append(self.row("id:", '<input readonly value="' + self.data.id + '">'));
        table.append(self.makeInput('name', self.data.name));
        table.append(self.makeTextarea('description', self.data.description));

        var saveButton = $('<input type="submit" class="save" value="save"/>');

        var destroyButton = $('<button class="destroy">destroy</button>');
        destroyButton.click(function(evt) {
            evt.preventDefault();
            if (confirm("Sure?")) self.editor.emit({'destroyEntity': self.data.id});
        });

        table.append(self.row(saveButton, destroyButton));

        form.append(table);
        self.content.append(form);
    };
    self.refreshContent();
    
    return self;
}
