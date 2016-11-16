'use strict';

var electron = require('electron');
var Client = require('ssh2').Client;
var conn;
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







// Will attempt to connect to server when log in button is pressed
// Connection will stay active ( for now )
function loginFunction() {
    conn = new Client();
    var connSettings, uname, pass, server;
    // Initializes variables, gets from html
    uname = document.getElementById("username").value;
    pass = document.getElementById("password").value;
    server = document.getElementById("serverName").value;

    // Sets up connection history json file
    var file = 'ConnectionHistory.json';
    var contents = fs.readFileSync("ConnectionHistory.json");
    var jsonContent = JSON.parse(contents);

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
   try {
       if(server=="" || uname=="" || pass==""){
           alert("Please enter all required information");
       }
       else {
           conn.on('ready', function (err) {
               console.log("You are now connected");
               document.getElementById("loginText").innerHTML = "Connected to " + server;
               jsonContent.connectionHistory.push(obj);
               jsonfile.writeFileSync(file, jsonContent);
           }).connect(connSettings);
       }
   } catch(err){
       alert(err);
   }
}


function uploadFile() {
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

            });

            write.on('end', function() {
                document.getElementById("area").innerHTML += "sftp conn closed" + "\n";
                log.info("sftp conn closed" + "\n");
                conn.close();
            });
            read.pipe(write);
        });
}

function downloadFile(){
        conn.sftp(function(err, sftp){
            if(err) throw err;

            var selectedFile = document.getElementById('serverFile');
            var pathToSend = document.getElementById('localFilePath');

            download(sftp, selectedFile.value, pathToSend.value) ;
        });
}

function download(sftp, selectedFile, pathToSend){
        var read = sftp.createReadStream(selectedFile);
        var write = fs.createWriteStream(pathToSend);

        write.on('close',function (){
            document.getElementById("area").innerHTML += selectedFile + "- file transferred successfully\n";
            log.info(selectedFile + "- file transferred successfully\n");
        });

        write.on('end', function() {
            document.getElementById("area").innerHTML += "sftp conn closed\n";
            log.info("sftp conn closed\n");
            conn.close();
        });
        read.pipe(write);
}

const {ipcRenderer} = require('electron');

var settingsEl = document.querySelector('#connection');
settingsEl.addEventListener('click', function () {
    ipcRenderer.send('open-history-window');
});

var settingsE2 = document.querySelector('#newConnection');
settingsE2.addEventListener('click', function () {
   ipcRenderer.send('open-connection-window');
});

function receiveInfo() {

}

function downloadFolder(){
    conn.sftp(function(err, sftp){
        if(err) throw err;
        //get folder to download eg. dir0
        var selectedFile = document.getElementById('serverFile');

        //get folder to download location eg. C:/Users/Name/Desktop/dir0
        var pathToSend = document.getElementById('localFilePath');

        //creates base dir eg. makes C:/Users/Name/Desktop/dir0
        fs.mkdir(pathToSend.value,function(err){});

        //recursively go into each folder and create dir and download files inside it
        recurDownload(sftp, selectedFile.value, pathToSend.value) ;
    });
}

function recurDownload(sftp, selectedFile, pathToSend) {
        sftp.readdir(selectedFile, function (err, list) {
            if (err) throw err;
            //for each file in the dir
            for(var i=0; i<list.length; i++) {
                //for each file, set new selected filename string and path to send string
                var newPath = selectedFile + "/" + list[i].filename;
                var newSend = pathToSend + "/" + list[i].filename;
                //if file is a dir, create local copy, then recursively go into each folder and create dir and download files inside it
                if (list[i].longname.toString().charAt(0) == "d") {
                    fs.mkdir(newSend,function(err){});
                    recurDownload(sftp, newPath, newSend);
                }
                //else, it is a file, so download it locally
                else{
                    download(sftp, newPath, newSend) ;
                }
            }
        });
}