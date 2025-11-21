# Photobooth
This is a photobooth made in Node.js and the ws and express modules
Features include:
* Support for [backgrounds](#backgrounds)
* A pre-set background just for proof
* Customizable capture delay timer
* Download page
* Photos stored as a txt file
* Easy server-side TUI for erasing captures and saving archives

To-do list:
* Automatic printing

# Backgrounds
Backgrounds are stored in [`public/backgrounds`](public/backgrounds) as `.png` files. To make your own, follow these steps:
* Take a picture of the background, draw it on your computer, or get it in some way.
* Remove the background so it is transparent. If you don't want to install anything, you can use tools online like [remove.bg](https://www.remove.bg) (note that the free version images are not high resolution, but they're not that bad).
* Make sure it is in `png`, `jpg`, or `webp` format, or something else that is compatible with your average browser. Again, there are services online for this like [CloudConvert](https://cloudconvert.com).
* Put it in [`public/backgrounds`](public/backgrounds).
* Go into [`public/index.html`](public/index.html), find the comment that shows you what code to add, and add the code:
```html
<option value="name-in-background-folder.png">Title</option>
```