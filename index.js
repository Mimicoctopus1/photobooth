saveFile = process.env.saveFile || "photos.txt"
verbose = function() {}

optionFlags = ""
process.argv.forEach(function(argument, index) {
	if(argument[0] == "-" && argument[1] != "-") {
		optionFlags += argument.slice(1)
		if(argument.includes("s")) {
			saveFile = process.argv[index + 1]
		}
	} else if(argument == "--verbose") {
		verbose = console.log
	} else if(argument == "--save-file") {
		saveFile = process.argv[index + 1]
	}
})


verbose("Requiring dependencies")
verbose("|node:path")
var path = require("node:path")
verbose("|express")
var express = require("express")
verbose("|ws")
var WebSocket = require("ws")
verbose("|node:http")
var http = require("node:http")
verbose("|node:readline")
var readline = require("node:readline")
verbose("|node:fs")
var fs = require("node:fs")

var rl = readline.createInterface({
	"input": process.stdin,
	"output": process.stdout,
	"terminal": false
})

verbose("Constructing express instance")
var app = express()
verbose("Constructing http server using express instance")
var server = http.createServer(app)
verbose("Constructing WebSocket server using http server")
var wss = new WebSocket.WebSocketServer({
	"autoPong": true,
	"server": server,
	"clientTracking": true
})

verbose("Configuring public folder for express instance")
app.use(express.static(path.join(__dirname, "public")))/*Allow the user to access the public folder*/

verbose("Deciding which port to use")
var port
if(process.argv.includes("--port")) {
	port = process.argv[process.argv.indexOf("--port") + 1]
}
port = parseInt(process.env.PORT) || port || 8080
verbose("Listening on port " + port)
server.listen(port)

verbose("Making WebSocket server aliases")
wss.send = function(data) {
	wss.clients.forEach(function(ws) {
		ws.send(data)
	})
}

fs.readFile(saveFile, "utf-8", function(error, data) {
	if(error) {
		photos = []
	} else {
		photos = data.split("\n")
	}
})

var messageResponses = {
	"log": console.log,
	"save image": function(data, ws) {
		photos.push(data)
		fs.writeFile(saveFile, photos.join("\n"), function(error) {
			if(error) {
				console.log(error)
			}
		})
	},
	"download images": function(data, ws) {
		ws.send(JSON.stringify({
			"type": "download images",
			"data": photos
		}))
	}
}

verbose("Setting up WebSocket events")
wss.on("connection", function(ws) {
	verbose(wss.clients.size + " users  +")

	ws.addEventListener("message", function(event) {
		let type = JSON.parse(event.data).type
		let data = JSON.parse(event.data).data
		messageResponses[type](data, ws)
	})
	
	ws.addEventListener("close", function() {
		verbose(wss.clients.size + " users  -")
		wss.send(JSON.stringify({
			"type": "population update",
			"data": wss.clients.size
		}))
	})
})

stdinResponses = {
	"population": function() {
		console.log(wss.clients.size + " users  =")
	},
	"images": function() {
		console.log(photos.length + " imgs   =")
	},
	"delete": function() {
		photos = []
		fs.unlink(saveFile, function(error) {
			if(error) {
				console.log(error + "\n\nDoes that file exist?")
			}
		})
	}
}

var readInput = function() {
	rl.question("", function(answer) {
		if(stdinResponses[answer]) {
			stdinResponses[answer]()
		}
		readInput()
	})
}
readInput()

verbose("______________________________________________________               🛸")
verbose("|  __       __  _____    __            _____  _____  |   ✨   👾👾")
verbose("| |  |     |__|/  ___| _|  |_   ____  |  ___||  ___| |         👾")
verbose("| |  |      __ |  ___||_    _| /    \\ |  ___||  ___| |               ✨")
verbose("| |  |___  |  ||  |     |  |  |  (O) ||  |   |  |    |    🚀")
verbose("| |______| |__||__|     |__|   \\____/ |__|   |__|    |           ✨")
verbose("|____________________________________________________|  🌍    ✨")