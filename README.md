# Pictocrat

Do you have a ton of photos that you would like to display but you don't have time to manage them? Are you fed up of the thousand photos of Aunt Ethel's 3rd wedding that you haven't had time to triage poluting your slideshow screensaver?

Then the amazing Pictocrat is the solution you never knew you needed!

Pictocrat is a combination slideshow/picture organizer for the time-poor.
Set it to watch your picture folder, and it will start a slideshow which can be paused and resumed at any time so that you can organize your photos bit by bit at your leisure.
Did that photo that your mom took of you as a kid holding a leaf in front of your weener just come up?  Pause, then delete it or simply hide it, and continue your slideshow undisturbed by embarrassing memories!
Fell out with Aunt Ethel? Delete or hide the directory holding her wedding photos with a simple click!

## Features

Disclaimer: This is Alpha software so it's highly probable that some things may not work as expected.

* Screensaver - automatically comes to the foreground when the computer is not in use.
* Random image viewer - randomly displays pictures without repeating any - then starts again.
* Automatic scan - periodically scans for changes to your picture folder.
* Browse the history - browse back and forth through the pictures that you have recently viewed.
* Triage - delete unwanted pictures or folders whenever you want.
* Hide - hide pictures or folders and unhide them later. 
* Rotate - rotate your images without editing the actual file!
* Cross platform!  Works in Linux, Mac and Windows (Tested only on Linux at the time of writing)

## Planned features

### V1 - Release

* Add visual effects for image transitions.
* Minimize to system tray.
* Back/forward buttons on hover.
* Full screen mode.
* Keyboard controls.
* Rasberry Pi compatability.

### V2

* Hide/unhide or delete images by selecting from a group of thumbnails
* Multiple picture folders
* Tag pictures into categories
* Play slideshows by category
* Caption pictures

### V3

* Cloud sync

## Install
I plan to provide builds for download for version 1.  For the moment, you'll have to build it.
I've only tested the linux build so far.
```
git clone git@github.com:hercemer42/pictocrat.git
npm install
npm run electron:linux
sudo chown root release/linux-unpacked/chrome-sandbox
sudo chmod 4755 release/linux-unpacked/chrome-sandbox
./release/linux-unpacked/pictocrat
```

## Stack
Built with [Electron](https://www.electronjs.org/), [NodeJs](https://nodejs.org/en/) and Angular.io.

## Need
The project was concieved to fulfil a family need. We have a Linux box in our kitchen that we use as a server, for music and to view our family photos.  The default Linux slideshow screensaver (XScreensaver) is great, but it has a tendency to replay the same photos over and over, and you can't interact with it.  I don't really have the time or patience to sit down and triage almost 2 decades worth of digital photos, and I needed a personal project to practise my development skills, so Pictocrat was born!

## Attribution
A shout out goes to [Maxime Gris](https://www.maximegris.fr), whose excellent Angular-Electron project I used to quickly bootstrap Pictocrat:

https://github.com/maximegris/angular-electron

## License 
https://github.com/hercemer42/pictocrat/blob/master/LICENSE.md