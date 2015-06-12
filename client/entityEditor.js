function EntityEditor(editor, data) {
    var self = Box(editor, data.name, data);
    self.type = "Entity";
    
    return self;
}
