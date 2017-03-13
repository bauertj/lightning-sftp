const {ipcRenderer} = require('electron');

var settingsEl = document.querySelector('#connection');
settingsEl.addEventListener('click', function () {
    ipcRenderer.send('open-history-window');
});

var settingsE3 = document.querySelector('#bookmark');
settingsE3.addEventListener('click', function () {
   ipcRenderer.send('open-bookmarks-window');
});

ipcRenderer.on('close-history-window', function (event, arg) {
    loginFunction(arg);
});

ipcRenderer.on('close-bookmarks-window', function (event, arg) {
   loginFunction(arg);
});