var ClientMethods = {
  addOutput: function(data) {
    console.log(data);
    if (data.text) {
      this.output.append(escapeHTML(data.text)+"\n");
    };

    if (data.contents) {
      this.setContents(data.contents);
    }
    
    var text = this.output.text();
    if (text.length > this.bufSize) this.output.text(text.slice(-this.bufSize));
    
    this.output.animate({scrollTop: this.output[0].scrollHeight}, 50);
    
    var maxHeight = $(window).height() - this.input.height() - this.contents.height();
    if (this.output.height() > maxHeight) {
      this.output.height(maxHeight);
    }

    this.output.linkify();

    if (!document.hasFocus()) document.title = "*alltheboxes";
  },

  resize: function() {
    var maxHeight = $(window).height() - this.input.height() - this.contents.height();
    if (this.output.height() > maxHeight) {
      this.output.height(maxHeight);
    }
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
    //console.log("Storing name: " + data);
    $.cookie('name', data);
  },

  setRoom: function(data) {
    //console.log("Storing room: " + data);
    $.cookie('room', data);
  },

  setContents: function(data) {
    var self = this;
    this.contents.empty();
    $.each(data, function(idx, elem) {
      var li = $('<li>');
      li.text(elem.name);
      li.attr('title', elem.description);
      self.contents.append(li);
    });
  },

  onConnect: function(evt) {
    //console.log("Connected");
    if ($.cookie('name')) {
      this.socket.emit('cmd', 'name ' + $.cookie('name'));
    }
    if ($.cookie('room')) {
      this.socket.emit('cmd', 'join ' + $.cookie('room'));
    } else {
      this.socket.emit('cmd', 'join home');
    }
  },

  keydown: function(evt) {
    var inputText = this.input.val();
    if (evt.keyCode == 13) { //return
      evt.preventDefault();
      if (!inputText) return;

      if (inputText != this.history[0]) {
        this.history.unshift(inputText);
        while (this.history.length > this.maxHistory) {
          this.history.pop();
        }
      }

      if (inputText[0] == "/") {
        inputText = inputText.slice(1);
        this.socket.emit('cmd', inputText);
      } else {
        this.socket.emit('chat', inputText);
      }

      this.input.val("");
      this.historyIdx = -1;
      return false;
    } else if (evt.keyCode == 9) { //tab
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
    } else if (evt.keyCode == 38) { //up arrow
      if (this.historyIdx == -1) this.originalInput = inputText;
      this.historyIdx++;
      if (this.history[this.historyIdx] != undefined) {
        evt.preventDefault();
        this.input.val(this.history[this.historyIdx]);
      } else {
        this.historyIdx--;
      }
    } else if (evt.keyCode == 40) { //down arrow
      this.historyIdx--;
      if (this.history[this.historyIdx]) {
        evt.preventDefault();
        this.input.val(this.history[this.historyIdx]);
      } else {
        this.input.val(this.originalInput);
        this.historyIdx = -1;
      }
    }
  },
};

var Client = function() {
  var self=this;
  
  var url;
  if (window.url) url = window.url;
  else url = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
  this.socket = io.connect(url);
  this.socket.on('output', function (data) { self.addOutput(data); });
  this.socket.on('name', function(data) { self.setName(data); });
  this.socket.on('room', function(data) { self.setRoom(data); });
  //this.socket.on('contents', function(data) { self.setContents(data); });
  this.socket.on('connect', function(evt) { self.onConnect(evt); });
  this.socket.on('reconnect', function(evt) { self.onConnect(evt); });

  this.bufSize = 1000000;

  this.cmdMode = false;
  
  this.input = $('#input');
  this.output = $('#output');
  this.contents = $('#contents');
  this.resize();
  this.input.keyup(function(evt) {self.keyup(evt);});
  this.input.keydown(function(evt) {self.keydown(evt);});

  this.maxHistory = 500;
  this.history = [];
  this.historyIdx = 0;
  this.originalInput = "";

  $(window).resize(function(evt) {self.resize();});
  $(window).focus(function(evt) {document.title="alltheboxes";});

  $(this.input).blur(function(evt) {
    function refocus() {if (!window.getSelection().toString().length) self.input.focus(); else setTimeout(refocus, 100)};
    setTimeout(refocus, 100);
  });

  $(window).bind('copy', function(evt) {self.input.focus();});
};

Client.prototype = ClientMethods;
