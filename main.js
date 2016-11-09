'use strict';

var electron = require('electron');
var app = electron.app;
var BrowserWindow = electron.BrowserWindow;
var mainWindow = null;


app.on('ready', function() {
    mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        fullscreenable: false,
        title: "Lightning SFTP"
    });

    mainWindow.loadURL('file://' + __dirname + '/app/index.html');
});


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
        width: 1024
    });

    historyWindow.loadURL('file://' + __dirname + '/app/historyWindow.html');

    historyWindow.on('closed', function () {
        historyWindow = null;
    });

});