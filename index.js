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
verbose("|express")
express = require("express")
verbose("|ws")
WebSocket = require("ws")
verbose("|node:http")
http = require("node:http")
verbose("|node:fs")
fs = require("node:fs")
verbose("|node:readline")
readline = require("node:readline")
verbose("|node:path")
path = require("node:path")

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
	fs.mkdir(saveFolder, {
		"recursive": true,
	}, function(error) {
		if(error) {
			console.error(error + "\nCouldn't make folder " + saveFolder)
		}
		fs.readdir(saveFolder, "utf-8", function(error, files) {
			files.sort(function(a, b) {
				return(parseInt(a) - parseInt(b))
			})
			files = files.slice(photos.length)/*Get any files that will not be overwritten*/
			files.forEach(function(file, index) {/*Delete them*/
				fs.rm(path.join(saveFolder, file), function(error) {
					if(error) {
						console.error(error + "\nCould not delete file " + path.join(saveFolder, file) + ".")
					}
				})
			})

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
	if(error) {
		if(error.code != "ENOENT") {
			console.error(error + "\nCould not read from " + saveFolder + ".")
		}
	} else {
		files.sort(function(a, b) {
			return(parseInt(a) - parseInt(b))
		})
		let loadedPhotos = []
		files.forEach(function(file) {
			fs.readFile(path.join(saveFolder, file), function(error, data) {/*Read as Buffer, subclass of Uint8Array*/
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
		data = Uint8Array.from(data)/*Convert regular 64-bit numbers into 8-bit numbers*/
		photos.push(data)
		saveImages()
	},
	"download images": function(data, ws) {
		ws.send(JSON.stringify({
			"type": "download images",
			"data": photos.map(function(photo, index) {
				return(Array.from(photo))
			})
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
		fs.readdir(loadFrom, "utf-8", function(error, files) {
			if(error) {
				console.error(error + "\nCould not read from " + loadFrom + ".")
			} else {
				files.sort(function(a, b) {
					return(parseInt(a) - parseInt(b))
				})
				let loadedPhotos = []
				files.forEach(function(file) {
					fs.readFile(path.join(saveFolder, file), function(error, data) {/*Read as Buffer, subclass of Uint8Array*/
						loadedPhotos.push(data)
						if(loadedPhotos.length == files.length) {/*If this is the last file*/
							photos = loadedPhotos.concat(photos)
						}
					})
				})
				saveImages()
			}
		})
	},
	"remove": function(words) {
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
					
					photos.splice(start, amount, ...Array(amount).fill(undefined))
				} else if(photo.includes("-")) {
					let start = parseInt(photo.split("-")[0])
					let end = parseInt(photo.split("-")[1])
					let amount = Math.abs(end - start) + 1

					photos.splice(start, amount, ...Array(amount).fill(undefined))
				} else {
					photos[parseInt(photo)] = undefined
				}
			})
		} else {
			photos = photos.fill(undefined)
		}
		
		/*Delete all the empty photos*/
		let deletedPhotos = 0
		photos = photos.filter(function(photo) {
			if(photo == undefined) {
				deletedPhotos ++
			}
			return (photo != undefined)
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