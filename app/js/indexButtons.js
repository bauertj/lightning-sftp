const {ipcRenderer} = require('electron');

var settingsEl = document.querySelector('#connection');
settingsEl.addEventListener('click', function () {
    ipcRenderer.send('open-history-window');
});

var settingsE2 = document.querySelector('#newConnection');
settingsE2.addEventListener('click', function () {
    ipcRenderer.send('open-connection-window');
});

ipcRenderer.on('close-history-window', function (arg) {

});