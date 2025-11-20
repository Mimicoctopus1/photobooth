captureDelay = 3
reloadEachTime = true

ws = new WebSocket(document.location)

width = window.innerWidth
height = 0/*Will be computed later*/
permission = false
filtersSet = false

disconnected = document.getElementsByClassName("disconnected")[0]
video = document.getElementsByClassName("video")[0]
canvas = document.getElementsByClassName("canvas")[0]
photo = document.getElementsByClassName("photo")[0]
background = document.getElementsByClassName("background")[0]
qrLink = document.getElementsByClassName("qr-link")[0]
qr = document.getElementsByClassName("qr")[0]
countdown = document.getElementsByClassName("countdown")[0]
backgroundSelect = document.getElementsByClassName("background-select")[0]
captureButton = document.getElementsByClassName("capture")[0]
clearButton = document.getElementsByClassName("clear")[0]

ws.responses = {
  
}

ws.addEventListener("message", function(event) {
	let type = JSON.parse(event.data).type
	let data = JSON.parse(event.data).data
	if(ws.responses[type]) {
    ws.responses[type](data)
  }
})

ws.addEventListener("close", function() {
  disconnected.style.display = "block"
})

context = canvas.getContext("2d")

qrcode = new QRCode(qr, {
  text: document.location + "/download",
  colorDark: "#000000",
  colorLight: "#ffffff"
})
qrLink.href = document.location + "/download"

video.addEventListener("canplay", function(event) {
  if(!width || !height) {
    height = video.videoHeight / (video.videoWidth / width)

    video.width = width
    video.height = height
    canvas.width = width
    canvas.height = height
    background.width = width
    background.height = height
  }
})

clearPicture = function() {
  context.clearRect(0, 0, canvas.width, canvas.height)
  const data = canvas.toDataURL("image/png")
  photo.src = data
  photo.style.display = "none"
  qr.style.display = "none"
  captureButton.style.display = "inline-block"
  clearButton.style.display = "none"
}

requestPermissions = function() {
  navigator.mediaDevices
    .getUserMedia({video: true, audio: false})
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
  countdown.style.display = "inline-block"
  countdownTimer = setInterval(function() {
    countdown.innerHTML = parseInt(countdown.innerHTML) - 1
    if(parseFloat(countdown.innerHTML) <= 0) {
      clearTimeout(countdownTimer)
      countdown.style.display = "none"
      if(!filtersSet) {
        /*Get the computed CSS filter from the video element.*/
        const videoStyles = window.getComputedStyle(video)
        const filterValue = videoStyles.getPropertyValue("filter")
        /*Apply the filter to the canvas drawing context.
        If there's no filter (i.e., it returns "none"), default to "none".*/
        context.filter = filterValue || "none"
        filtersSet = true
      }
      
      context.save()
      context.scale(-1, 1)
      context.drawImage(video, 0, 0, -width, height)
      context.restore()
      if(backgroundSelect.value != "") {
        context.drawImage(background, 0, 0, width, height)
      }
      photo.src = canvas.toDataURL("image/png")
      photo.style.display = "inline-block"
      qr.style.display = "inline-block"
      captureButton.style.display = "none"
      clearButton.style.display = "inline-block"
      
      ws.send(JSON.stringify({
        "type": "save image",
        "data": photo.src
      }))
    }
  }, 1000)
}

backgroundSelect.addEventListener("input", function() {
  if(backgroundSelect.value) {
    background.src = "backgrounds/" + backgroundSelect.value
    background.style.display = "initial"
  } else {
    background.style.display = "none"
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
