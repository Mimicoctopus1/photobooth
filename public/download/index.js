ws = new WebSocket(document.location)

disconnected = document.getElementsByClassName("disconnected")[0]
loadingSign = document.getElementsByClassName("loading-sign")[0]
noPhotosSign = document.getElementsByClassName("no-photos-sign")[0]
photos = document.getElementsByClassName("photos")[0]
footerInput = document.querySelectorAll(".footer input")
inverter = document.getElementsByClassName("inverter")[0]
blurrer = document.getElementsByClassName("blurrer")[0]
opacatier = document.getElementsByClassName("opacitier")[0]
hueRotator = document.getElementsByClassName("hue-rotator")[0]
brightener = document.getElementsByClassName("brightener")[0]
contrastor = document.getElementsByClassName("contrastor")[0]
saturator = document.getElementsByClassName("saturator")[0]
sepiator = document.getElementsByClassName("sepiator")[0]
filenameChooser = document.getElementsByClassName("filename-chooser")[0]
actionSelector = document.getElementsByClassName("action-selector")[0]
reset = document.getElementsByClassName("reset")[0]
downloader = document.getElementsByClassName("downloader")[0]

filter = ""

ws.addEventListener("open", function() {
    ws.send(JSON.stringify({
        "type": "download",
        "data": undefined
    }))
})

ws.addEventListener("close", function() {
    disconnected.style.display = "block"
})

ws.responses = {
	"download": function(data) {
		photos.innerHTML = ""
		if(Object.keys(data).length) {
			Object.keys(data).forEach(function(file, index) {
				photo = data[file]
				photo = Uint8Array.from(photo)/*Convert 64-bit numbers to 8-bit numbers*/
				if(URL.createObjectURL) {/*If the browser supports it, Blob URL, otherwise, base64 DataURL*/
					photo = URL.createObjectURL(new Blob([photo]))
				} else {
					photo = photo.toBase64()
					photo = "data:image/png;base64," + photo
				}
				let imageContainer = document.createElement("div")
				
				let image = document.createElement("img")
				image.src = photo
				
				image.addEventListener("load", function() {
					let canvas = document.createElement("canvas")
					canvas.className = "photo"
					let context = canvas.getContext("2d")
					canvas.width = image.naturalWidth
					canvas.height = image.naturalHeight
					context.drawImage(image, 0, 0, canvas.width, canvas.height)
					
					let filename = document.createElement("div")
					filename.className = "filename"
					filename.innerHTML = file

					photos.prepend(imageContainer)
					imageContainer.append(canvas)
					imageContainer.append(filename)
					imageContainer.addEventListener("click", function(event) {
						loadingSign.style.display = "block"
						let canvas = this.getElementsByClassName("photo")[0]	
						let filename = this.getElementsByClassName("filename")[0]
						if(actionSelector.value == "download") {
							canvas.toBlob(function(blob) {
								file = filenameChooser.value
								if(filenameChooser.value) {
									file = filenameChooser.value
									if(file.slice(-4) != ".png") {
										file += ".png"
									}
								} else {
									file = filename.innerHTML
								}
								download = new File([blob], file)
								downloadURL = URL.createObjectURL(download)
								downloader.href = downloadURL
								downloader.download = download.name
								downloader.click()
								URL.revokeObjectURL(downloadURL)
								loadingSign.style.display = "none"
							})
						} else if(actionSelector.value == "print") {
							ws.send(JSON.stringify({
								"type": "print",
								"data": filename.innerHTML 
							}))
						}
					})
				})
			})
		} else {
			noPhotosSign.style.display = "block"
		}
		loadingSign.style.display = "none"
	}
}

ws.addEventListener("message", function(event) {
    let type = JSON.parse(event.data).type
    let data = JSON.parse(event.data).data
    if(ws.responses[type]) {
        ws.responses[type](data)
    }
})

updateFilter = function() {
    filter = "invert(" + inverter.value + "%) blur(" + blurrer.value + "px) opacity(" + opacatier.value + "%) hue-rotate(" + hueRotator.value + "deg) brightness(" + brightener.value + "%) contrast(" + contrastor.value + "%) saturate(" + saturator.value + "%) sepia(" + sepiator.value + "%)"

    photos.childNodes.forEach(function(photo, index) {
        photo.style.filter = filter
    })
}

footerInput.forEach(function(element, index) {
    element.addEventListener("input", function() {
        updateFilter()
    })
})

reset.addEventListener("click", function() {
    footerInput.forEach(function(element, index) {
        element.value = element.defaultValue
    })
    updateFilter()
})
