captureDelay = 3
reloadEachTime = true
flipVideo = true
cameraFacing = "user" /*"user" or "environment*/

ws = new WebSocket(document.location)

width = window.innerWidth
height = 0/*Will be computed later*/
permission = false
filtersSet = false
dataArray = false/*Used to store the most recently taken photo*/
printAfterUpload = false/*Used to determine if the photo should be printed as soon as it is uplaoded*/
uploadedFile = false/*Used to store the name of the most recently uploaded file*/

disconnected = document.getElementsByClassName("disconnected")[0]
video = document.getElementsByClassName("video")[0]
canvas = document.getElementsByClassName("canvas")[0]
foreground = document.getElementsByClassName("foreground")[0]
countdownContainer = document.getElementsByClassName("countdown-container")[0]
countdown = document.getElementsByClassName("countdown")[0]
foregroundSelect = document.getElementsByClassName("foreground-select")[0]
preCapture = document.getElementsByClassName("pre-capture")[0]
midCapture = document.getElementsByClassName("mid-capture")[0]
postCapture = document.getElementsByClassName("post-capture")[0]
captureButton = document.getElementsByClassName("capture")[0]
clearButton = document.getElementsByClassName("clear")[0]
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
			let foregroundElement = document.createElement("option")
			foregroundElement.innerHTML = foregroundName.replace(/\..*/, "")
				.replace("-", " ")
				.replace("_", " ")
			foregroundElement.value = "assets/" + foregroundName
			foregroundSelect.appendChild(foregroundElement)
		})
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
	
	preCapture.style.display = "flex"
	midCapture.style.display = "none"
	postCapture.style.display = "none"
	qrContainer.style.display = "none"
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

	preCapture.style.display = "none"
	midCapture.style.display = "flex"
	postCapture.style.display = "none"
	qrContainer.style.display = "none"

	countdownTimer = setInterval(function() {
		countdown.innerHTML = parseInt(countdown.innerHTML) - 1
		if(parseFloat(countdown.innerHTML) <= 0) {
			clearTimeout(countdownTimer)
			if(!filtersSet) {
				/*Get the computed CSS filter from the video element.*/
				const videoStyles = window.getComputedStyle(video)
				const filterValue = videoStyles.getPropertyValue("filter")
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
			let dataURL = canvas.toDataURL("image/png")
			let parts = dataURL.split(",")
			let base64String = parts[parts.length - 1]
			dataArray = Uint8Array.fromBase64(base64String)

			preCapture.style.display = "none"
			midCapture.style.display = "none"
			postCapture.style.display = "flex"
			qrContainer.style.display = "none"
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

foregroundSelect.addEventListener("input", function() {
  if(foregroundSelect.value) {
    foreground.src = foregroundSelect.value
    foreground.style.display = "initial"
  } else {
    foreground.style.display = "none"
  }
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

getPermissions()
clearPicture()
if(reloadEachTime) {
  clearButton.addEventListener("click", function() {
    location.reload()
  })
} else {
  clearButton.addEventListener("click", clearPicture)
}
captureButton.addEventListener("click", takePicture)

