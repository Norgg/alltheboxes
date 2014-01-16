var ClientMethods = {
  output: function(data) {
    //console.log(data);
    this.content.append(escapeHTML(data)+"\n");
    
    var text = this.content.text();
    if (text.length > this.bufSize) this.content.text(text.slice(-this.bufSize));
    
    this.content.animate({scrollTop: this.content[0].scrollHeight}, 50);
  },

  resize: function() {
    this.content.css('width', '100%');
    this.content.height($('body').height() - $('#input').height() - 2);
  },

  keyup: function(evt) {
    var inputText = this.input.val();
    if (inputText[0] == "/") {
      this.input.addClass("cmd");
    } else {
      this.input.removeClass("cmd");
    }
  },

  setName: function(data) {
    console.log("Storing name: " + data);
    $.cookie('name', data);
  },

  setRoom: function(data) {
    console.log("Storing room: " + data);
    $.cookie('room', data);
  },

  onConnect: function(evt) {
    console.log("Connected");
    if ($.cookie('name')) {
      this.socket.emit('cmd', 'name ' + $.cookie('name'));
    }
    if ($.cookie('room')) {
      this.socket.emit('cmd', 'go ' + $.cookie('room'));
    } else {
      this.socket.emit('cmd', 'go home');
    }
  },

  keydown: function(evt) {
    var inputText = this.input.val();
    if (evt.keyCode == 13) {
      evt.preventDefault();
      if (!this.input.val()) return;

      if (inputText[0] == "/") {
        inputText = inputText.slice(1);
        this.socket.emit('cmd', inputText);
      } else {
        this.socket.emit('chat', inputText);
      }

      this.input.val("");
      return false;
    } else if (evt.keyCode == 9) {
      evt.preventDefault();
      
      if (inputText[0] == "/") {
        inputText = inputText.slice(1);
        this.input.addClass("cmd");
      } else {
        inputText = "/" + inputText;
        this.input.removeClass("cmd");
      }

      this.input.val(inputText);

      return false;
    }
  },
};

var Client = function() {
  var self=this;
  
  var url = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
  this.socket = io.connect(url);
  this.socket.on('output', function (data) { self.output(data); });
  this.socket.on('name', function(data) { self.setName(data); });
  this.socket.on('room', function(data) { self.setRoom(data); });
  this.socket.on('connect', function(evt) { self.onConnect(evt); });

  this.bufSize = 1000000;

  this.cmdMode = false;
  
  this.input = $('#input');
  this.content = $('#content');
  this.resize();
  this.input.keyup(function(evt) {self.keyup(evt);});
  this.input.keydown(function(evt) {self.keydown(evt);});

  $(window).resize(function(evt) {self.resize();});
};

Client.prototype = ClientMethods;
