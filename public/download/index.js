ws = new WebSocket(document.location)

loadingSign = document.getElementsByClassName("loading-sign")[0]
noPhotosSign = document.getElementsByClassName("no-photos-sign")[0]
photos = document.getElementsByClassName("photos")[0]
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
                    context.drawImage(this, 0, 0, this.naturalWidth, this.naturalHeight)
                    downloadPrepper.toBlob(function(blob) {
                        download = new File([blob], Math.floor(Math.random() * 1000000) + ".png")
                        downloadURL = URL.createObjectURL(download)
                        downloader.href = downloadURL
                        downloader.download = download.name
                        downloader.click()
                        URL.revokeObjectURL(downloadURL)
                        loadingSign.style.display = "none"
                    })

                })
                console.log(document.body.innerHTML)
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
