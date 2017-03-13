'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var mainWindow = null;
var {Menu} = require('electron');
var fs = require('fs');

app.on('ready', function() {
    mainWindow = new BrowserWindow({
        height: 1100,
        width: 1500,
        fullscreenable: false,
        title: "Lightning SFTP",
        icon: "./app/images/testIcon.png"
    });

    fs.stat("ConnectionHistory.json", function (err, stat) {
        if(err == null){
            console.log("File Exists");
        }
        else if(err.code == 'ENOENT'){
            fs.writeFile("ConnectionHistory.json", '{"connectionHistory":[]}');
        }
    });
    fs.stat("Bookmarks.json", function (err, stat) {
        if(err == null){
            console.log("File Exists");
        }
        else if(err.code == 'ENOENT'){
            fs.writeFile("Bookmarks.json", '{"Bookmarks":[]}');
        }
    });
    fs.stat("tree.json", function (err, stat) {
        if(err == null){
            console.log("File Exists");
        }
        else if(err.code == 'ENOENT'){
            fs.writeFile("tree.json", '{"core":{"data":[]}}');
        }
    });

    mainWindow.loadURL('file://' + __dirname + '/app/index.html');
});


const template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'New Connection',
                accelerator: 'CmdOrCtrl+N',
                click() {
                    var connectionWindow = new BrowserWindow({
                        height: 350,
                        width: 350,
                        alwaysOnTop: true,
                        resizable: false,
                        autoHideMenuBar: true
                    });

                    connectionWindow.loadURL('file://' + __dirname + '/app/connectionWindow.html');

                    connectionWindow.on('closed', function () {
                        connectionWindow = null;
                    });
                }
            },
            {
                label: 'Bookmarks',
                accelerator: 'CmdOrCtrl+B',
                click() {
                    var bookmarksWindow = new BrowserWindow({

                    });
                }
            },
            {
                label: 'Exit',
                role: 'close'
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload()
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.webContents.toggleDevTools()
                }
            }
        ]
    }
]

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

const {ipcMain} = require('electron');
ipcMain.on('close-main-window', function () {
   app.quit();
});

var historyWindow = null;
ipcMain.on('open-history-window', function () {

    if(historyWindow){
        return;
    }

    historyWindow = new BrowserWindow({
        height: 500,
        width: 1024,
        alwaysOnTop: true,
        icon: "./app/images/testIcon.png"
    });

    historyWindow.loadURL('file://' + __dirname + '/app/historyWindow.html');

    historyWindow.on('closed', function () {
        historyWindow = null;
    });

});

ipcMain.on('close-history-window', function (event, arg) {
    mainWindow.webContents.send('close-history-window', arg);
    historyWindow.close();
});

var passwordWindow = null;
ipcMain.on('open-enter-password-window', function () {

    if(passwordWindow){
        return;
    }

    passwordWindow = new BrowserWindow({
        height: 100,
        width: 275,
        alwaysOnTop: true,
        resizable: true,
        autoHideMenuBar: true
    });

    passwordWindow.loadURL('file://' + __dirname + '/app/passwordWindow.html');

    passwordWindow.on('closed', function () {
        passwordWindow = null;
    });
});
ipcMain.on('close-password-window', function () {
    passwordWindow.close();
});

ipcMain.on('receive-info', function () {
    console.log("Received Info");
});

var bookmarksWindow = null;
ipcMain.on('open-bookmarks-window', function () {
    if(bookmarksWindow){
        return;
    }

    bookmarksWindow = new BrowserWindow({
        autoHideMenuBar: true,
        icon: "./app/images/testIcon.png"
    });

    bookmarksWindow.loadURL('file://' + __dirname + '/app/bookmarksWindow.html');

    bookmarksWindow.on('closed', function () {
        bookmarksWindow = null;
    });
});
ipcMain.on('close-bookmarks-window', function (event, arg) {
    mainWindow.webContents.send('close-bookmarks-window', arg);
   bookmarksWindow.close();
});