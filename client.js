/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
var socket = require("socket.io-client")("http://localhost:5000");
var wrtc = require("wrtc");
var fs = require("fs");

var user = {};
var reader,writer;
var localConnection;
var readerDataChannel;
var roomID;

user.type = process.argv[2];   // r = reciever and s = sender

if(user.type == "r"){
	user.roomID = process.argv[3];
	roomID = process.argv[3];
}else{
	user.fileName = process.argv[3];
}


socket.emit("login",user);

socket.on("terminate",()=>{
	process.exit(0);
});
socket.on("message",(message)=>{
	console.log(message);
});
socket.on("setRoom",(ID)=>{
	roomID = ID;
});
socket.on("initializeWriter",(fileName)=>{
	writer = fs.createWriteStream(`recieved-${fileName}`);
});
socket.on("error", (err) => {
	console.log("Error on the client ",err);
});
socket.on("recieveCandidate",(data)=>{
	recieveIceCandidates(data.candidate);
});
socket.on("candidates",(bool)=> {
	console.log("Candidate");
	var configuration = { 
		"iceServers": [{ "urls": "stun:stun2.1.google.com:19302" }] 
	}; 
   
	localConnection = new wrtc.RTCPeerConnection(configuration); 

	localConnection.onicecandidate = function (event) { 
		if (event.candidate) { 
			console.log("ICE Candidate found");
			socket.emit("candidate",{ 
				type: user.type, 
				candidate: event.candidate,
				roomID : roomID
			}); 
		} 
	}; 

	localConnection.onerror = function(err){
		console.log(`Error occured ${err}`);
		console.log(`Connection state : ${localConnection.connectionState}`);
	};

	localConnection.ondatachannel = function(event) {
		var writerDataChannel = event.channel;

		writerDataChannel.onbufferedamountlow = function(event){
			console.log("BUFFERED AMOUNT LOW !!\n",event);
		};

		writerDataChannel.onmessage = function(event) {
			writer.write(Buffer.from(event.data)); 
		};     


		writerDataChannel.onopen = function(event){
			console.log("Data Channel 2 is opened");
		};

		writerDataChannel.onclose = function(event){
			console.log(`Data Channel 2 closed : ${localConnection.connectionState}`);
			console.log("TRANSFER FINISHED!");
			process.exit(0);
		};
		writerDataChannel.onconnectionstatechange = function(event){
			console.log(`Connection's state changed to : ${localConnection.connectionState}`);
		};

		writerDataChannel.onerror = function(event){
			console.log("Error : ",event);
		};

        
	};
	const dataChannelConfig = {
		ordered: true, // order of data send is important
		binaryType:"arraybuffer",
	};
   
   
	readerDataChannel = localConnection.createDataChannel("FileTransferChannel", dataChannelConfig); 

	readerDataChannel.bufferedAmountLowThreshold = 65536; // 64kb

	readerDataChannel.onbufferedamountlow = function(){
		console.log("BUFFER AMOUNT LOW!!");
	};

	readerDataChannel.onopen = function(event){
		console.log(`Data Channel 1 is opened ${localConnection.connectionState}`);
		if(user.type == "s"){
			var obj = new Object();
			obj.roomID = roomID;
			obj.fileName = user.fileName;
			socket.emit("initializeWriter",obj);
			try{
				reader = fs.createReadStream(user.fileName);
			}catch(error){
				console.log("Some problem occured, try again");
				process.exit(0);
			}
		}
		
		setTimeout(function(){
			// if this is the sender
			if(user.type == "s"){

				reader.on("data",function(chunk){

					if(readerDataChannel.bufferedAmount < readerDataChannel.bufferedAmountLowThreshold){
						// console.log("Low ",readerDataChannel.bufferedAmount);
					}else{
						reader.pause();
						// console.log("High ",readerDataChannel.bufferedAmount);
						setTimeout(function(){
							reader.resume();
						},100);
                  
					}
               
					readerDataChannel.send(chunk);
				});
            
				reader.on("close",function(){
					console.log("TRANSFER FINISHED");
					readerDataChannel.close();
					setTimeout(()=>{
						process.exit(0);
					},1000);
				});
			}
		},3000);  //3 second timeout before starting the transfer
	};

	readerDataChannel.onerror = function (error) { 
		console.log(`Error occured on Data Channel 1: ${error}`); 
	}; 
   
	readerDataChannel.onmessage = function (event) { 
		console.log(`Message on Data Channel 1 : ${event}`);
	}; 
   
	readerDataChannel.onclose = function () { 
		console.log(`Data Channel 1 is closed ${localConnection.connectionState}`); 
	};

	readerDataChannel.onconnectionstatechange = function(){
		console.log(`Data Channel 1 connection state changed to ${localConnection.connectionState}`);
	};
   
  
});

socket.on("sendOffer",(data)=>{
	if(user.type === "s"){
		localConnection.createOffer().then(function(offer){
			return localConnection.setLocalDescription(offer);
		})
			.then(function(){
			// console.log("Second then");
				var data = {};
				data.offer = localConnection.localDescription;
				data.roomID = roomID;
				socket.emit("sendingOffer",data);
			})
			.catch(function(reason){
				console.log("Error occured : ",reason);
			});
	}
});

socket.on("recieveOffer",(offer)=>{
	recieveOffer(offer);
  
});

socket.on("recieveAnswer",(answer)=>{
	recieveAnswer(answer);
});

socket.on("connect",()=>{
	console.log("youre connected");
});


function recieveIceCandidates(candidate) { 
	localConnection.addIceCandidate(new wrtc.RTCIceCandidate(candidate)); 
}


//recieving the offer from the remote connection
function recieveOffer(offer, name) { 
	console.log("recieved offer");
	connectedUser = name; 
	localConnection.setRemoteDescription(new wrtc.RTCSessionDescription(offer)); 
	
	localConnection.createAnswer().then(function(answer){
		return localConnection.setLocalDescription(answer);
	})
		.then(function(){
			var data = {};
			data.roomID = roomID;
			data.answer = localConnection.localDescription;
			socket.emit("sendingAnswer",data);
		})
		.catch(function(error){
			console.log("Error in answer : ",error);
		});
	
}

 
//recieving the answer from the remote connection
function recieveAnswer(answer) { 
	console.log("recieved answer");
	localConnection.setRemoteDescription(new wrtc.RTCSessionDescription(answer)); 
}
