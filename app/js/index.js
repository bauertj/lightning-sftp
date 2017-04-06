'use strict';

// REQUIRE SECTION //

var electron = require('electron');
var Client = require('ssh2').Client;
var conn;
var log = require('electron-log');
var fs = require("fs");
var jsonfile = require('jsonfile');
var $ = require("jquery");




$(document).ready(function(){

    document.getElementById('area').addEventListener('keyup', function () {
        this.style.height = 0;
        console.log('test')
        this.style.height = this.scrollHeight + 'px';
    }, false);


    // gets all content for bookmark dropdown menu from the json file
    var contents = fs.readFileSync("Bookmarks.json");
    var bookmarksContent = JSON.parse(contents);
    var bookmarksMenu = document.getElementById("bookmarks");

    // appends all html, adding unique class names in order to locate actual information
    $(bookmarksMenu).append('<li class="bookmarkOptions"><a href="#">Bookmark Options...</a></li>')
    $(bookmarksMenu).append('<li role="separator" class="divider"></li>')
    for(var i = 0; i < bookmarksContent.Bookmarks.length; i++){
        $(bookmarksMenu).append('<li><a href="#" class="bookmarkClicked bookmark'+i+'">'+ bookmarksContent.Bookmarks[i].username + '@' +
            bookmarksContent.Bookmarks[i].host +'</a></li>');
    }

    // when a bookmark is clicked, information will be added to the text boxes
    $('.bookmarkClicked').click(function(){
        var classname = this.className;
        classname = classname.replace(/[^\d.]/g, '');
        var pos = bookmarksContent.Bookmarks[parseInt(classname)];

        document.getElementById("username").value = pos.username;
        document.getElementById("port").value = pos.port;
        document.getElementById("serverName").value = pos.host;

        $('#password').select();

    });

    // gets all content for connection history drop down menu from json file
    contents = fs.readFileSync("ConnectionHistory.json");
    var historyContent = JSON.parse(contents);
    var historyMenu = document.getElementById("history");

    // appends all html, adding unique class names
    $(historyMenu).append('<li><a href="#">Connection History Options...</a></li>');
    $(historyMenu).append('<li role="separator" class="divider"></li>')
    for(var i = historyContent.connectionHistory.length-1; i > historyContent.connectionHistory.length - 10; i--){
        if(historyContent.connectionHistory[i] != null){
            $(historyMenu).append('<li><a href="#" class="historyClicked history'+i+'">'+ historyContent.connectionHistory[i].username + '@' +
                historyContent.connectionHistory[i].host +'</a></li>');
        }
    }

    // when a history option is clicked, information will be added to the text boxes
    $('.historyClicked').click(function(){
        var classname = this.className;
        classname = classname.replace(/[^\d.]/g, '');
        var pos = historyContent.connectionHistory[parseInt(classname)];

        document.getElementById("username").value = pos.username;
        document.getElementById("port").value = pos.port;
        document.getElementById("serverName").value = pos.host;

        $('#password').select();
    });

});

/**
 * Logs in to remote server using html text boxes.
 * @returns {{host: *, port: number, username: *, password: *}|*}
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

    if(connSettings.host=="" || connSettings.username=="" || connSettings.password==""){
        alert("Please enter all required information");
    }
    else {
        // for when the client is connected to the server
        conn.on('ready', function() {

            console.log("You are now connected");
            //document.getElementById("loginText").innerHTML = "Connected to " + connSettings.host;
            jsonContent.connectionHistory.push(obj);
            jsonfile.writeFileSync(file, jsonContent);


            var legend = document.getElementById('legend');
            legend.textContent = connSettings.host;
            $(legend).append(' <select id="upperLevelsRemote"></select>');

            document.getElementById("logoutConn").disabled = false;

        }).connect(connSettings);
        // for when there is an error with the connection
        conn.on('error', function(err){
           alert("Information Incorrect. Reenter.") ;
        });
        // for when the connection is disconnected / ended
        conn.on('end', function(){
            console.log("You disconnected from " + connSettings.host);
        });
   }

   retrieveData(remotePath);
}

function logoutFunction(){
    //close connection
    if(conn != null) {
        conn.end();
        conn = null;
        //destroy tree
        $('#jstree2').jstree("destroy");
        //display text area again
        var child = document.getElementById("removable");
        child.style.display = 'inline';

        var legend = document.getElementById('legend');

        legend.textContent = "User Info";

        document.getElementById("username").value = "";
        document.getElementById("port").value = "";
        document.getElementById("serverName").value = "";
        document.getElementById("password").value = "";

        document.getElementById("logoutConn").disabled = true;
    }
}


/*
  * selectedFile : file path to download
  * pathToSend : file path to send to
  *
  * Decides whether the transfer is a file or a directory and calls functions based on the decision.
  * Creates directory, if it is a directory, and does not currently exist in the local path.
 */
function selectDownload(selectedFile, pathToSend){

    //create connection to sftp
    conn.sftp(function(err, sftp){
        if(err) throw err;

        //determine if file or folder
        console.log("selectedFile: " + selectedFile) ;
        sftp.lstat(selectedFile, function(err, stats){
            if (err){
                alert("Error: remote file does not exist");
            }
            else{
                //Check if the selected file is a directory or not
                var isDir = stats.isDirectory() ;
                //if folder, recursive download
                if(isDir == true){
                    // Creates directory locally if it does not exist already
                    if(fs.existsSync(pathToSend) == false){
                        fs.mkdir(pathToSend,function(err){
                            if (err) throw err;
                        });
                    }
                    //Recursive download to download files inside directory
                    recurDownload(sftp, selectedFile, pathToSend) ;
                }
                //if file, call download
                else if(isDir == false){
                    download(sftp, selectedFile, pathToSend);
                }
                // Something went wrong if this happens...
                else{
                    alert("something's gone wrong. isDir is null.");
                    console.log(isDir) ;
                }
            }
        });

    });
}

/*
 * selectedFile : file path to upload
 * pathToSend : file path to send to
 *
 * Decides whether the transfer is a file or a directory and calls functions based on the decision.
 * Creates directory, if it is a directory, and does not currently exist in the remote path.
 */
function selectUpload(selectedFile, pathToSend){

    //create connection to sftp
    conn.sftp(function(err, sftp){
        if(err) throw err;

        //used to determine which function to call

        // !! If something breaks, wet spaghetti !!
        var isDir = fs.lstatSync(selectedFile).isDirectory();

        //if folder, recursive upload
        if(isDir){
            sftp.mkdir(pathToSend,function(err){
                if (err) console.log("Error: make dir pathToSend");
            });
            recurUpload(sftp, selectedFile, pathToSend) ;
        }
        //if file, call upload
        else if(!isDir){
            upload(sftp, selectedFile, pathToSend);
        }
        // If this happens, something terrible is afoot...
        else{
            alert("something's gone wrong. isDir is null.");
            console.log(isDir) ;
        }

    });
}

/*
 * sftp: sftp object to pass in
 * selectedFile: file to download
 * pathToSend: path to send the selected file to
 *
 * Downloads a single file.
 */
function download(sftp, selectedFile, pathToSend){
    // Creating read and write streams
    var read = sftp.createReadStream(selectedFile);
    var write = fs.createWriteStream(pathToSend);

    // PROGRESS BAR START
    sftp.lstat(selectedFile, function (err, stats) {
        progressBar(read, write, stats, selectedFile);
    }); // END PROGRESS BAR


    // Logs info
    write.on('close',function (){
        document.getElementById("area").innerHTML += selectedFile + "- file transferred successfully\n";
        log.info(selectedFile + "- file transferred successfully\n");
    });

    write.on('end', function() {
        document.getElementById("area").innerHTML += "sftp conn closed\n";
        log.info("sftp conn closed\n");
        conn.close();
    });

    // Reads from the remote, writes to local
    read.pipe(write);
}


/*
 * sftp: sftp object to pass in
 * selectedFile: file to upload
 * pathToSend: path to send the selected file to
 *
 * Uploads a single file.
 */
function upload(sftp, selectedFile, pathToSend){
    // Creating read and write streams
    var read = fs.createReadStream(selectedFile);
    var write = sftp.createWriteStream(pathToSend);

    console.log(selectedFile);
    console.log(pathToSend);

    fs.stat(selectedFile, function (err, stats) {
        progressBar(read, write, stats, selectedFile);
    })

    // Logs info
    write.on('close',function (){
        document.getElementById("area").innerHTML += selectedFile + "- file transferred successfully" + "\n";
        log.info(selectedFile + "- file transferred successfully" + "\n");

    });

    write.on('end', function() {
        document.getElementById("area").innerHTML += "sftp conn closed" + "\n";
        log.info("sftp conn closed" + "\n");
        conn.close();
    });

    // Reads from the remote, writes to local
    read.pipe(write);
}


// TODO Documentation
function progressBar(read, write, stats, selectedFile){
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
}


/*
 * sftp: sftp object to pass in
 * selectedFile: directory to upload
 * pathToSend: path to send the selected directory to
 *
 * Uploads a directory with all contained files.
 */
function recurUpload(sftp, selectedFile, pathToSend){
    fs.readdir(selectedFile, function (err, files) {
        if (err) throw err;

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
        }
    });
}


/*
 * sftp: sftp object to pass in
 * selectedFile: directory to download
 * pathToSend: path to send the selected directory to
 *
 * Downloads a directory with all containing files.
 */
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

/*
 * Login function when logging in from the connection history window.
 */
function loginFromHistoryWindow(){
    var newUsername, newServer, newPort, newPassword;

    newUsername = document.getElementById("username").value;
    newServer = document.getElementById("server").value;
    newPort = document.getElementById("port").value;
    newPassword = document.getElementById("newPassword").value;

    var connSettings = {
        host:       newServer,
        port:       22,
        username:   newUsername,
        password:   newPassword
    };

    ipcRenderer.send('close-history-window', connSettings);
}

/*
 * Login function when logging in from the bookmarks window.
 */
function loginFromBookmarksWindow() {
    var newUsername, newServer, newPort, newPassword;

    newUsername = document.getElementById("username").value;
    newServer = document.getElementById("server").value;
    newPort = document.getElementById("port").value;
    newPassword = document.getElementById("newPassword").value;

    var connSettings = {
        host:       newServer,
        port:       22,
        username:   newUsername,
        password:   newPassword
    };

    ipcRenderer.send('close-bookmarks-window', connSettings);
}