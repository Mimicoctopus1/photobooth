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
downloadPrepper = document.getElementsByClassName("download-prepper")[0]
downloader = document.getElementsByClassName("downloader")[0]

context = downloadPrepper.getContext("2d")

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
                let imageContainer = document.createElement("div")
                
                let image = document.createElement("img")
                image.src = photo

                let triangle = document.createElement("div")
                triangle.className = "triangle"

                let imageNumber = document.createElement("div")
                imageNumber.className = "image-number"
                imageNumber.innerHTML = index
                

                photos.prepend(imageContainer)
                imageContainer.append(image)
                imageContainer.append(triangle)
                imageContainer.append(imageNumber)
                image.addEventListener("click", function(event) {
                    loadingSign.style.display = "block"
                    downloadPrepper.width = this.naturalWidth
                    downloadPrepper.height = this.naturalHeight
                    context.filter = filter
                    context.drawImage(this, 0, 0, this.naturalWidth, this.naturalHeight)
                    downloadPrepper.toBlob(function(blob) {
                        if(filenameChooser.value == "") {
                            filename = (Math.random() + ".png").slice(2)
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
