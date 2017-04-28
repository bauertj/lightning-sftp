'use strict';
var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var {Menu} = require('electron');
var fs = require('fs');


// initializes the main window when the application is launched
var mainWindow = null;
app.on('ready', function() {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;

    var tempWidth = width * .9;
    var tempHeight = height * .8;
    console.log(tempWidth + " " + tempHeight);
    // sets as new browser windows with these properties
    mainWindow = new BrowserWindow({
        height: parseInt(tempHeight),
        width: parseInt(tempWidth),
        fullscreenable: false,
        title: "Lightning SFTP",
        icon: "./app/images/testIcon.png"
    });

    // checks if connection history json file exists, if not it will create it
    fs.stat("ConnectionHistory.json", function (err, stat) {
        if(err == null){
            console.log("File Exists");
        }
        else if(err.code == 'ENOENT'){
            fs.writeFile("ConnectionHistory.json", '{"connectionHistory":[]}');
        }
    });
    // checks if bookmark json file exists, if not it will create it
    fs.stat("Bookmarks.json", function (err, stat) {
        if(err == null){
            console.log("File Exists");
        }
        else if(err.code == 'ENOENT'){
            fs.writeFile("Bookmarks.json", '{"Bookmarks":[]}');
        }
    });

    // load main html page, index.html
    mainWindow.loadURL('file://' + __dirname + '/app/index.html');
});


// this is a template for the drop down file menus at the top
// can add more functionality later when we have more features
const template = [
    {
        label: 'File',
        submenu: [
            {
                // closes window
                label: 'Exit',
                role: 'close'
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                // reloads page
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload()
                }
            },
            {
                // developer tools
                label: 'Toggle Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.toggleDevTools()
                }
            }
        ]
    }
]

// builds the template menu into page, updating default
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// ipcMain is used to communicate events
const {ipcMain} = require('electron');