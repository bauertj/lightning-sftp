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


function getLoginInfo(){
    var connSettings, uname, pass, server;
    // Initializes variables, gets from html
    uname = document.getElementById("username").value;
    pass = document.getElementById("password").value;
    server = document.getElementById("serverName").value;

    // Initialize connection settings, default port for now is 22
    connSettings = {
        host:       server,
        port:       22,
        username:   uname,
        password:   pass
    };

    var hashedPassword = passwordHash.generate(pass);

    if(passwordHash.verify(pass, hashedPassword)){
        console.log("True");
    }
    if(!passwordHash.verify("testing", hashedPassword)){
        console.log("False");
    }

    return connSettings;
}



// Will attempt to connect to server when log in button is pressed
// Connection will stay active ( for now )
function loginFunction( connSettings ) {
    conn = new Client();

    // Sets up connection history json file
    var file = 'ConnectionHistory.json';

    var contents = fs.readFileSync("ConnectionHistory.json");
    var jsonContent = JSON.parse(contents);

    // Retrieves current date and adds to JSON file for connection history data
    var curDate = new Date();
    var curTime = curDate.getHours()+":"+curDate.getMinutes()+":"+curDate.getSeconds();
    var curDay = (curDate.getMonth()+1) + "-" + curDate.getDate() + "-" + (curDate.getYear()+1900);
    var obj = {host: connSettings.host, port: connSettings.port, username: connSettings.username, password: "", time: curTime, day: curDay};


    // Connects to server with connection settings the user inputted, pushes connection onto ConnectionHistory JSON file
   try {
       if(connSettings.host=="" || connSettings.username=="" || connSettings.password==""){
           alert("Please enter all required information");
       }
       else {
           conn.on('ready', function (err) {
               console.log("You are now connected");
               document.getElementById("loginText").innerHTML = "Connected to " + connSettings.host;
               jsonContent.connectionHistory.push(obj);
               jsonfile.writeFileSync(file, jsonContent);
           }).connect(connSettings);
       }
   } catch(err){
       throw err;
   }
}

function selectDownload(){
    //create connection to sftp
    conn.sftp(function(err, sftp){
        if(err) throw err;
        //get file/folder names
        var selectedFile = document.getElementById('remotePath');
        var pathToSend = document.getElementById('localPath');

        if(selectedFile.value == "" || pathToSend.value == ""){
            alert("Local Path or Remote Path is empty");
        }
        else{
            var isDir = null;   //used to determine which function to call
            //determine if file or folder
            sftp.lstat(selectedFile.value, function(err, stats){
                if (err){
                    alert("Error: remote file does not exist");
                }
                else{
                    isDir = stats.isDirectory() ;
                    //if folder, recursive download
                    if(isDir == true){
                        if(fs.existsSync(pathToSend.value) == false){
                            fs.mkdir(pathToSend.value,function(err){
                                if (err) throw err;
                            });
                        }
                        recurDownload(sftp, selectedFile.value, pathToSend.value) ;
                    }
                    //if file, call download
                    else if(isDir == false){
                        download(sftp, selectedFile.value, pathToSend.value);
                    }
                    else{
                        alert("something's gone wrong. isDir is null.");
                        console.log(isDir) ;
                    }
                }
            });
        }
    });
}

function selectUpload(){
    //create connection to sftp
    conn.sftp(function(err, sftp){
        if(err) throw err;
        //get file/folder names
        var selectedFile = document.getElementById('localPath');
        var pathToSend = document.getElementById('remotePath');

        console.log("selected file: " + selectedFile.value);
        console.log("path to send: " + pathToSend.value);

        if(selectedFile.value == "" || pathToSend.value == ""){
            alert("Local Path or Remote Path is empty");
        }
        else{
            var isDir = null;   //used to determine which function to call
            //determine if file or folder
            try{
                //console.log( fs.lstatSync(selectedFile.value).isDirectory() );
                isDir = fs.lstatSync(selectedFile.value).isDirectory();
            }
            catch(err){
                alert("Local file you entered does not exist");
                console.log(err.message) ;
            }
            //if folder, recursive upload
            if(isDir == true){
                /*
                sftp.lstat(pathToSend.value, function(err, stats){
                    if (err) {
                        sftp.mkdir(pathToSend.value,function(err){
                            if (err) alert("Error: make dir pathToSend");
                        });
                    }
                });
                */
                sftp.mkdir(pathToSend.value,function(err){
                    if (err) console.log("Error: make dir pathToSend");
                });
                recurUpload(sftp, selectedFile.value, pathToSend.value) ;
            }
            //if file, call upload
            else if(isDir == false){
                console.log("selected file: " + selectedFile.value);
                console.log("path to send: " + pathToSend.value);

                upload(sftp, selectedFile.value, pathToSend.value);
            }
            else{
                //alert("something's gone wrong. isDir is null.");
                console.log(isDir) ;
            }
        }
    });
}


function download(sftp, selectedFile, pathToSend){
    var read = sftp.createReadStream(selectedFile);
    var write = fs.createWriteStream(pathToSend);

    sftp.lstat(selectedFile, function (err, stats) {
        read.on('data', (chunk) => {

            var bytesWritten = write.bytesWritten;
            var fileSize = stats.size;
            var bytesPerSecond = 0;

            var interval = 1;
            setInterval(increment, 1000);
            function increment(){
                interval = interval + 1;
            }

            bytesPerSecond = 0;
            setInterval(getBytesPerSecond, 1000);
            function getBytesPerSecond(){
                bytesPerSecond = bytesWritten / interval;
            }

            setTimeout(function()
            {
                var textArea = document.getElementById('area');
                textArea.scrollTop = textArea.scrollHeight;
            }, 10);

            document.getElementById('numberOfItems').innerHTML = selectedFile;

            var elem = document.getElementById("myBar");
            var width = 1;
            var id = setInterval(frame, 10);
            var percentage = 0;
            //noinspection JSAnnotator
            function frame() {
                if (width >= 100) {
                    clearInterval(id);
                } else {
                    width++;
                    bytesWritten = write.bytesWritten;
                    percentage = bytesWritten/fileSize;
                    elem.style.width = (percentage * 100) + '%';
                    document.getElementById("progressLabel").innerHTML = ((percentage * 100)).toFixed(2) + '%';
                }
            }
        });
    });

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

function upload(sftp, selectedFile, pathToSend){
    var read = fs.createReadStream(selectedFile);
    var write = sftp.createWriteStream(pathToSend);

    fs.stat(selectedFile, function (err, stats) {
        read.on('data', (chunk) => {

            console.log(stats);
            var bytesWritten = write.bytesWritten;
            var fileSize = stats.size;
            var bytesPerSecond = 0;

            var interval = 1;
            setInterval(increment, 1000);
            function increment(){
                interval = interval + 1;
            }

            bytesPerSecond = 0;
            setInterval(getBytesPerSecond, 1000);
            function getBytesPerSecond(){
                bytesPerSecond = bytesWritten / interval;
            }

            setTimeout(function()
            {
                var textArea = document.getElementById('area');
                textArea.scrollTop = textArea.scrollHeight;
            }, 10);

            document.getElementById('numberOfItems').innerHTML = selectedFile;

            var elem = document.getElementById("myBar");
            var width = 1;
            var id = setInterval(frame, 10);
            var percentage = 0;
            //noinspection JSAnnotator
            function frame() {
                if (width >= 100) {
                    clearInterval(id);
                } else {
                    width++;
                    bytesWritten = write.bytesWritten;
                    percentage = bytesWritten/fileSize;
                    elem.style.width = (percentage * 100) + '%';
                    document.getElementById("progressLabel").innerHTML = ((percentage * 100)).toFixed(2) + '%';
                }
            }
        });
    })



    write.on('close',function (){
        document.getElementById("area").innerHTML += selectedFile + "- file transferred successfully" + "\n";
        log.info(selectedFile + "- file transferred successfully" + "\n");

    });

    write.on('end', function() {
        document.getElementById("area").innerHTML += "sftp conn closed" + "\n";
        log.info("sftp conn closed" + "\n");
        conn.close();
    });
    read.pipe(write);
}

function recurUpload(sftp, selectedFile, pathToSend){
    fs.readdir(selectedFile, function (err, files) {
        if (err) throw err;
        //console.log(files) ;

        //for each file in the dir
        for(var i=0; i<files.length; i++) {
            //for each file, set new selected filename string and path to send string
            var newPath = selectedFile + "/" + files[i];
            var newSend = pathToSend + "/" + files[i];
            //if file is a dir, create local copy, then recursively go into each folder and create dir and download files inside it
            if (fs.lstatSync(newPath).isDirectory()) {
                sftp.mkdir(newSend,function(err){});
                recurUpload(sftp, newPath, newSend);
            }
            //else, it is a file, so download it locally
            else{
                upload(sftp, newPath, newSend) ;
            }
            //console.log("file logged: " + files[i] );
        }
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
                if(fs.existsSync(newSend) == false){
                    fs.mkdir(newSend,function(err){
                        if (err) throw err;
                    });
                }
                recurDownload(sftp, newPath, newSend) ;
            }
            //else, it is a file, so download it locally
            else{
                download(sftp, newPath, newSend) ;
            }
        }
    });
}

function move() {
    var elem = document.getElementById("myBar");
    var width = 1;
    var id = setInterval(frame, 10);
    function frame() {
        if (width >= 100) {
            clearInterval(id);
        } else {
            width++;
            elem.style.width = width + '%';
        }
    }
}


function loginFromHistoryWindow(){
    var newUsername, newServer, newPort, newPassword;

    newUsername = document.getElementById("username").value;
    newServer = document.getElementById("server").value;
    newPort = document.getElementById("port").value;
    newPassword = document.getElementById("newPassword").value;
    console.log(newUsername + " " + newServer + " " + newPort);

    var connSettings = {
        host:       newServer,
        port:       22,
        username:   newUsername,
        password:   newPassword
    };

    ipcRenderer.send('close-history-window', connSettings);
}

function loginFromBookmarksWindow() {
    var newUsername, newServer, newPort, newPassword;

    newUsername = document.getElementById("username").value;
    newServer = document.getElementById("server").value;
    newPort = document.getElementById("port").value;
    newPassword = document.getElementById("newPassword").value;
    console.log(newUsername + " " + newServer + " " + newPort);

    var connSettings = {
        host:       newServer,
        port:       22,
        username:   newUsername,
        password:   newPassword
    };

    ipcRenderer.send('close-bookmarks-window', connSettings);
}

