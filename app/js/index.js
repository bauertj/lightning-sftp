'use strict';

var electron = require('electron');
var Client = require('ssh2').Client;
var conn = new Client();
var log = require('electron-log');
var fs = require("fs");
var jsonfile = require('jsonfile');

// password hashing library
var passwordHash = require('password-hash');
/*
 function myFunction() {
 var x = document.getElementById("frm1");
 var text = "";
 var i;
 for (i = 0; i < x.length ;i++) {
 text += x.elements[i].id + ": "+ x.elements[i].value + "\n";
 }
 document.getElementById("area").innerHTML = text;
 }
 */

var connSettings, uname, pass, server;

// Sets up connection history json file
var file = 'ConnectionHistory.json';
var contents = fs.readFileSync("ConnectionHistory.json");
var jsonContent = JSON.parse(contents);



// Will attempt to connect to server when log in button is pressed
// Connection will stay active ( for now )
function loginFunction() {

    // Initializes variables, gets from html
    uname = document.getElementById("username").value;
    pass = document.getElementById("password").value;
    server = document.getElementById("serverName").value;

    console.log(server);

    // Initialize connection settings, default port for now is 22
    connSettings = {
        host:       server,
        port:       22,
        username:   uname,
        password:   pass
    };

    // Creates a hashed password using password-hash
    var hashedPassword = passwordHash.generate(pass);

    if(passwordHash.verify(pass, hashedPassword)){
        console.log("True");
    }
    if(!passwordHash.verify("testing", hashedPassword)){
        console.log("False");
    }

    // Retrieves current date and adds to JSON file for connection history data
    var curDate = new Date();
    var curTime = curDate.getHours()+":"+curDate.getMinutes()+":"+curDate.getSeconds();
    var curDay = (curDate.getMonth()+1) + "-" + curDate.getDate() + "-" + (curDate.getYear()+1900);
    var obj = {host: connSettings.host, port: connSettings.port, username: connSettings.username, password: hashedPassword, time: curTime, day: curDay};


    // Connects to server with connection settings the user inputted, pushes connection onto ConnectionHistory JSON file
    conn.on('ready', function(){
        console.log("You are now connected");
        document.getElementById("loginText").innerHTML = "Connected to " + server;
        jsonContent.connectionHistory.push(obj);
        jsonfile.writeFileSync(file, jsonContent);


    }).connect(connSettings);
}


function uploadFile() {

    conn.on('ready', function(){
        conn.sftp(function(err, sftp){
            if(err) throw err;

            var selectedFile = document.getElementById('localFileDir').files[0];
            var pathToSend = document.getElementById('uploadReceiverPath');
            console.log(pathToSend.value);
            //use sftp here
            var read = fs.createReadStream(selectedFile.path);
            var write = sftp.createWriteStream(pathToSend.value);

            write.on('close',function (){
                document.getElementById("area").innerHTML += selectedFile.name + "- file transferred successfully" + "\n";
                log.info(selectedFile.name + "- file transferred successfully" + "\n");

                // adds connection to history
                var history = fs.createWriteStream('ConnectionHistory.txt');
                history.write(server+"\n");

            });

            write.on('end', function() {
                document.getElementById("area").innerHTML += "sftp conn closed" + "\n";
                log.info("sftp conn closed" + "\n");
                conn.close();
            });
            read.pipe(write)
        });
    }).connect(connSettings);

}

function downloadFile(){

    conn.on('ready', function(){
        conn.sftp(function(err, sftp){
            if(err) throw err;

            var selectedFile = document.getElementById('serverFile');
            var pathToSend = document.getElementById('localFilePath');

            //use sftp here
            var read = sftp.createReadStream(selectedFile.value);
            var write = fs.createWriteStream(pathToSend.value);

            write.on('close',function (){
                document.getElementById("area").innerHTML += selectedFile.value + "- file transferred successfully\n";
                log.info(selectedFile.value + "- file transferred successfully\n");
            });

            write.on('end', function() {
                document.getElementById("area").innerHTML += "sftp conn closed\n";
                log.info("sftp conn closed\n");
                conn.close();
            });
            read.pipe(write)
        });
    }).connect(connSettings);

}

const {ipcRenderer} = require('electron');

var settingsEl = document.querySelector('.connection');
settingsEl.addEventListener('click', function () {
    ipcRenderer.send('open-history-window');
});