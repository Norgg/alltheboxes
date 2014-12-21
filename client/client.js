var ClientMethods = {
    addOutput: function(data) {
        console.log(data);
        var msg = "";

        if (data.user) {
            msg = '<span class="name">'+escapeHTML(data.user)+"</span>: ";
        }
        if (data.header) {
            msg = '<span class="header">'+escapeHTML(data.header)+"</span>\n";
        }
        if (data.contents) {
            this.setContents(data.contents);
        }

        if (data.text) {
            console.log(data.text);
            msg += escapeHTML(data.text)+"\n";
            this.output.append(msg);

            var text = this.output.text();
            if (text.length > this.bufSize) this.output.text(text.slice(-this.bufSize));
            window.localStorage.log = this.output.html();

            this.output.animate({scrollTop: this.output[0].scrollHeight}, 50);

            this.resize();

            this.output.linkify();
        }

        if (!document.hasFocus()) document.title = "*alltheboxes";
    },

    resize: function() {
        var maxHeight = $(window).height() - this.input.height() - this.contents.height();
        this.output.height('auto');
        if (this.output.height() > maxHeight) {
            this.output.height(maxHeight);
            this.output.animate({scrollTop: this.output[0].scrollHeight}, 10);
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

    setToken: function(data) {
        //console.log("Storing room: " + data);
        $.cookie('token', data);
    },

    setContents: function(data) {
        console.log("Setting contents");
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
        //TODO: Move this onto the server and have it save and replay recent history per location if there's an item there recording it.
        this.output.html(window.localStorage.log.slice(-this.bufSize));
        this.addOutput({text: "Logging in at " + new Date().toUTCString()});

        this.connected = true;

        if ($.cookie('token')) {
            this.emit({'login_token': $.cookie('token')});
        } else {
            this.emit({'guest': true});
        }
    },

    emit: function(obj) {
        this.socket.send(JSON.stringify(obj));
    },

    onDisconnect: function(evt) {
        self = this;
        this.setContents([]);
        if (this.connected) {
            this.addOutput({ text: "Disconnected at " + new Date().toUTCString() + ", attempting to reconnect...\n" });
        }
        this.connected = false;

        setTimeout(function() {
            console.log("Trying to reconnect.");
            var url = 'ws://'+location.hostname+(location.port ? ':'+location.port: '') + '/ws';
            self.socket = new WebSocket(url);
            
            self.socket.onopen = function(evt) { self.onConnect(evt); };
            self.socket.onclose = function(evt) { self.onDisconnect(evt); }
            self.socket.onmessage = function(evt) { self.onMessage(evt); }
        }, 1000);
    },

    onMessage: function(evt) {
        console.log(evt);
        var msg = JSON.parse(evt.data);

        if (msg.output) this.addOutput(msg.output);
        if (msg.refresh) window.location.reload(true);
        if (msg.token) this.setToken(msg.token)
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
                this.emit({'cmd': inputText});
                this.input.val("/");
            } else {
                this.emit({'chat': inputText});
                this.input.val("");
            }

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
    
    this.connected = false;

    var url = 'ws://'+location.hostname+(location.port ? ':'+location.port: '') + '/ws';
    this.socket = new WebSocket(url);

    this.socket.onopen = function(evt) { self.onConnect(evt); };
    this.socket.onclose = function(evt) { self.onDisconnect(evt); }
    this.socket.onmessage = function(evt) { self.onMessage(evt); }

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

    $(window).on('copy', function(evt) {setTimeout(function() {self.input.focus();}, 100);});

    if (!window.localStorage.log) window.localStorage.log = "";

    $(window).on('unload', function(evt) { window.localStorage.log += "Goodbye at " + new Date().toUTCString() + "\n\n"; });
};

Client.prototype = ClientMethods;
