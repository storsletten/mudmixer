# MUDMixer
MUDMixer is a MUD client add-on with middleware support for customizing the traffic between clients and servers in a many-to-many relationship.

## Installation
Download and install the latest recommended version of Node.js from [nodejs.org](https://nodejs.org/).
Developed using Node 15, but versions 10 through 14 may also work (not tested!).

## Usage
If you prefer to run MUDMixer without a console window (recommended for most Windows users), then launch the file called Start.vbs that is located inside this package folder.

Then use a MUD client of your choice to connect to:
- Host: localhost
- Port: 7788

The following VBScripts located in the root of this package may be helpful (Windows only):
- Start.vbs - Starts MUDMixer without a console window.
- Enable Auto Start.vbs - Creates a MUDMixer shortcut for Start.vbs in the startup folder.
- Disable Auto Start.vbs - Removes the MUDMixer shortcut from the startup folder.

If you would like to run MUDMixer with a console window (mostly just for developers), then use:
```
npm start
```

Or from within an interactive Node window:
```js
const mx = require('./src/main.js');
mx.start();
```

## Features
- Supports SSL/TLS for encrypting communication with servers.
- Supports middleware for fully customizing traffic between client and server.
- Automatically reconnects to servers after connections drop.
- Creates neatly organized log files of your sessions.

## Parameters
You can pass the following parameters to MUDMixer:

- -q - Suppresses message boxes that indicate whether MUDMixer started successfully or if another instance is already running.
- -d <directory> - Use this flag to set a user data directory for MUDMixer.

Examples:
```
npm start -- -d C:\Users\MyName\MUDMixer
```

The -- (double hyphen) tells npm to pass the subsequent parameters directly to MUDMixer.

```
npm start -- -q -d ../MUDMixer Data
```

When using relative paths with the -d flag, it will be relative to current working directory.

These parameters can also be passed to Start.vbs if you would like to run MUDMixer without a console window. The only difference is that you use // (double slash) instead of -- (double hyphen). For example:
```
.\Start.vbs // -q -d ../MUDMixer Data
```
