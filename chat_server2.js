// Require the packages we will use:
var http = require("http"),
socketio = require("socket.io"),
fs = require("fs");

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
// This callback runs when a new connection is made to our HTTP server.
    fs.readFile("client-test2.html", function(err, data){
// This callback runs when the chat.html file has been read from the filesystem.
    if(err) return resp.writeHead(500);
    resp.writeHead(200);
    resp.end(data);
    });
});
app.listen(3456);
var usernames ={};
var rooms ={};
var rooms2 ={};
var prooms ={};
var owner ={}; //owner{room:username}
var blacklist ={}; //blacklist{room: username}
var passwords =[];
// var pm_users =[];
// var pm_messages = [];
// Do the Socket.IO magic:

var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
// This callback runs when a new Socket.IO connection is established.
// when the client emits 'adduser', this listens and executes
    socket.on('adduser', function(username){
        socket.username = username;
        usernames[username] = username;
        io.sockets.connected[username] = socket.id;
        socket.room = 'lobby';
        rooms2[username] = socket.room
        socket.join('lobby');
        console.log("new user: "+socket.username);
        io.sockets.emit("currentUsers",usernames);
        socket.emit("currentRooms",'lobby');
        socket.emit("message_to_client",{message: "Welcome" + " " + socket.username });
    });

    socket.on('create', function(newroom) {
        socket.leave(socket.room);
        socket.join(newroom);
        socket.room = newroom;
        rooms[newroom] = newroom;
        rooms2[socket.username] = socket.room;
        owner[socket.room] = socket.username;
        io.sockets.emit("displayRooms",rooms);
        socket.emit("currentRooms",newroom);
        io.sockets.emit('alert_join', {message: socket.username +" has joined"+ " " +newroom});
    });

    socket.on('create2', function(newroom) {
        if (socket.username === blacklist[newroom]) {
            io.to(io.sockets.connected[socket.username]).emit("message_to_client",{message: "you have been banned from room "+newroom});
        }else{
        socket.leave(socket.room);
        socket.join(newroom);
        socket.room = newroom;
        rooms[newroom] = newroom;
        rooms2[socket.username] = socket.room;
        io.sockets.emit("displayRooms",rooms);
        socket.emit("currentRooms",newroom);
        io.sockets.emit('alert_join', {message: socket.username +" has joined"+ " " +newroom});
        }
    });

    socket.on('pm', function(proom, password) {
        socket.leave(socket.room);
        p =password;
        socket.password = password;
        socket.join(proom);
        socket.room = proom;
        prooms[proom] = proom;
        rooms2[socket.username] = socket.room
        owner[socket.room] = socket.username;
        passwords.push(password); 
        io.sockets.emit("privateRoomsAval",prooms);
        socket.emit("currentRooms",proom);
        io.sockets.emit('alert_join', {message: socket.username +" has created"+ " " +proom});
    });

    socket.on('pm2', function(proom, password2) {
        if (socket.username === blacklist[proom]) {
            io.to(io.sockets.connected[socket.username]).emit("message_to_client",{message: "you have been banned from room "+proom});
        }else{
            for (var i =0; i<passwords.length; i++){
            if((passwords[i] === password2)){
                socket.leave(socket.room);
                socket.join(proom);
                socket.room = proom;
                prooms[proom] = proom;
                rooms2[socket.username] = socket.room
                socket.emit("currentRooms",proom);
                io.sockets.emit('alert_join', {message: socket.username +" has joined"+ " " +proom});
            }else{
                socket.emit("message_to_client",{message: "When trying to access" + " " + "<"+proom+">" + " "+ "you put in the wrong password! Try Again!"});
            }
            }
        }
    });


    socket.on('whisp', function(userw, messw){
        if(rooms2[socket.username] === rooms2[userw]){
            socket.emit("message_to_client",{message: "whisper sent to" + " " + userw + " " + ":" + " " +"<"+messw+">"});
            io.to(io.sockets.connected[userw]).emit("message_to_client",{message: socket.username + " " + "whispers" + " " + messw}) 
        }else{
        // socket.emit("message_to_client",{message: userw + " " + "is not in your room"});
            }
    });

    socket.on('kick_temp',function(user_kick){
    // console.log("current username: "+socket.username);
    // console.log("creator username: "+owner[socket.room]);
    // console.log("this user's room:"+ rooms2[user_kick]);
    // console.log("this room is: "+socket.room);
    if (socket.username !== owner[socket.room]) {
        //socketio.emit('', prompt("Permission Denied"));
        socket.emit("message_to_client",{message: "Only room Admins can kick users"});
        console.log("you are not the creator");
    }else if (rooms2[user_kick] !== socket.room) {
    //user not in the room
        console.log("user " + user_kick + " is not in this room");
        socket.emit("message_to_client",{message: user_kick + " " + "is not in your room"});
    }else{
        io.sockets.emit('Kick',user_kick);
        socket.emit("message_to_client",{message: user_kick + " "  + "Has been kicked"});
        io.to(io.sockets.connected[user_kick]).emit("message_to_client",{message: "you have been kicked and are now in the lobby"}) 
        io.to(io.sockets.connected[user_kick]).emit("currentRooms",'lobby');
    }
    });

    socket.on('KickReal', function() {
    // io.sockets.connected[user_kick].disconnect();
    //console.log("kick succ");
        socket.leave(socket.room);
        socket.room = 'lobby';
        rooms2[socket.username] = socket.room;
        socket.join('lobby');
    });

    socket.on('kickPerm',function(usr_to_kick){
	console.log("current username: "+socket.username);
	console.log("creator username: "+owner[socket.room]);
	console.log("this user's room:"+ rooms2[usr_to_kick]);
	console.log("this room is: "+socket.room);
	
	if (socket.username !== owner[socket.room]) {
		//socketio.emit('', prompt("Permission Denied"));
		console.log("you are not the creator");
		//socket.emit("message_to_client",{message: +"Permission Denied"});
	}else if (rooms2[usr_to_kick] !== socket.room) {
		//user not in the room
		console.log("user " + usr_to_kick + " is not in this room");
		//socket.emit("message_to_client",{message: userw + " " + "is not in your room"});
	}else{
	io.sockets.emit('KickP',usr_to_kick);
        socket.emit("message_to_client",{message: usr_to_kick + " "  + "Has been kicked perminantly"});
        io.to(io.sockets.connected[usr_to_kick]).emit("message_to_client",{message: "you have been banned and are now in the lobby"}) 
        io.to(io.sockets.connected[usr_to_kick]).emit("currentRooms",'lobby');
	//console.log("1");
	}
    });

//real kick out to lobby and put it in a blacklist.
    socket.on('KickRealP', function() {
	blacklist[socket.room] = socket.username;
	console.log("user "+socket.username+" has been kicked out perminantly from " + socket.room);
	socket.leave(socket.room);
	socket.room = 'lobby';
	rooms2[socket.username] = socket.room;
	socket.join('lobby');
    });

    socket.on('message_to_server', function(data) {
        // This callback runs when the server receives a new message from the client.
        console.log(socket.username +" " + ":" + " " +data["message"]); // log it to the Node.JS output
        io.sockets.to(socket.room).emit("message_to_client",{message: "<"+socket.room+">" + " " + socket.username + ":" + " " + " "+ data["message"] }) // broadcast the message to other users
    });

    socket.on('disconnect', function(){
        delete usernames[socket.username];
        io.sockets.emit("currentUsers",usernames);
        // io.sockets.emit('message_to_client', {message: socket.username +" "+ 'has disconnected'});
        console.log(socket.username + " " + "has left");
    });
});