
//Set up a timer that intermittently sends a new update to anyone connected to the stream
var testingStream = true;
//Used when testing the key->server pipeline. Sends an updated list of all of the makeys
var testingKeys = false;
var isServer = false;
var serverAddress = "http://showshow.herokuapp.com";
// /mnt/c/Users/Michael/Dropbox/Apps/Heroku/showshow


/************************************
UUID Setup
*************************************/
//Synchronous file loading because we need to have the UUID before we really start doing anything else.
var fs = require('fs');
var uuid = "none loaded";
try {
	//Attempt to load UUID
	var data = fs.readFileSync(__dirname + '/uuid');
	uuid = data.toString();
	console.log("UUID " + uuid + " loaded from file.");
} catch (err) {
  //File containing UUID was not found. Generate it.
  console.log("No UUID file found. Attempting to create one.")
  	var uuidv4 = require('uuid/v4');
	uuid = uuidv4();
	console.log("New UUID: " + uuid);
    fs.writeFile(__dirname + "/uuid", uuid, function(err) {
	    if(err) {
	        return console.log(err);
	    }
	    console.log("UUID " + uuid + " saved!");
	}); 
}


/************************************
HTTP Server Creation
*************************************/
var http = require("http");
var express = require("express");
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
var expressWs = require('express-ws')(app);
var port = process.env.PORT || 5000;

app.get('/', function (req, res) {
	res.setHeader('Content-Type', 'application/json');
	//res.send(JSON.stringify(thisMakeyMakey,null,4));
	if(testingStream){
		for(var i = 0; i < numberOfInputs; i++){
			var newValue = Math.sin(process.uptime() + i/12*2*Math.PI) + 1;
			newValue = newValue/2;
			sharedInputs[i].cps = Math.floor(newValue * maxCPS);
		}
		res.send(JSON.stringify(sharedInputs,null,4));
	}
	else{
		var processedInputs = [];
		var index = 0;
		for(var key in sharedInputs){
			processedInputs[index] = {};
			processedInputs[index].cps = sharedInputs[key].cps;
			processedInputs[index].keys = sharedInputs[key].keys;
			index += 1;
		}
		res.send(JSON.stringify(processedInputs,null,4));
	}
});

app.ws('/', function(ws, req) {
  console.log('Socket connection opened');
});

//Used to clear out all of the currently stored Makey Makeys
app.get('/reset', function (req, res) {
	sharedInputs = [];
	res.send("ok");
});

//Used when testing the key->server pipeline. Sends an updated list of all of the makeys
app.get('/update', function (req, res) {
	broadcast();
	res.send("updated");
});

app.post('/updateMakey', function (req, res) {
	//broadcast();
	var makeyUUID = req.body.uuid;
	var makeyUpdate = {};
	makeyUpdate.cps = req.body.speed;
	makeyUpdate.keys = req.body.keys;
	console.log(makeyUpdate);      // your JSON
  	res.send(req.body.uuid);    // echo the result back

  	if(makeyUUID in sharedInputs){
  		console.log("Updating Makey Makey");
  		sharedInputs[makeyUUID] = makeyUpdate;
  	}
  	else{
  		console.log("Adding Makey Makey to list");
  		sharedInputs[makeyUUID] = makeyUpdate;
  	}

  	dirty = true;
});

console.log("http server listening on %d", port);
app.listen(port);


/************************************
Makey Makey Creation
*************************************/
var sharedInputs = [];
var dirty = false;
var numberOfInputs = 12;
var maxCPS = 30;

if(testingStream){
for(var i = 0; i < numberOfInputs; i++){
	sharedInputs[i] = new sharedMakey();
}
}
function sharedMakey(){
	this.keys = [];
	for(var i = 0; i < numberOfInputs; i++){
		this.keys[i] = 0;
	}
	this.cps = Math.sin(process.uptime());
}

/************************************
Socket Server Creation
*************************************/
// // Broadcast to all clients.
function SendUpdate(){
	if(isServer){
		console.log("Sending Update to Clients");
		//expressWs.getWss('/a')
		broadcast();
	}
	else{
		console.log("Sending Update to Server");
	}
}

function broadcast() {
	if(!testingStream){
		if(!dirty) return;
	}

	var processedInputs = [];

	//Send rolling test data
	if(testingStream){
    	for(var i = 0; i < numberOfInputs; i++){
			var newValue = Math.sin(process.uptime() + i/12*2*Math.PI) + 1;
			newValue = newValue/2;
			processedInputs[i] = {};
			processedInputs[i].cps = Math.floor(newValue * maxCPS);
		}
	}
	//Send real data
	else{
		var index = 0;
		for(var key in sharedInputs){
			processedInputs[index] = {};
			processedInputs[index].cps = sharedInputs[key].cps;
			processedInputs[index].keys = sharedInputs[key].keys;
			index += 1;
		}
	}

	console.log(processedInputs);
	// if(processedInputs){
	// 	console.log("Should send");
	// }
	// else{
	// 	console.log("Should not send");
	// }
	expressWs.getWss('/').clients.forEach(function each(client) {
		console.log("Sending to socket client");
		client.send(JSON.stringify(processedInputs,null,4));
	});

	dirty = false;
}


/************************************
Key Logging Scripts
*************************************/
// var datetime = require('node-datetime');
// var thisMakeyMakey;

// if(process.env.NODE_ENV != "production"){
// 	// Readline lets us tap into the process events
// 	const readline = require('readline');

// 	// Allows us to listen for events from stdin
// 	readline.emitKeypressEvents(process.stdin);

// 	// Raw mode gets rid of standard keypress events and other
// 	// functionality Node.js adds by default
// 	process.stdin.setRawMode(true);


// 	// Start the keypress listener for the process
// 	process.stdin.on('keypress', function(str, key){

// 	    // "Raw" mode so we must do our own kill switch
// 	    if(key.sequence === '\u0003') {
// 	        process.exit();
// 	    }

// 	    // User has triggered a keypress, now do whatever we want!
// 	    // ...
// 	    var keyCode = key.name.charCodeAt(0)

// 	    //If a key within the desired range was pressed
// 	    if(keyCode > 96 && keyCode < 115){
// 	    	console.log(keyCode - 97);
// 	    	thisMakeyMakey.keyPressed(keyCode - 97);

// 	    	//If we are just testing the key->server pipeline, tell the server that it needs to update the data
// 	    	if(testingKeys){
// 	    		console.log("testing keys");
// 		    	http.get(serverAddress + '/update', function(resp){
// 					let data = '';
					 
// 					// A chunk of data has been recieved.
// 					resp.on('data', function(chunk){
// 						data += chunk;
// 					});
					 
// 					// The whole response has been received. Print out the result.
// 					resp.on('end', function(){
// 						//console.log(JSON.parse(data).explanation);
// 					});
// 				}).on("error", function(err){
// 					console.log("Error: " + err.message);
// 				});
// 			}
// 	    }

// 	});

// 	//Create the data storage for this MakeyMakey
// 	thisMakeyMakey = new Makeymakey(uuid);
// 	function Makeymakey(uuid){
// 		this.uuid = uuid;
// 		this.numberofKeys = 18;
// 		this.keys = [];
// 		this.dirty = false;
// 		this.keyPressed = function(newKey){
// 			this.dirty = true;
// 			this.keys[newKey].pressed();
// 		};
// 		//Update all information on the current Makey Makeys
// 		this.update = function(){

// 			for(var i = 0; i < this.keys.length; i++){
// 				var neededUpdate = this.keys[i].update();
// 				if(neededUpdate){
// 					this.dirty = true;
// 				}
// 			}
// 			//If information on the keys has been changed, send update
// 			if(this.dirty){
// 				process.stdout.write('\033c');
// 				console.log(uuid);
// 				this.speed = 0;
// 				for(var i = 0; i < this.keys.length; i++){
// 					console.log(String.fromCharCode(97 + i) + ": " + this.keys[i].speed);
// 					this.speed += this.keys[i].speed;
// 				}
// 				console.log("cps: " + this.speed);
// 				SendUpdate();
// 			}
// 			this.dirty = false;
// 		};
// 		for(var i = 0; i < this.numberofKeys; i++){
// 			this.keys[i] = new Key();
// 		}
// 		this.updateTimer;
// 		this.speed = 0;
// 	};

// 	function Key (){
// 		this.lastKeyPress = 0;
// 		this.keyTimes = [];
// 		this.keyTimeout = 2.0;
// 		this.speed = 0;
// 		this.pressed = function(){
// 			var date = new Date();
// 			this.keyTimes.push(date.getTime());
// 			console.log("Key was pressed at: " + date.getTime());
// 			this.update();
// 		};
// 		this.update = function(){
// 			var currentTime = (new Date()).getTime();
// 			var neededUpdate = false;
// 			while(this.keyTimes.length != 'undefined' && this.keyTimes[0] < currentTime - 1000 && this.keyTimes.length != 0){
// 				console.log("Press " + this.keyTimes[0] + " has timed out");
// 				this.keyTimes.shift();
// 				neededUpdate = true;
// 			}
// 			this.speed = this.keyTimes.length;
// 			return neededUpdate;
// 		};
// 	};

// 	//Set interval to automatically update keypresses for timeouts
// 	setInterval(update, 10);
// 	function update(){
// 		thisMakeyMakey.update();
// 	}
// }
// else{
// 	console.log("This is Production Log")
// }

//Set up a timer that intermittently sends a new update to anyone connected to the stream
setInterval(broadcast,100);