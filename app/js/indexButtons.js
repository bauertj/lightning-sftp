const {ipcRenderer} = require('electron');

var settingsE2 = document.querySelector('#logoutConn');
settingsE2.addEventListener('click', function (){
    logoutFunction();
});