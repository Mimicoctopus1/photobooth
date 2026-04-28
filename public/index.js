captureDelay = 3
reloadEachTime = true
flipVideo = true
maxQuotesPerSearch = 10
cameraFacing = "user" /*"user" or "environment*/

ws = new WebSocket(document.location)

width = window.innerWidth
height = 0/*Will be computed later*/
repositioning = false
quotes = []
searchInQuote = ["quote", "source"]
permission = false
filtersSet = false
dataArray = false/*Used to store the most recently taken photo*/
printAfterUpload = false/*Used to determine if the photo should be printed as soon as it is uplaoded*/
uploadedFile = false/*Used to store the name of the most recently uploaded file*/

disconnected = document.getElementsByClassName("disconnected")[0]
video = document.getElementsByClassName("video")[0]
canvas = document.getElementsByClassName("canvas")[0]
foreground = document.getElementsByClassName("foreground")[0]
quote = document.getElementsByClassName("quote")[0]
footer = document.getElementsByClassName("footer")[0]
countdownContainer = document.getElementsByClassName("countdown-container")[0]
countdown = document.getElementsByClassName("countdown")[0]
foregroundChange = document.getElementsByClassName("foreground-change")[0]
quoteChange = document.getElementsByClassName("quote-change")[0]
preCapture = document.getElementsByClassName("pre-capture")[0]
midCapture = document.getElementsByClassName("mid-capture")[0]
postCapture = document.getElementsByClassName("post-capture")[0]
captureButton = document.getElementsByClassName("capture")[0]
clearButton = document.getElementsByClassName("clear")[0]
popupsContainerContainer = document.getElementsByClassName("popups-container-container")[0]
popupList = document.getElementsByClassName("popup")
closePopupList = document.getElementsByClassName("close-popup")
foregroundSelect = document.getElementsByClassName("foreground-select")[0]
foregroundClear = document.getElementsByClassName("foreground-clear")[0]
foregroundSelectContent = foregroundSelect.getElementsByClassName("popup-content")[0]
quoteSelect = document.getElementsByClassName("quote-select")[0]
quoteReposition = document.getElementsByClassName("quote-reposition")[0]
quoteClear = document.getElementsByClassName("quote-clear")[0]
quoteSearch = document.getElementsByClassName("quote-search")[0]
quoteSelectContent = quoteSelect.getElementsByClassName("popup-content")[0]
quoteOptions = quoteSelectContent.getElementsByClassName("quote-option")
qrContainer = document.getElementsByClassName("qr-container")[0]
qrLink = document.getElementsByClassName("qr-link")[0]
qr = document.getElementsByClassName("qr")[0]
uploadButton = document.getElementsByClassName("upload-button")[0]
printButton = document.getElementsByClassName("print-button")[0]

ws.responses = {
	"upload": function(data) {
		uploadedFile = data
		if(printAfterUpload) {
			print(uploadedFile)
		}
	},
	"foregrounds": function(data) {
		data.forEach(function(foregroundName, index) {
			let foregroundPath = "assets/foregrounds/" + foregroundName

			let foregroundOption = document.createElement("div")
			foregroundOption.className = "foreground-option"

			let foregroundHeading = document.createElement("h2")
			foregroundHeading.className = "foreground-heading"
			foregroundHeading.innerHTML = foregroundName.replace(/\..*/, "")
				.replace("-", " ")
				.replace("_", " ")

			let foregroundPreview = document.createElement("img")
			foregroundPreview.className = "foreground-preview"
			foregroundPreview.src = foregroundPath

			foregroundOption.appendChild(foregroundHeading)
			foregroundOption.appendChild(foregroundPreview)
			foregroundSelectContent.appendChild(foregroundOption)
			foregroundOption.addEventListener("click", function(event) {
				foreground.src = this.getElementsByClassName("foreground-preview")[0].src
				foreground.style.display = "block"
			})
		})
	},
	"quotebooks": function(data) {
		data.forEach(function(quotebookName, index) {
			let quotebookPath = "assets/quotebooks/" + quotebookName

			fetch(quotebookPath, {
				"method": "GET"
			}).then(function(response) {
				return(response.json())
			}).then(function(response) {
				quotes = quotes.concat(response)
			})
		})
	}
}

interfaceStages = {
	"preCapture": function() {
		preCapture.style.display = "flex"
		midCapture.style.display = "none"
		postCapture.style.display = "none"
		qrContainer.style.display = "none"
		let popupsHidden = 0
		while(popupsHidden < popupList.length) {
			popupList[popupsHidden].style.display = "none"
			popupsHidden ++
		}
	},
	"midCapture": function() {
		preCapture.style.display = "none"
		midCapture.style.display = "flex"
		postCapture.style.display = "none"
		qrContainer.style.display = "none"
		let popupsHidden = 0
		while(popupsHidden < popupList.length) {
			popupList[popupsHidden].style.display = "none"
			popupsHidden ++
		}
	},
	"postCapture": function() {
		preCapture.style.display = "none"
		midCapture.style.display = "none"
		postCapture.style.display = "flex"
		qrContainer.style.display = "none"
		let popupsHidden = 0
		while(popupsHidden < popupList.length) {
			popupList[popupsHidden].style.display = "none"
			popupsHidden ++
		}
	}
}

ws.addEventListener("message", function(event) {
	let type = JSON.parse(event.data).type
	let data = JSON.parse(event.data).data
	if(ws.responses[type]) {
    ws.responses[type](data)
  }
})

ws.addEventListener("open", function() {
	ws.addEventListener("close", function() {
		disconnected.style.display = "block"
	})
})

context = canvas.getContext("2d")
if(flipVideo) {
	video.style.transform = "scaleX(-1)"
}

qrcode = new QRCode(qr, {
	"text": document.location + "/download",
	"colorDark": "#000000",
	"colorLight": "#ffffff"
})
qrLink.href = document.location + "/download"

document.addEventListener("click", function(event) {
	if(repositioning == "quote") {
		quote.style.top = event.pageY + "px"
		quote.style.left = event.pageX + "px"
		repositioning = false
		setTimeout(function() {
			popupsContainerContainer.style.display = "block"
			footer.style.display = "block"
		}, 500)
	}
})

video.addEventListener("canplay", function(event) {
  if(!width || !height) {
    height = video.videoHeight / (video.videoWidth / width)

    video.width = width
    video.height = height
    canvas.width = width
    canvas.height = height
    foreground.width = width
    foreground.height = height
  }
})

clearPicture = function() {
	context.clearRect(0, 0, canvas.width, canvas.height)

	dataArray = false
	printAfterUpload = false
	uploadedFile = false
	quote.innerHTML = ""
	quote.style.display = "block"
	
	interfaceStages.preCapture()
}

requestPermissions = function() {
  navigator.mediaDevices
    .getUserMedia({video: {facingMode: {exact: cameraFacing}}, audio: false})
    .then(function(stream) {
      video.srcObject = stream
      video.play()
    })
    .catch(function(error) {
      console.error("An error occurred while getting permission for camera:" + error)
    })
}

getPermissions = function() {
  navigator.permissions.query({"name": "camera"}).then(function(result) {
    if(result.state == "prompt" || video.srcObject == null || typeof video.srcObject != "object") {
      requestPermissions()
    }
  })
}

takePicture = function() {
	getPermissions()
	countdown.innerHTML = captureDelay

	interfaceStages.midCapture()

	countdownTimer = setInterval(function() {
		countdown.innerHTML = parseInt(countdown.innerHTML) - 1
		if(parseFloat(countdown.innerHTML) <= 0) {
			clearTimeout(countdownTimer)
			if(!filtersSet) {
				/*Get the computed CSS filter from the video element.*/
				let videoStyles = window.getComputedStyle(video)
				let filterValue = videoStyles.getPropertyValue("filter")
				/*Apply the filter to the canvas drawing context.
				If there's no filter (i.e., it returns "none"), default to "none".*/
				context.filter = filterValue || "none"
				filtersSet = true
			}

			if(flipVideo) {
				context.save()
				context.scale(-1, 1)
				context.drawImage(video, 0, 0, -width, height)
				context.restore()
			}
			if(foregroundSelect.value != "") {
				context.drawImage(foreground, 0, 0, width, height)
			}
			if(quote.innerHTML) {
				let quoteFontSize = parseFloat(getComputedStyle(quote)["font-size"])
				context.font = quoteFontSize + "px cursive"
				let line = ""
				let lineDimensions = {}
				let quoteDimensions = {}
				let linesMeasured = 0
				while(linesMeasured < quote.children.length) {
					line = quote.children[linesMeasured].innerHTML
					lineDimensions = context.measureText(line)
					if(!quoteDimensions || !quoteDimensions.width || lineDimensions.width > quoteDimensions.width) {
						quoteDimensions = lineDimensions
						context.fillRect(lineDimensions, 0, 1, 100)
					}

					linesMeasured ++
				}
				let center = parseFloat(quote.style.left) + (quoteDimensions.width / 2)
				let adjustedX = 0
				let adjustedY = parseFloat(quote.style.top)
				let linesWritten = 0
				while(linesWritten < quote.children.length) {
					line = quote.children[linesWritten].innerHTML
					lineDimensions = context.measureText(line)
					adjustedX = center - (lineDimensions.width / 2)
					context.fillText(line, adjustedX, adjustedY)
					adjustedY += lineDimensions.fontBoundingBoxAscent + lineDimensions.fontBoundingBoxDescent

					linesWritten ++
				}
			}

			let dataURL = canvas.toDataURL("image/png")
			let parts = dataURL.split(",")
			let base64String = parts[parts.length - 1]
			dataArray = Uint8Array.fromBase64(base64String)

			interfaceStages.postCapture()
		}
	}, 1000)
} 

print = function(file) {
	ws.send(JSON.stringify({
		"type": "print",
		"data": {
			"file": file,
			"copies": 1/*May add customization later*/
		}
	}))
}

refreshQuotes = function(event) {
	while(quoteOptions.length) {
		quoteOptions[0].remove()
	}

	let quotesSearched = 0
	while(quotesSearched < quotes.length && quoteOptions.length < maxQuotesPerSearch) {
		let candidateQuote = quotes[quotesSearched]
		searchInQuote.forEach(function(searchable) {
			let searchExpression = new RegExp(quoteSearch.value.toLowerCase())
			if(candidateQuote && candidateQuote[searchable].toLowerCase().search(searchExpression) >= 0) {
				let quoteOption = document.createElement("div")
				quoteOption.className = "quote-option"

				let quoteText = document.createElement("blockquote")
				quoteText.className = "quote-text"
				quoteText.innerHTML = candidateQuote.quote

				let quoteSource = document.createElement("div")
				quoteSource.className = "quote-source"
				quoteSource.innerHTML = candidateQuote.source

				quoteOption.appendChild(quoteText)
				quoteOption.appendChild(quoteSource)
				quoteSelectContent.appendChild(quoteOption)
				quoteOption.addEventListener("click", function(event) {
					while(quote.children.length) {
						quote.children[0].remove()
					}

					while(quote.children.length < this.children.length) {
						quote.appendChild(this.children[quote.children.length].cloneNode(true))/*"true" copies the contents as well.*/
					}

					quote.style.display = "block"
				})

				candidateQuote = false/*If the searched expression was just found in the quote, don't search again in the source.*/
			}
		})
		quotesSearched ++
	}
}

foregroundChange.addEventListener("click", function() {
	foregroundSelect.style.display = "inline-block"
})

quoteChange.addEventListener("click", function() {
	quoteSelect.style.display = "inline-block"
	quoteSearch.value = ""
	refreshQuotes()
})

uploadButton.addEventListener("click", function() {
	if(dataArray) {
		if(qrContainer.style.display != "block") { 
			ws.send(JSON.stringify({
				"type": "upload",
				"data": Array.from(dataArray)/*Convert 8-bit numbers into regular 64-bit numbers so they can be stringified*/
			}))
		}
		uploadButton.originalValue ||= uploadButton.value
		uploadButton.value = "✅"
		setTimeout(function() {
			uploadButton.value = uploadButton.originalValue
		}, 5000)
		qrContainer.style.display = "block"
	}
})

printButton.addEventListener("click", function(event) {
	if(uploadedFile) {
		print(uploadedFile)
	} else {
		printAfterUpload = true
		uploadButton.click()
	}
})

popupsClosable = 0
while(popupsClosable < closePopupList.length) {
	closePopupList[popupsClosable].addEventListener("click", function(event) {
		this.parentElement.parentElement.style.display = "none"
	})
	popupsClosable ++
}

foregroundClear.addEventListener("click", function(event) {
	foreground.style.display = "none"
})

quoteClear.addEventListener("click", function(event) {
	quote.style.display = "none"
	quote.innerHTML = ""
	quoteSearch.value = ""
})

quoteSearch.addEventListener("input", refreshQuotes)

quoteReposition.addEventListener("click", function(event) {
	event.stopPropagation()/*Otherwise, this click also repositions the quote.*/
	popupsContainerContainer.style.display = "none"
	footer.style.display = "none"
	repositioning = "quote"
})

if(reloadEachTime) {
  clearButton.addEventListener("click", function(event) {
    location.reload()
  })
} else {
  clearButton.addEventListener("click", clearPicture)
}
captureButton.addEventListener("click", takePicture)
getPermissions()
clearPicture()

