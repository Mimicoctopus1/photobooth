ws = new WebSocket(document.location)

loadingSign = document.getElementsByClassName("loading-sign")[0]
noPhotosSign = document.getElementsByClassName("no-photos-sign")[0]
photos = document.getElementsByClassName("photos")[0]

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
        }
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
            imageContainer.href = photo
            imageContainer.download = Math.round(Math.random() * 10000) + ".png"
            imageContainer.addEventListener("click", function(event) {
                event.target.style.opacity = "0.5"
                setTimeout(function() {
                    event.target.style.opacity = "1"
                }, 50)
                let imageDownloader = document.createElement("a")
                imageDownloader.href = this.href
                imageDownloader.download = this.download
                imageDownloader.click()
                delete imageDownloader
            })
        })
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
