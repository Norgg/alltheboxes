var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , util = require('util')
  , static = require('node-static')
  , MongoClient = require('mongodb').MongoClient
  , MongoServer = require('mongodb').Server

  , Player = require('./player').Player
  , World = require('./world').World

var webroot = './static';

var mongodb, world;

new MongoClient(new MongoServer('localhost', 27017)).open(function(err, mongo) {
  mongodb = mongo.db('alltheboxes');
  mongodb.collection('rooms', function(err, rooms) {
    if(err) {
      console.log(err);
    } else {
      world = new World(rooms);
      app.listen(8080);
      console.log("Started.");
    }
  });
});


var file = new(static.Server)('./static', {
  cache: 600,
  headers: { 'X-Powered-By': 'node-static' } 
});

function handler (req, res) {
  file.serve(req, res, function(err, result) {
    if (err) {
      console.error('Error serving %s - %s', req.url, err.message);
      res.writeHead(err.status, err.headers);
      res.end();
    } else {
      console.log('%s - %s', req.url, res.message); 
    } 
  });
}


io.sockets.on('connection', function (socket) {
  new Player(socket, io, mongodb, world);
  //console.log(players);
});
