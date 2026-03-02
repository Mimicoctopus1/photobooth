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
verbose("|node:https")
https = require("node:https")
verbose("|node:fs")
fs = require("node:fs")
verbose("|node:readline")
readline = require("node:readline")
verbose("|node:path")
path = require("node:path")

verbose("Deciding on save folder")
if(!saveFolder) {
	saveFolder = process.env.SAVEFOLDER || path.join(".data", "photos")
	verbose("|Files will be loaded from and saved to " + saveFolder + ".")
}

var rl = readline.createInterface({
	"input": process.stdin,
	"output": process.stdout,
	"terminal": false
})

verbose("Constructing WebSocket server")
var wss = new WebSocket.WebSocketServer({
	"autoPong": true,
	/*Because we may have HTTP and HTTPS servers, we cannot link the WebSocketServer with either, so we have to (later in the code) manually, rather than automatically, allow HTTP/HTTPS connections to upgrade into WebSocket connections.
	See https://en.wikipedia.org/wiki/WebSocket#:~:text=the%20WebSocket%20handshake%20uses%20the%20HTTP%20Upgrade%20header%5B3%5D%20to%20change%20from%20the%20HTTP%20protocol%20to%20the%20WebSocket%20protocol*/
	"noServer": true,
	"clientTracking": true
})

verbose("Checking for HTTPS credentials")
credentials = {}
credentialDirectory = ""
if(process.argv.includes("--credentials")) {
	credentialDirectory = process.argv[process.argv.indexOf("--credentials") + 1]
}
credentialDirectory ||= process.env.CREDENTIALS || ""
if(credentialDirectory) {
	credentials = {
		"key": path.join(credentialDirectory, "privkey.pem"),
		"cert": path.join(credentialDirectory, "cert.pem"),
		"ca": path.join(credentialDirectory, "chain.pem")
	}
}
/*Individual overrides*/
certNames = ["key", "cert", "ca"]
certNames.forEach(function(credential) {
	if(process.argv.includes("--" + credential)) {
		credentials[credential] = process.argv[process.argv.indexOf("--" + credential) + 1]
	} else if(process.env[credential.toUpperCase()]) {
		process.env[credential.toUpperCase()]
	}
})

verbose("Constructing express instance")
app = express()
verbose("Configuring public folder for Express instance")
app.use(express.static(path.join(__dirname, "public"), {
	"dotfiles": "allow"
}))/*Allow the user to access the public folder, including dotfiles (files whose names start with a period)*/

verbose("Constructing HTTP server using express instance")
server = http.createServer(app)
verbose("Deciding which port to use")
port = ""
if(process.argv.includes("--port")) {
	port = process.argv[process.argv.indexOf("--port") + 1]
}
port ||= parseInt(process.env.PORT) || 8080
verbose("Listening on HTTP port " + port)
server.listen(port)

verbose("Preparing to convert HTTP connections to WebSocket connections")
server.on("upgrade", function(request, socket, head) {/*Fired by "new WebSocket()" on the client side*/
	wss.handleUpgrade(request, socket, head, function(ws) {
		wss.emit("connection", ws, request)/*Since the WebSocketServer is not configured to be tied to the HTTP server, we have to force the connection procedure manually*/
	})
})

numberOfCredentials = 0
certNames.forEach(function(certName) {
	if(credentials[certName]) {
		fs.readFile(credentials[certName], "utf-8", function(error, data) {
			if(error) {
				console.error(error + "\nCould not get " + certName +  " from " + credentials[certName] + ".")
			} else {
				credentials[certName] = data
				numberOfCredentials++
				if(numberOfCredentials == 3) {
					verbose("Constructing HTTPS server using Express instance")
					secureServer = https.createServer(credentials, app)
					verbose("Deciding which secure port to use")
					securePort = ""
					if(process.argv.includes("--secure-port")) {
						securePort = process.argv[process.argv.indexOf("--secure-port") + 1]
					}
					securePort = parseInt(process.env.SECUREPORT) || securePort || 8443
					verbose("Listening on HTTPS port " + securePort)
					secureServer.listen(securePort)
					
					verbose("Preparing to convert HTTPS connections to WebSocket connections")
					secureServer.on("upgrade", function(request, socket, head) {/*Fired by "new WebSocket()" on the client side*/
						wss.handleUpgrade(request, socket, head, function(ws) {
							wss.emit("connection", ws, request)/*Since the WebSocketServer is not configured to be tied to the HTTPS server, we have to force the connection procedure manually*/
						})
					})
				}
			}
		})
	}
})

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
	},
	"exit": function(words) {
		process.exit(words[1] || 0)
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
