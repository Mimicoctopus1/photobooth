# Photobooth

This is a photobooth made in Node.js and the ws and express modules
Features include:
* Support for [foregrounds](#foregrounds)
* A pre-set foreground just for proof
* Live population and number-of-saved-images monitor
* Customizable capture delay timer
* Download page
* Add [filters](#filters) like contrast, brightness, and blur
* Photos (PNG format) stored as binary strings in memory as well as in .data/photos
* Easy server-side TUI for erasing captures and saving archives

To-do list:
* Automatic printing

# Installation

## HTTPS Disclaimer

Because of some updates, browsers won't let a website access the camera except in secure contexts. `navigator.getUserMedia` will return undefined. So, you have to go and [get yourself some HTTPS credentials](#https).

## Instructions

Simply install [Node.js](https://nodejs.org) and run these commands in your terminal.
```bash
git clone https://codeberg.org/Mimicoctopus1/photobooth
cd photobooth
npm install
npm run start # Alternatively, index.js has a shebang so you can double-click it from your file manager.
```
Then, open up [your ip address]:8080.  
See [here](#other-ports) to use other ports.

# HTTPS

## Getting a Public IP

To get credentials, you first need a domain. However, to get a domain, you need a public IP (Internet Protocol) address. An IP address is just the address of your computer that tells people where to find you. To find your IP address, run
```sh
# Unix (Linux MacOS, etc.)
ip address

# Unix (Linux, MacOS, etc.) Alternative
ifconfig # That is ifconfig with an "f".

# Windows
ipconfig /all
```
There are two protocols for IP addresses: IPv4 and IPv6.
<table>
	<thead>
		<tr>
			<th>Protocol</th>
			<th>IPv4</th>
			<th>IPv6</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<th>Compatability</th>
			<th>Older, compatable with basically all devices</th>
			<th>Newer, compatable with most devices</th>
		</tr>
		<tr>
			<th>Number of Total Addresses</th>
			<th>4,294,967,296</th>
			<th>340,282,366,920,938,463,463,374,607,431,768,211,456 (45 quintillion times the number of grains of sand on Earth)</th>
		</tr>
		<tr>
			<th>NAT (Network Address Translation)</th>
			<th>You may share an address with someone else, and all you get is a nickname (like offices in a building that share a street address)</th>
			<th>There are enough addresses that everyone can get their own</th>
		</tr>
	</tbody>
</table>

Now, you need to look at the output of the previous command. Look for lines that start with `IP Address`, `IPv4 Address`, `inet`, `IPv6 Address`, or `inet6`. ***Note that `link-local` and `Link-Local Address` do not count because they are like nicknames that only one person in the world calls you***. In these lines, look for patterns like `123`.`123`.`123`.`123` (IPv4, four parts) and `ab12`:`cd34`:`ef56`:`1ab2`::`5ef6` (IPv6, eight parts, but "::" essentially says that the missing parts belong there and are all zeroes). These are your IP addresses. Next, check if they are public or not. If they aren't "special addresses", they are probably public addresses. On Wikipedia, you can check for [special addresses](https://en.wikipedia.org/wiki/Reserved_IP_addresses). Remember that in hexadecimal, the number system used in IPv6, the letters start with 10 (a) and go up to f (15). If you don't have a public IP, you will have to set up port forwarding, which forwards all traffic on a certain port to a device of your choice. If you do have a public IP, try pinging it (open the "Command Prompt", "Console", or "Terminal" app on your computer and type `ping <your address here>` (don't include the angle brackets ("<" and ">"))) from outside your network (from your mobile phone's cell service (no Wi-Fi) or from someone else's house). If it doesn't work, you may need to install a pinhole (which usually uses the same interface as port forwarding), especially if it is an IPv6 address. The reason you may need to do this is because your router's firewall is blocking any unsolicited traffic. If you can ping your public IP from outside your network, you can skip port forwarding.

## Port Forwarding

### Disclaimer

Note that port forwarding will not work if you are behind CGNAT. If you are behind regular NAT, all the devices on your network share one public IP address. If you are behind CGNAT, your router gets a private address and only your ISP's (Internet Service Provider's) router which provides access to not only you but many other clients gets a public IP. Since that router would not be only for you but for other people as well, you can't set up port forwading on it. You can look up if your ISP uses CGNAT.

### Instructions

First, log into your router. You can check in your device's settings to try to find its IP (it may be labeled as the "default gateway"). If you can't find it, try guessing. Take your own private address (check the Wikipedia chart for help), and replace the last part with `1`. Just type it into your web browser and it should open. If it is IPv6 and your browser looks it up in your search engine instead, try surrounding the address in square brackets "[" and "]". When the router's page loads, log in. If you haven't set the credentials before, look on your physical router's label or guess `admin` as the username and `password` as the password. When you are in, look for "Port Forwarding" and add your device for ports 80 and 443 (you may need to make two rules, one for each port). If it asks for internal *and* external ports, use the same ports for both. If it offers, select TCP. Once this is complete, try pinging your own device from outside your network again. If it doesn't work, look again and make sure you saved all your changes. It it still doesn't work, ask an expert (AKA your friendly neighborhood search engine). Once you have set up port forwarding and the ping works, move on, but now you can use your router's public address as your own. To find it, you can look up ["what is my ip" on DuckDuckGo](https://lite.duckduckgo.com/lite/?q=what%20is%20my%20ip). It should be above even the first result, in small font.

## Getting a Domain

To get credentials, you first need a domain. You can buy a domain (example.com, example.org, example.net etc.), or just get a subdomain (*helloworld*.generic.website). [FreeDNS](https://freedns.afraid.org) is suggested. To use it, just sign up, go to the "subdomains" tab, and add one. Use the "A record" option if your public address (or your router's if you set up port forwarding) is IPv4 and the "AAAA record" option if it's IPv6. Then, continue [below](#getting-credentials). You will get a domain like `anythingyouchoose.somethingsomeoneprovides.com`. For the IP address, put your public address, or your router's public address if you set up port forwarding.

## Getting Credentials
It is suggested to use [Let's Encrypt](https://letsencrypt.org) with Certbot. [Install it](https://certbot.eff.org/instructions) (use "other" for software), but stop before whichever command uses the word "certonly" and use this command instead:
```sh
# Unix
sudo certbot certonly

# Windows
certbot certonly
```
Answer the questions. If it asks for your webroot, choose the public folder in this directory. Once it saves your credentials, continue, but remember the path to which the credentials are saved (for example, on Linux, this is usually `/etc/letsencrypt/live/<your domain>`).

## Using Credentials

To use your credentials, run [`index.js`](index.js) with the `--credentials` flag and then the path to the credentials.
```sh
node index.js --credentials /etc/letsencrypt/live/example.com
```
Remember, if you are using the npm scripts, you need to put `--` to notate that you are feeding the options into `node index.js`, not `npm run {start|dev}`.
```sh
npm run start -- --credentials /etc/letsencrypt/live/example.com
npm run dev -- --credentials /etc/letsencrypt/live/example.com
```
Note that the default ports are `8080` (HTTP) and `8443` (HTTPS). By default, browsers, when opening a URL, check for websites on ports `80` (HTTP) and `443` (HTTPS). [Change the ports the server uses](#ports) if you don't want to have to specify the port manually on your browser.

# Foregrounds

Foregrounds are stored in [`public/assets`](public/foregrounds) as `.png` files. To make your own, follow these steps:
* Take a picture of the foreground, draw it on your computer, or get it in some way.
* Remove the background of the foreground so it is transparent. If you don't want to install anything, you can use tools online like [remove.bg](https://www.remove.bg) (note that the free version images are not high resolution, but they're not that bad).
* Make sure it is in `png`, `jpg`, or `webp` format, or something else that is compatible with your average browser. Again, there are services online for this like [CloudConvert](https://cloudconvert.com).
* Name the file. In the actual photobooth, any hypens ("-") will be replaced with spaces, and the first period (".") and anything after it will be removed.
* Put it in [`public/assets`](public/assets).

# Filters

Most CSS filters can be added in the download page. Some that were excluded are grayscale (because we have saturation) and url (because your average individual will be absolutely befuddled).
Filters that are included:
* Color Inversion
* Blur
* Opacity
* Hue Rotation
* Brightness
* Contrast
* Saturation
* Sepia

# Settings

## Ports

You can run either of these:
```bash
npm run start -- --port <your port here>
PORT=<your port here> npm run start
```
to change the port that the server hosts the website on.
To change the port that the server uses not for HTTP but HTTPS, run either of these:
```bash
npm run start -- --secure-port <your secure port here>
SECUREPORT=<your secure port here> npm run start
```

## Image Folder

You can run either of these
```bash
npm run start -- --save-folder <folder to use>
npm run start -- -s <folder to use>
SAVEFOLDER=<folder to use> npm run start
```

# Verbose

To get a bunch of details, use the `--verbose` flag.
```bash
npm run start -- --verbose
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