var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var users = {}; // maintain online users


app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));

mongoose.connect('mongodb://localhost/chatroom', function(err) { // connect to mongodb
    if (err) {
        console.log('error occurs: ' + err);
    } else {
        console.log('Conneced to mongodb');
    }
});

var schema = mongoose.Schema({ // define schema
    timestamp: String,
    user: String,
    message: String,
});

var message = mongoose.model('Message', schema); // bind to model

io.on('connection', function(socket){
    socket.on('login', function(username, callback) { // login to chatroom
        if (username in users) { // check whether user online online
            callback(false);
        } else {
            socket.username = username;
            socket.broadcast.emit('enter', socket.username); //broadcast username when enterring
            users[socket.username] = socket; // set user online
            callback(true);
        }
    });

    socket.on('disconnect', function() {
        socket.broadcast.emit('leave', socket.username); //broadcast username when leaving
        delete users[socket.username]; // set user offline
    });

    socket.on('post', function(msg) {
        var newMsg = new message({ // create new message
            timestamp: new Date().toLocaleString(),
            user: socket.username,
            message: msg.trim()
        });
        newMsg.save(function(err) {
            if (err) {
                console.log('error occurs: ' + err);
                return;
            } else {
                io.sockets.emit('new message', {
                    timestamp: new Date().toLocaleString(),
                    user: socket.username,
                    message: msg.trim()
                });
            }
        });
    });

    message.find({}, function(err, history) { // load history messages
        if (err) {
            console.log('error occurs: ' + err);
            return;
        } else {
            console.log('loading chat histories');
            socket.emit('chat history', history); // retrieve char histories
        }
    });
});

http.listen(3000, function(){ //listen on port 3000
  console.log('listening on *:3000');
});
