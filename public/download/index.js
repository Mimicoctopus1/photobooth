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
reset = document.getElementsByClassName("reset")[0]
downloader = document.getElementsByClassName("downloader")[0]

filter = ""

ws.addEventListener("open", function() {
    ws.send(JSON.stringify({
        "type": "download images",
        "data": undefined
    }))
})

ws.addEventListener("close", function() {
    disconnected.style.display = "block"
})

ws.responses = {
	"download images": function(data) {
		photos.innerHTML = ""
		if(data.length <= 0) {
			noPhotosSign.style.display = "block"
		} else {
			data.forEach(function(photo, index) {
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
					let context = canvas.getContext("2d")
					canvas.width = image.naturalWidth
					canvas.height = image.naturalHeight
					context.drawImage(image, 0, 0, canvas.width, canvas.height)
					
					let triangle = document.createElement("div")
					triangle.className = "triangle"

					let imageNumber = document.createElement("div")
					imageNumber.className = "image-number"
					imageNumber.innerHTML = index

					photos.prepend(imageContainer)
					imageContainer.append(canvas)
					imageContainer.append(triangle)
					imageContainer.append(imageNumber)
					canvas.addEventListener("click", function(event) {
						loadingSign.style.display = "block"
						this.toBlob(function(blob) {
							if(filenameChooser.value == "") {
								filename = (Date.now() + ".png").slice(2)
							} else {
								filename = filenameChooser.value
								if(filename.slice(-4) != ".png") {
									filename += ".png"
								}
							}
							download = new File([blob], filename)
							downloadURL = URL.createObjectURL(download)
							downloader.href = downloadURL
							downloader.download = download.name
							downloader.click()
							URL.revokeObjectURL(downloadURL)
							loadingSign.style.display = "none"
						})
					})
				})
			})
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