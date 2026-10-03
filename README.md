# Pictocrat

Do you have a ton of photos that you would like to display but you don't have time to manage them? Are you fed up of the thousand photos of Aunt Ethel's 3rd wedding that you haven't had time to triage poluting your slideshow screensaver?

Then the amazing Pictocrat is the solution you never knew you needed!

Pictocrat is a combination slideshow/picture organizer for the time-poor.
Set it to watch your picture folder, and it will start a slideshow which can be paused and resumed at any time so that you can organize your photos bit by bit at your leisure.
Did that photo that your mom took of you as a kid holding a leaf in front of your weener just come up?  Pause, then delete it or simply hide it, and continue your slideshow undisturbed by embarrassing memories!
Fell out with Aunt Ethel? Delete or hide the directory holding her wedding photos with a simple click!

## Features

Disclaimer: This is Alpha software so it's highly probable that some things may not work as expected.

* Runs on a home server and plays in any browser - a kitchen tablet, a TV, a laptop.
* Random slideshow - shows every picture once before repeating any.
* Automatic scan - picks up new and removed pictures every 30 minutes, or on demand.
* Browse the history - go back and forth through the last 20 pictures, or swipe on a touch screen.
* Triage - delete unwanted pictures or folders whenever you want. They go to a trash you can restore from for 30 days.
* Hide - hide pictures or folders and unhide them later from the settings.
* Rotate - rotate your images without editing the actual file!
* Dates - shows when each picture was taken, from its EXIF data or a date in its folder or file name.
* New pictures first - optionally, pictures added since the first scan play before the random order resumes.

## Planned features

* Keyboard controls.
* Hide/unhide or delete images by selecting from a group of thumbnails
* Multiple picture folders
* Tag pictures into categories
* Play slideshows by category
* Caption pictures

## Install

Pictocrat runs as a Docker container. Point it at your picture folder:

```
git clone https://github.com/hercemer42/pictocrat.git
cd pictocrat
docker build -t pictocrat .
docker run -d --name pictocrat --restart unless-stopped -p 8095:8095 \
  -v /path/to/your/pictures:/pictures \
  -v pictocrat-data:/data \
  pictocrat
```

Then open `http://<your-server>:8095`.

* Deleted pictures go to a hidden `.pictocrat-trash` folder inside the picture folder and are removed for good after 30 days. Keep a backup of the picture folder anyway.
* There is no login: anyone who can reach the port can hide and delete pictures. Keep it on your home network.
* The container runs as uid 1000. Add `--user <uid>:<gid>` if your pictures belong to another user.

### Development

Needs Node 24 or later.

```
npm install && npm --prefix web install
mkdir -p data && PICTURES=~/Pictures DB=data/pictocrat.db npm start   # API and photos on :8095
npm --prefix web run dev                                               # UI with hot reload, proxied to :8095
npm test
```

## Stack
[Node.js](https://nodejs.org/en/) 24 (its built-in SQLite, running TypeScript directly) with [Express](https://expressjs.com/) on the server, [React](https://react.dev/) and [Vite](https://vite.dev/) in the browser.

## Need
The project was concieved to fulfil a family need. We have a Linux box in our kitchen that we use as a server, for music and to view our family photos.  The default Linux slideshow screensaver (XScreensaver) is great, but it has a tendency to replay the same photos over and over, and you can't interact with it.  I don't really have the time or patience to sit down and triage almost 2 decades worth of digital photos, and I needed a personal project to practise my development skills, so Pictocrat was born!

That Linux box is long gone. Pictocrat now runs on our home server, and the kitchen screen is an Android tablet showing it in a browser.

## History
Pictocrat started in 2020 as an Electron and Angular desktop app, written between May and December of that year. That version is tagged [`0.9.0`](https://github.com/hercemer42/pictocrat/tree/0.9.0); the [`electron-wip`](https://github.com/hercemer42/pictocrat/tree/electron-wip) branch holds the last few minutes of work on it that were never committed at the time. In 2026 it was rewritten as a self-hosted web app, so it can play on any screen in the house.

## License 
https://github.com/hercemer42/pictocrat/blob/master/LICENSE.md