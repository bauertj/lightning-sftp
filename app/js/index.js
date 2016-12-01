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


function downloadFile(){
    conn.sftp(function(err, sftp){
        if(err) throw err;

        var selectedFile = document.getElementById('serverFile');
        var pathToSend = document.getElementById('localFilePath');

        download(sftp, selectedFile.value, pathToSend.value) ;
    });
}

function uploadFile() {
    conn.sftp(function(err, sftp){
        if(err) throw err;

        var selectedFile = document.getElementById('localFileDir').files[0];
        var pathToSend = document.getElementById('uploadReceiverPath');



        upload(sftp, selectedFile.path, pathToSend.value);
    });
}

function download(sftp, selectedFile, pathToSend){
    var read = sftp.createReadStream(selectedFile);
    var write = fs.createWriteStream(pathToSend);

    fs.readFile(pathToSend, function (err, file) {
        if(err) throw err;

        console.log(file);
    })

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

    write.on('close',function (){
        document.getElementById("area").innerHTML += selectedFile + "- file transferred successfully" + "\n";
        log.info(selectedFile.name + "- file transferred successfully" + "\n");

    });

    write.on('end', function() {
        document.getElementById("area").innerHTML += "sftp conn closed" + "\n";
        log.info("sftp conn closed" + "\n");
        conn.close();
    });
    read.pipe(write);
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

function uploadFolder(){
    conn.sftp(function(err, sftp){
        if(err) throw err;
        //get folder to download eg. dir0
        var selectedFile = document.getElementById('uploadLocalPath');

        //get folder to download location eg. C:/Users/Name/Desktop/dir0
        var pathToSend = document.getElementById('uploadReceiverPath');

        //creates base dir eg. makes C:/Users/Name/Desktop/dir0
        sftp.mkdir(pathToSend.value,function(err){});

        //recursively go into each folder and create dir and download files inside it
        recurUpload(sftp, selectedFile.value, pathToSend.value) ;
        //console.log("pathToSend = " + pathToSend.value);
        //console.log("selectedFile = " + selectedFile.value);
    });
}

function recurUpload(sftp, selectedFile, pathToSend){
    fs.readdir(selectedFile, function (err, files) {
        if (err) throw err;
        //console.log(files) ;

        document.getElementById("myBar").style.width = 1 + '%';

        var size = 0;
        var amountOfItems = 0;

        for(var i = 0; i < files.length; i++){
            // Total size of the folder being downloaded, sum of all the files within folder will be recursively solved
            var temp = fs.lstatSync(selectedFile + "/" + files[i]);

            size += temp["size"];
            amountOfItems++;
        }

        var percentage = 0;

        //for each file in the dir
        for(var i=0; i<files.length; i++) {
            //for each file, set new selected filename string and path to send string
            var newPath = selectedFile + "/" + files[i];
            var newSend = pathToSend + "/" + files[i];

            var stat = fs.lstatSync(newPath);
            var fileSize = stat["size"];
            percentage += fileSize / size;

            var elem = document.getElementById("myBar");
            var width = 1;
            var id = setInterval(frame, 10);
            //noinspection JSAnnotator
            function frame() {
                if (width >= 100) {
                    clearInterval(id);
                } else {
                    width++;
                    elem.style.width = (percentage * 100) + '%';
                }
            }

            setTimeout(function()
            {
                var textArea = document.getElementById('area');
                textArea.scrollTop = textArea.scrollHeight;
            }, 10);

            document.getElementById('numberOfItems').innerHTML = (i + 1) + " / " + amountOfItems + "<br>" + newSend ;


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

var size = 0;
function recurDownload(sftp, selectedFile, pathToSend) {
    sftp.readdir(selectedFile, function (err, list) {
        if (err) throw err;


        document.getElementById("myBar").style.width = 1 + '%';

        size = 0;
        var amountOfItems = 0;

        for(var i = 0; i < list.length; i++){
            // Total size of the folder being downloaded, sum of all the files within folder will be recursively solved
            size += list[i].attrs.size;
            amountOfItems++;
        }

        var percentage = 0;

        //for each file in the dir
        for(var i=0; i<list.length; i++) {
            //for each file, set new selected filename string and path to send string
            var newPath = selectedFile + "/" + list[i].filename;
            var newSend = pathToSend + "/" + list[i].filename;

            var fileSize = list[i].attrs.size;
            percentage += fileSize / size;

            var elem = document.getElementById("myBar");
            var width = 1;
            var id = setInterval(frame, 10);
            //noinspection JSAnnotator
            function frame() {
                if (width >= 100) {
                    clearInterval(id);
                } else {
                    width++;
                    elem.style.width = (percentage * 100) + '%';
                }
            }

            setTimeout(function()
            {
                var textArea = document.getElementById('area');
                textArea.scrollTop = textArea.scrollHeight;
            }, 10);

            document.getElementById('numberOfItems').innerHTML = (i + 1) + " / " + amountOfItems + "<br>" + newPath ;



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