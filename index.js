#!/bin/env node
verbose = function() {}

saveFolder = ""

optionFlags = ""
process.argv.forEach(function(argument, index) {
	if(argument[0] == "-" && argument[1] != "-") {
		optionFlags += argument.slice(1)
		if(argument.includes("s")) {
			saveFolder = process.argv[index + 1]
		}
	} else if(argument == "--verbose") {
		verbose = console.log
	} else if(argument == "--save-folder") {
		saveFolder = process.argv[index + 1]
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

if(!saveFolder) {
	saveFolder = process.env.SAVEFOLDER || path.join(".data", "photos")
}

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

verbose("Making functions")
verbose("|Broadcasting function: wss.send")
wss.send = function(data) {
	wss.clients.forEach(function(ws) {
		ws.send(data)
	})
}

verbose("|Image-saving function: saveImages")
saveImages = function() {
	fs.rm(saveFolder, {
		"recursive": true,/*Delete everything inside as well*/
		"force": true/*Allow deletion of folders as well as files*/
	}, function(error) {
		fs.mkdir(saveFolder, {
			"recursive": true,
		}, function(error) {
			if(error) {
				console.error(error + "\nCouldn't make folder " + saveFolder)
			}
			photos.forEach(function(photo, index) {
				fs.writeFile(path.join(saveFolder, index + ".png"), photo, function(error) {	
					if(error) {
						console.error(error)
					}
				})
			})
		})
	})
}

verbose("Loading photos from " + saveFolder)
photos = []
fs.readdir(saveFolder, "utf-8", function(error, files) {
	if(!error) {
		files.sort(function(a, b) {
			return(parseInt(a) - parseInt(b))
		})
		let loadedPhotos = []
		files.forEach(function(file) {
			fs.readFile(path.join(saveFolder, file), "ascii", function(error, data) {
				loadedPhotos.push(data)
				if(loadedPhotos.length == files.length) {/*If this is the last file*/
					photos = loadedPhotos.concat(photos)
				}
			})
		})
	}
})

var messageResponses = {
	"log": console.log,
	"save image": function(data, ws) {
		photos.push(data)
		saveImages()
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
	fs.readdir("public/assets", "utf-8", function(error, data) {
		if(error) {
			console.error(error)
		}
		ws.send(JSON.stringify({
			"type": "foregrounds",
			"data": data
		}))
	})

	ws.addEventListener("message", function(event) {
		let type = JSON.parse(event.data).type
		let data = JSON.parse(event.data).data
		messageResponses[type](data, ws)
	})
	
	ws.addEventListener("close", function() {
		wss.send(JSON.stringify({
			"type": "population update",
			"data": wss.clients.size
		}))
	})
})

stdinResponses = {
	"users": function(words) {
		console.log(wss.clients.size + " users")
	},
	"photos": function(words) {
		console.log(photos.length + " photo")
	},
	"backup": function(words) {
		fs.cp(saveFolder, words[1] || saveFolder + ".old", {
			"recursive": true
		}, function(error) {
			if(error) {
				console.error(error + "\nCould not copy " + saveFolder + " to " + words[1] + ".")
			}
		})
	},
	"load": function(words) {
		let loadFrom = words[1] || saveFolder + ".old"
		fs.readFile(loadFrom, "utf-8", function(error, data) {
			if(error) {
				console.error(error)
			} else {
				let newPhotos = data.split("\n")
				newPhotos.concat(photos)
				photos = newPhotos
				saveImages()
			}
		})
	},
	"remove": function() {
		fs.rm(words[1], {
			"recursive": true
		}, function(error) {
			if(error) {
				console.error(error + "\nCould not remove folder " + words[1] + ".")
			}
		})
	},
	"delete": function(words) {
		if(Math.random() > 0.9) {
			console.log("Yes boss.🫡")
		}

		if(words[1]) {
			words.slice(1).forEach(function(photo) {
				if(photo.includes("@")) {
					let start = parseInt(photo.split("@")[1])
					let amount = parseInt(photo.split("@")[0])
					
					photos.splice(start, amount, ...Array(amount).fill(""))
				} else if(photo.includes("-")) {
					let start = parseInt(photo.split("-")[0])
					let end = parseInt(photo.split("-")[1])
					let amount = Math.abs(end - start) + 1

					photos.splice(start, amount, ...Array(amount).fill(""))
				} else {
					photos[parseInt(photo)] = ""
				}
			})
		} else {
			photos = photos.map(function(photo, index) {
				if(photo) {
					return("")
				}
			})
		}
		
		/*Delete all the empty photos*/
		let deletedPhotos = 0
		photos = photos.filter(function(photo) {
			if(photo == "") {
				deletedPhotos ++
			}
			return (photo != "")
		})

		saveImages()

		console.log("Deleted " + deletedPhotos + " photos")
		console.log(photos.length + " photos remaining")
	},
	"kick": function(words) {
		wss.clients.forEach(function(ws) {
			ws.close()
		})
	}
}

var readInput = function() {
	rl.question("", function(answer) {
		if(answer.split(" ")[0] in stdinResponses) {
			stdinResponses[answer.split(" ")[0]](answer.split(" "))
		}
		readInput()
	})
}
readInput()

console.log("______________________________________________________               🛸")
console.log("|  __       __  _____    __            _____  _____  |   ✨   👾👾")
console.log("| |  |     |__||  ___| _|  |_   ____  |  ___||  ___| |         👾")
console.log("| |  |      __ |  ___||_    _| /    \\ |  ___||  ___| |               ✨")
console.log("| |  |___  |  ||  |     |  |  |  (O) ||  |   |  |    |    🚀")
console.log("| |______| |__||__|     |__|   \\____/ |__|   |__|    |           ✨")
console.log("|____________________________________________________|  🌍    ✨")