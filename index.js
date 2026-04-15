#!/bin/env node
verbose = function() {}

saveFolder = ""
mdnsBindAddresses = []

optionFlags = ""
process.argv.forEach(function(argument, index) {
	if(argument[0] == "-" && argument[1] != "-") {
		optionFlags += argument.slice(1)
		if(argument.includes("s")) {
			saveFolder = process.argv[index + 1]
		}
		if(argument.includes("b")) {
			mdnsBindAddresses[mdnsBindAddresses.length] = process.argv[index + 1]
		}
	} else if(argument == "--verbose") {
		verbose = console.log
	} else if(argument == "--save-folder") {
		saveFolder = process.argv[index + 1]
	} else if(argument == "--mdns-bind") {
		mdnsBindAddresses[mdnsBindAddresses.length] = process.argv[index + 1]
	}
})


verbose("Requiring dependencies")
verbose("|express")
express = require("express")
verbose("|ws")
WebSocket = require("ws")
verbose("|multicast-dns")
multicastDns = require("multicast-dns")
verbose("|pdfkit")
pdfkit = require("pdfkit")
verbose("|ipp-encoder")
ippEncoder = require("ipp-encoder")
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

mdns = [multicastDns()]
mdnsBindAddresses.forEach(function(mdnsBindAddress, index) {
	mdns[mdns.length] = multicastDns({
		"interface": mdnsBindAddress
	})
})
printer = ""/*The default printer*/
printers = {}
oldPrinters = {}
mdns.forEach(function(mdnsInstance, index) {
	mdnsInstance.on("response", function(response) {
		let entries = response.answers.concat(response.additionals)

		entries.forEach(function(entry, index) {
			if(entry.name.indexOf("_ipp._tcp.local") >= 0 && ["PTR", "SRV", "TXT"].includes(entry.type)) {
				printers[entry.name] ||= {}
				printers[entry.name].time = Date.now()
				if("SRV" == entry.type) {
					if(entry.data.target) {
						printers[entry.name].hostname = entry.data.target
					}
					if(entry.data.port) {
						printers[entry.name].port = entry.data.port
					}
				}
				if("TXT" == entry.type) {
					entry.data.forEach(function(pair, index) {
						pair = pair.toString().split("=")/*From Buffer*/
						let key = pair[0]
						let value = pair[1]
						
						if("rp" == key) {/*rp = Resource Path*/
							printers[entry.name].path = value
						}
					})
				}
			}
		})
	})
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
verbose("|Data conversion function: convert")
pdfFormats = ["pdf", "pdfBuffer"]
pdfWrappableImageFormats = ["png", "jpg", "jpeg"]
convert = function(sourceFormat, destinationFormat, source, destination, customOptions) {
	if(pdfFormats.includes(destinationFormat) && pdfWrappableImageFormats.includes(sourceFormat)) {/*Wrap the image in a pdf, basically.*/
		let options = {
			"size": "letter",
			"layout": "portrait"
		}
		Object.assign(options, customOptions)
		if(options.size.indexOf(":") >= 1) {
			options.size = options.size.split(":")
		}
		let outputPdf = new pdfkit({
			"size": options.size,
			"margins": {
				"top": 0,
				"bottom": 0,
				"left": 0,
				"right": 0
			},
			"layout": options.layout
		})
		if(destinationFormat == "pdfBuffer") {
			let outputChunks = []
			outputPdf.on("data", function(data) {
				outputChunks[outputChunks.length] = data
			})
			outputPdf.on("end", function() {
				let outputBuffer = Buffer.concat(outputChunks)
				if(typeof(destination) == "string") {
					fs.writeFile(destination, outputBuffer, function(error) {
						if(error) {
							console.error(error + "\nThere was an error writing a PDF (a wrapped image) Buffer to " + destination + ".")
						}
					})
				} else if(typeof(destination) == "function") {
					destination(outputBuffer)
				}
			})
			outputPdf.on("error", function() {
				console.error(error + "\nThere was an error streaming a PDF (a wrapped image) to a buffer.")
			})
		} else if(destinationFormat == "pdf") {
			if(destination) {
				outputPdf.pipe(fs.createWriteStream(destination))
			}
		}

		try {
			outputPdf.image(source, 0, 0, {
				"fit": [outputPdf.page.width || 595.28, outputPdf.page.height || 841.89],/*Defaults are for A4 size.*/
				"align": "center",
				"valign": "center"
			})
		} catch(error) {
			console.error(error)
			if(error.code == "ENOENT") {
				console.error("\nDoes " + source + " exist?")
			}
		}

		outputPdf.end()
	}
} 
verbose("|Broadcasting function: wss.send")
wss.send = function(data) {
	wss.clients.forEach(function(ws) {
		ws.send(data)
	})
}
verbose("|Printer-listing function: listPrinters")
listPrinters = function(printerToList) {
	Object.keys(oldPrinters).forEach(function(key, index) {
		if(!printerToList || printerToList == key) {
			console.log("[" + (index + 1) + "] " + key + ": " + (oldPrinters[key].hostname || "?") + ":" + (oldPrinters[key].port || "?") + "/" + (oldPrinters[key].path || "?"))/*```index + 1``` to go from zero- to one- indexed*/
		}
	})
}
verbose("|Printer-finding (mDNS) function: searchForPrinters")
searchForPrinters = function() {
	mdns.forEach(function(mdnsInstance, index) {
		mdnsInstance.query({
			"questions": [
				{
					"name": "_ipp._tcp.local",
					"type": "PTR"
				}
			]
		})
	})
}
verbose("|Printer acces function: print")
print = function(bufferToPrint, printerUri, customOptions, verbosity) {
	if(!printerUri) {
		if(printer) {
			if(oldPrinters[printer]) {
				let printerToUse = oldPrinters[printer]
				let missingValues = ["hostname", "port", "path"].filter(function(value, index) {
					if(printerToUse[value]) {
						return(false)
					}
					return(true)
				})
				missingValues.forEach(function(value) {
					console.error(printer + " doesn't have an associated " + value + ".")
				})
				if(missingValues.length) {
					return
				}
				printerUri = "ipp://" + printerToUse.hostname + ":" + printerToUse.port + "/" + printerToUse.path
			} else {
				console.log(printer + " is no longer available.")
			}
		} else {
			console.error("Please specify a printer.")
			return
		}
	}
	options = {
		"verbosity": "",
		"requestId": 1,
		"language": "en-us",
		"copies": 1
	}
	Object.assign(options, customOptions)
	/*Note that, for each attribute, the tag is a hexadecimal number that tells the printer what format the value is in (utf-8, integer, etc).*/
	let ippHeader = ippEncoder.request.encode({
		"version": {
			"major": 2,
			"minor": 0
		},
		"operationId": ippEncoder.CONSTANTS.PRINT_JOB,
		"requestId": options.requestId,
		"groups": [
			{
				"tag": ippEncoder.CONSTANTS.OPERATION_ATTRIBUTES_TAG, /*Attributes/details concerning the operation (in this case, an message saying to add a print job)*/
				"attributes": [
					{
						"tag": ippEncoder.CONSTANTS.CHARSET,
						"name": "attributes-charset",
						"value": ["utf-8"]/*Character set to respond in*/
					},
					{
						"tag": ippEncoder.CONSTANTS.NATURAL_LANG,
						"name": "attributes-natural-language",
						"value": [options.language]/*Language to respond in*/
					},
			 		{
						"tag": ippEncoder.CONSTANTS.URI,
						"name": "printer-uri",
						"value": [printerUri]
					},
					{
						"tag": ippEncoder.CONSTANTS.NAME_WITHOUT_LANG,
						"name": "job-name",
						"value": ["photobooth" + options.requestId]/*Name of print job*/
					},
					{
						"tag": ippEncoder.CONSTANTS.BOOLEAN,
						"name": "ipp-attribute-fidelity",
						"value": [true]/*Cancel if a setting is unsupported e.g. if I said to print landscape but the printer only does portrait.*/
					},
				]
			},
			{
				"tag": ippEncoder.CONSTANTS.JOB_ATTRIBUTES_TAG,/*Details/attributes concerning the actual print job*/
				"attributes": [
					{
						"tag": ippEncoder.CONSTANTS.INTEGER,
						"name": "copies",
						"value": [options.copies]
					},
					{
						"tag": ippEncoder.CONSTANTS.KEYWORD,
						"name": "sides",
						"value": "one-sided"
					},
				]
			},
		]
	})
	let bufferToSend = Buffer.concat([ippHeader, bufferToPrint])

	printerUri = new URL(printerUri)
	let printRequest = http.request({
		"method": "POST",
		"hostname": printerUri.hostname,
		"port": printerUri.port || 631,
		"pathname": printerUri.pathname,
		"headers": {
			"Content-Type": "application/ipp",
			"Content-Length": bufferToSend.length,
			"Expect": ""
		}
	}, function(response) {
		let chunks = []
		response.on("data", function(response) {
			chunks[chunks.length] = response
		})

		response.on("end", function() {
			let bufferRecieved = Buffer.concat(chunks)
			let printerResponse = ippEncoder.response.decode(bufferRecieved)
			let fields = {}
			fields.statusCode = printerResponse.statusCode
			fields.requestId = printerResponse.requestId
			printerResponse.groups.forEach(function(group) {
				group.attributes.forEach(function(attribute) {
					fields[attribute.name] = attribute.value
				})
			})
			if(options.verbosity == "full response") {
				console.log(JSON.stringify(printerResponse))
			} else if(options.verbosity == "status report") {
				console.log(fields["status-message"] + "(" + fields["statusCode"] + "): " + fields["job-state"])
			}
		})
	})

	printRequest.on("error", function(error) {
		console.error(error + "\nThere was an error sending a request to " + printerUri + ".")
	})

	printRequest.write(bufferToSend)
	printRequest.end()
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
	"convert": function(words) {
		convert(...(words.slice(1)))
	},
	"print": function(words) {
		let options = {}
		let convertBeforePrint = true
		words = words.filter(function(word, index) {
			if(word.slice(0, 2) == "--") {
				word = word.slice(2)
				if(["full-response", "status-report"].includes(word)) {
					options.verbosity = word.replace("-", " ")
				} else if("no-convert" == word) {
					convertBeforePrint = false
				} else if("language" == word) {
					options.language = words.splice(index + 1)
				} else if("request" == word) {
					options.requestId = words.splice(index + 1)
				} else {
					console.log("--" + word + " is not a valid option.")
				}
				return(false)
			} else {
				return(true)
			}
		})
		if(!words[1]) {
			console.error("Please specify an image to print.")
			return
		}
	  	if(convertBeforePrint) {
	  		convert("png", "pdfBuffer", words[1], function(bufferToPrint) {
	  			print(bufferToPrint, words[2], options)
	  		})
	  	} else {
	  		fs.readFile(words[1], function(bufferToPrint) {
	  			print(bufferToPrint, words[2], options)
	  		})
	  	}
	},
	"printer": function(words) {
		if("search" == words[1]) {
			searchForPrinters()
			console.log("Searching for " + (parseInt(words[2]) || 1000) + "ms...")
			setTimeout(function() {
				oldPrinters = printers/*We need oldPrinters so that the printers' indeces are the same between ```printer search``` and printer <printer>.*/
				console.log("Search complete!")
			}, parseInt(words[2]) || 1000)
		} else if(["add", "set"].includes(words[1])) {
			if(words[1] == "add" && printers[words[2]]) {
				console.log("That printer exists already! Use \"set\" or \"remove\".")
				return
			} else if(words[1] == "set") {
				words[2] = Object.keys(oldPrinters)[parseInt(words[2])]
			}
			printers[words[2]] ||= {}
			words.filter(function(word, index) {
				if(word[0] == "-") {
					if(word[1] == "-") {
						if(word == "--hostname") {
							printers[words[2]].hostname = words.splice(index + 1, 1)
						} else if(word == "--port") {
							printers[words[2]].port = words.splice(index + 1, 1)
						} else if(word == "--path") {
							printers[words[2]].path = words.splice(index + 1, 1)
						}
					}
					return(false)
				} else {
					return(true)
				}
			})
		} else if("remove" == words[1]) {
			let printerNumberToDelete = parseInt(words[2]) - 1/*One- to zero- indexed*/
			let printerNameToDelete = Object.keys(oldPrinters)[printerNumberToDelete]
			delete(oldPrinters[printerNameToDelete])
			delete(printers[printerNameToDelete])
		} else if(parseInt(words[1]) == words[1]) {
			let printerNumberToSelect = parseInt(words[1]) - 1/*One- to zero- indexed*/
			let printerNameToSelect = Object.keys(oldPrinters)[printerNumberToSelect]
			printer = printerNameToSelect
		} else if("list" == words[1]) {
			listPrinters()
		} else if(!words[1]) {
			if(oldPrinters[printer]) {
				listPrinters(printer)
			} else if(printer) {
				console.log(printer + " is no longer available.")
			} else {
				console.log("No printer selected!")
			}
		} else {
			console.log(words[1] + " not understood")
		}
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
