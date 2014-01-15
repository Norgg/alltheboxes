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

  keydown: function(evt) {
    if (evt.keyCode == 13) {
      evt.preventDefault();
      if (!this.input.val()) return;

      if (this.cmdMode) {
        this.socket.emit('cmd', this.input.val());
      } else {
        this.socket.emit('chat', this.input.val());
      }
      this.input.val("");
      return false;
    } else if (evt.keyCode == 9) {
      evt.preventDefault();
      this.cmdMode =  !this.cmdMode;

      if (this.cmdMode) {
        this.input.addClass("cmd");
      } else {
        this.input.removeClass("cmd");
      }
      return false;
    }
  },
};

var Client = function() {
  var self=this;
  
  var url = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
  this.socket = io.connect(url);
  this.socket.on('output', function (data) { self.output(data); });

  this.bufSize = 1000000;

  this.cmdMode = false;
  
  this.input = $('#input');
  this.content = $('#content');
  this.resize();
  this.input.keydown(function(evt) {self.keydown(evt);});

  $(window).resize(function(evt) {self.resize();});
};

Client.prototype = ClientMethods;
