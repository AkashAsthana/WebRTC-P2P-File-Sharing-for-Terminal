/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* eslint-disable no-undef */
const http = require("http").createServer();
const io = require("socket.io")(http);
const port = process.env.PORT || 5000;
var uniqid = require("uniqid");
var rooms = [{}];

io.on("connection",(socket)=>{
	console.log("connected");

	socket.on("message",(message)=>{
		console.log("Message to server",message);
		io.sockets.to(roomID).emit("message",message);
	});

	socket.on("initializeWriter",(obj)=>{
		var roomID = obj.roomID;
		var fileName = obj.fileName;
		rooms[roomID].reciever.socket.emit("initializeWriter",fileName);
	});

	socket.on("error",(data)=>{
		console.log("Error in the server ",data);
	});

	socket.on("candidate",(data)=>{
		var roomID = data.roomID;
		if(data.type === "r"){
			console.log("Was the reciever and found the candidates");
			rooms[roomID].sender.socket.emit("recieveCandidate",data);
		}else{
			console.log("Was the sender and found the candidates");
			rooms[roomID].reciever.socket.emit("recieveCandidate",data);
		}
	});
	socket.on("sendingOffer",(data)=>{
		var roomID = data.roomID;
		console.log("sendingOffer");
		rooms[roomID].reciever.socket.emit("recieveOffer",data.offer);
	});

	socket.on("sendingAnswer",(data)=>{
		var roomID = data.roomID;
		console.log("snedingAnswer");
		rooms[roomID].sender.socket.emit("recieveAnswer",data.answer);
	});
	socket.on("startREPL",(roomID)=>{
		io.sockets.to(roomID).emit("start",true);
	});

	socket.on("login",(user)=>{
		var roomID = user.roomID;
		console.log(user);
		if(user.type == "r"){
			socket.join(user.roomID);
			rooms[roomID].reciever = {};
			// rooms[roomID].reciever.name = user.name;
			rooms[roomID].reciever.socket = socket;
			rooms[roomID].full = true;
		}else{
			var roomID = uniqid();
			socket.join(roomID);
			rooms[roomID] = new Object();
			rooms[roomID].sender = {};
			rooms[roomID].full = false;
			rooms[roomID].sender.roomID = roomID;
			// rooms[roomID].sender.name = user.name;
			rooms[roomID].sender.socket = socket;
			socket.emit("message",`The key for this transfer session is : ${roomID}`);
			rooms[roomID].sender.socket.emit("setRoom",roomID);
		}

		if(rooms[roomID].full == true){
			rooms[roomID].sender.socket.emit("candidates",true);
			rooms[roomID].reciever.socket.emit("candidates",true);
			rooms[roomID].sender.socket.emit("sendOffer",null);
		}

	});

});


io.on("disconnect", (event) => {
	console.log("Disconnected");
});

http.listen(port, () => console.log(`Server running on port: ${port}`));

