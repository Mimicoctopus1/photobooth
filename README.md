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

# Installation
Simply install [Node.js](https://nodejs.org) and run these commands in your terminal.
```bash
git clone https://codeberg.org/Mimicoctopus1/photobooth
cd photobooth
npm install
npm run start # Alternatively, index.js has a shebang so you can double-click it from your file manager if you give yourself permission
```
Then, open up [your ip address]:8080.  
See [here](#other-ports) to use other ports

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

# Other Ports
You can make a `.env` file and add this:
```
PORT=[your port here]
```
or run either of these:
```bash
npm run start -- --port [your port here]
PORT=[your port here] npm run start
```

# Verbose
To get a bunch of details, use the `--verbose` flag.
```bash
npm run start --verbose
```

# Live Commands
*While* the program is running, you can type in these commands directly into the terminal.  
<table>
<thead>
    <tr>
        <th>Syntax</th>
        <th>Effect</th>
    </tr>
</thead>
<tbody>
    <tr>
        <td><code>population</code></td>
        <td>Tells you how many users are connected, including the actual device taking the pictures</td>
    </tr>
    <tr>
        <td><code>images</code></td>
        <td>Tells you how many images there are saved.</td>
    </tr>
    <tr>
        <td><code>delete</code></td>
        <td>Deletes all the images.</td>
    </tr>
    <tr>
        <td><code>delete { &ltstart&gt-&ltend&gt | &ltamount&gt@&ltfirst&gt | &ltindex&gt } [arg1] [arg2] ... [argN]</code></td>
        <td>
            Deletes based on the arguments in the list. The following all delete elements 6, 7, and 8.
            <ul>
                <li>delete 6 7 8</li>
                <li>delete 6-8</li>
                <li>delete 3@6</li>
                <li>delete 6 7-7 1@8</li>
            </ul>
        </td>
    </tr>
    <tr>
        <td><code>backup[ file]</code></td>
        <td>Saves all the photos to the file specified. If not specified, to the default save file, only with an `.old` extension added.</td>
    </tr>
    <tr>
        <td><code>load[ file]</code></td>
        <td>Loads images from the file specified, or the default save file, only with an `.old` extension added.</td>
    </tr>
    <tr>
        <td><code>kick</code></td>
        <td>Kicks everybody off of the server.</td>
    </tr>
</tbody>
</table>