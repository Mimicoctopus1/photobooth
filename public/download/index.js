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
    document.body.style.display = "none"
    disconnected.style.display = "initial"
})

ws.responses = {
    "download images": function(data) {
        photos.innerHTML = ""
        if(data.length <= 0) {
            noPhotosSign.display = "block"
        }
        data.forEach(function(photo) {
            let img = document.createElement("img")
            img.src = photo
            photos.prepend(img)
            img.style.width = "50vw"
            img.addEventListener("click", function(event) {
                loadingSign.style.display = "block"
                let imageDownloader = document.createElement("a")
                imageDownloader.href = this.src
                imageDownloader.download = Math.round(Math.random() * 10000) + ".png"
                imageDownloader.click()
                delete imageDownloader
                setTimeout(function() {
                    loadingSign.style.display = "none"
                }, 1000)
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
