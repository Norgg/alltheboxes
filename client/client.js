var Client = function() {
    var self = {};
    
    self.connected = false;

    var url = 'ws://'+location.hostname+(location.port ? ':'+location.port: '') + '/ws';
    self.socket = new WebSocket(url);

    self.socket.onopen = function(evt) { self.onConnect(evt); };
    self.socket.onclose = function(evt) { self.onDisconnect(evt); }
    self.socket.onmessage = function(evt) { self.onMessage(evt); }

    self.bufSize = 1000000;

    self.cmdMode = false;

    self.input = $('#input');
    self.output = $('#output');
    self.contents = $('#contents');
    self.input.keyup(function(evt) {self.keyup(evt);});
    self.input.keydown(function(evt) {self.keydown(evt);});

    self.maxHistory = 500;
    self.history = [];
    self.historyIdx = 0;
    self.originalInput = "";
    self.reconnect = true;

    $(window).resize(function(evt) {self.resize();});
    $(window).focus(function(evt) {document.title="alltheboxes";});

    $(self.input).blur(function(evt) {
        function refocus() {
            if (!window.getSelection().toString().length && !$('#styleSwap').is(':focus')) {
                self.input.focus();
            } else { 
                setTimeout(refocus, 100);
            }
        };
        setTimeout(refocus, 100);
    });

    $('#styleSwap').on('change', function(evt) {
        $('#style')[0].href=self.value;
    });

    $(window).on('copy', function(evt) {setTimeout(function() {self.input.focus();}, 100);});

    if (!window.localStorage.log) window.localStorage.log = "";

    $(window).on('unload', function(evt) { 
        self.addOutput([{ text: "Goodbye at " + new Date().toUTCString(), tags: ["goodbye"]}]);
    });


    self.addOutput = function(lines) {
        var wrapDiv = $('<div class="outputWrap"></div>');
        $.each(lines, function(idx, line) {
            console.log(lines);
            var div = $('<div></div>');
            div.addClass('output');
            if (line.tags) {
                $.each(line.tags, function(tagIdx, tag) {
                    div.addClass(tag);
                });
            }

            div.html(escapeHTML(line.text));
            wrapDiv.append(div);
        });

        self.output.append(wrapDiv);

        var text = self.output.text();

        // TODO: Does self.text() rip out formatting? This probably rips out formatting...
        if (text.length > self.bufSize) self.output.text(text.slice(-self.bufSize));
        window.localStorage.log = self.output.html();

        self.output.animate({scrollTop: self.output[0].scrollHeight}, 50);
        self.resize();
        self.output.linkify();

        if (!document.hasFocus()) document.title = "*alltheboxes";
    };

    self.resize = function() {
        var maxHeight = $(window).height() - self.input.height() - self.contents.height();
        self.output.height('auto');
        if (self.output.height() > maxHeight) {
            self.output.height(maxHeight);
            self.output.animate({scrollTop: self.output[0].scrollHeight}, 10);
        }
    };

    self.keyup = function(evt) {
        var inputText = self.input.val();
        if (inputText[0] == "/") {
            self.input.addClass("cmd");
        } else {
            self.input.removeClass("cmd");
        }
    };

    self.setToken = function(data) {
        //console.log("Storing room: " + data);
        $.cookie('token', data);
    };

    self.setContents = function(data) {
        console.log("Setting contents");
        self.contents.empty();
        $.each(data, function(idx, elem) {
            var li = $('<li>');
            li.text(elem.name);
            li.attr('title', elem.description);
            self.contents.append(li);
        });
    };

    self.onConnect = function(evt) {
        //TODO: Move self onto the server and have it save and replay recent history per location if there's an item there recording it.
        self.output.html(window.localStorage.log.slice(-self.bufSize));
        self.addOutput([{text: "Logging in at " + new Date().toUTCString()}]);

        self.connected = true;

        if ($.cookie('token')) {
            self.emit({'login_token': $.cookie('token')});
        } else {
            self.emit({'guest': true});
        }
    };

    self.emit = function(obj) {
        self.socket.send(JSON.stringify(obj));
    };

    self.onDisconnect = function(evt) {
        self = self;
        self.setContents([]);
        if (self.connected) {
            if (self.reconnect) {
                self.addOutput([{text: "Disconnected at " + new Date().toUTCString() + ", attempting to reconnect...\n"}]);
            } else {
                self.addOutput([{text: "Disconnected at " + new Date().toUTCString() + ".\n"}]);
            }
        }
        self.connected = false;

        if (self.reconnect) {
            setTimeout(function() {
                console.log("Trying to reconnect.");
                var url = 'ws://'+location.hostname+(location.port ? ':'+location.port: '') + '/ws';
                self.socket = new WebSocket(url);

                self.socket.onopen = function(evt) { self.onConnect(evt); };
                self.socket.onclose = function(evt) { self.onDisconnect(evt); }
                self.socket.onmessage = function(evt) { self.onMessage(evt); }
            }, 1000);
        }
    };

    self.setStyles = function(styles) {
        var styleSwap = $('#styleSwap');
        styleSwap.empty();
        $.each(styles, function(i, style) {
          console.log(style);
          var option = $('<option>');
          option.val('/styles/' + style);
          option.text(style);
          styleSwap.append(option);
        });
    };

    self.onMessage = function(evt) {
        console.log(evt);
        var msg = JSON.parse(evt.data);
        
        if (msg.contents) self.setContents(msg.contents);
        if (msg.output) self.addOutput(msg.output);
        if (msg.refresh) window.location.reload(true);
        if (msg.token) self.setToken(msg.token);
        if (msg.styles) self.setStyles(msg.styles);
        if (msg.disconnect) {
            self.reconnect = false;
            self.socket.close();
        }
    };

    self.keydown = function(evt) {
        var inputText = self.input.val();
        if (evt.keyCode == 13) { //return
            evt.preventDefault();
            if (!inputText) return;

            if (inputText != self.history[0]) {
                self.history.unshift(inputText);
                while (self.history.length > self.maxHistory) {
                    self.history.pop();
                }
            }

            if (inputText[0] == "/") {
                inputText = inputText.slice(1);
                self.emit({'cmd': inputText});
                self.input.val("/");
            } else {
                self.emit({'chat': inputText});
                self.input.val("");
            }

            self.historyIdx = -1;
            return false;
        } else if (evt.keyCode == 9) { //tab
            evt.preventDefault();

            if (inputText[0] == "/") {
                inputText = inputText.slice(1);
                self.input.addClass("cmd");
            } else {
                inputText = "/" + inputText;
                self.input.removeClass("cmd");
            }

            self.input.val(inputText);

            return false;
        } else if (evt.keyCode == 38) { //up arrow
            if (self.historyIdx == -1) self.originalInput = inputText;
            self.historyIdx++;
            if (self.history[self.historyIdx] != undefined) {
                evt.preventDefault();
                self.input.val(self.history[self.historyIdx]);
            } else {
                self.historyIdx--;
            }
        } else if (evt.keyCode == 40) { //down arrow
            self.historyIdx--;
            if (self.history[self.historyIdx]) {
                evt.preventDefault();
                self.input.val(self.history[self.historyIdx]);
            } else {
                self.input.val(self.originalInput);
                self.historyIdx = -1;
            }
        }
    };
    self.resize();
    return self;
};
