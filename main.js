'use strict';
var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var {Menu} = require('electron');
var fs = require('fs');


// initializes the main window when the application is launched
var mainWindow = null;
app.on('ready', function() {
    // sets as new browser windows with these properties
    mainWindow = new BrowserWindow({
        height: 800,
        width: 1200,
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
                // opens up bookmarks page from file menu
                label: 'Bookmarks',
                accelerator: 'CmdOrCtrl+B',
                click() {
                    var bookmarksWindow = new BrowserWindow({
                        autoHideMenuBar: true,
                        icon: "./app/images/testIcon.png"
                    });

                    bookmarksWindow.loadURL('file://' + __dirname + '/app/bookmarksWindow.html');
                }
            },
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

// TODO when the main window is closed, application is closed
ipcMain.on('close-main-window', function () {
   app.quit();
});

// initializes the history window
var historyWindow = null;
ipcMain.on('open-history-window', function () {
    // will not create new history window if it is already open
    if(historyWindow){
        return;
    }

    // sets properties to history window
    historyWindow = new BrowserWindow({
        height: 500,
        width: 1024,
        alwaysOnTop: true,
        icon: "./app/images/testIcon.png"
    });

    // loads historyWindow.html
    historyWindow.loadURL('file://' + __dirname + '/app/historyWindow.html');

    // sets back to null when the window is closed
    historyWindow.on('closed', function () {
        historyWindow = null;
    });

});

// event for when closing the history window
ipcMain.on('close-history-window', function (event, arg) {
    // sends event message to other web pages
    mainWindow.webContents.send('close-history-window', arg);
    historyWindow.close();
});

// initializes bookmarks window
var bookmarksWindow = null;
ipcMain.on('open-bookmarks-window', function () {

    // will not create bookmarks window if it is already created
    if(bookmarksWindow){
        return;
    }

    // sets these properties when it is opened
    bookmarksWindow = new BrowserWindow({
        autoHideMenuBar: true,
        icon: "./app/images/testIcon.png"
    });

    // loads bookmarksWindow.html
    bookmarksWindow.loadURL('file://' + __dirname + '/app/bookmarksWindow.html');

    // sets back to null when the window is closed
    bookmarksWindow.on('closed', function () {
        bookmarksWindow = null;
    });
});

// event for when closing the bookmarks window
ipcMain.on('close-bookmarks-window', function (event, arg) {
    // sends event message to other web pages
    mainWindow.webContents.send('close-bookmarks-window', arg);
    bookmarksWindow.close();
});