'use strict';

// REQUIRE SECTION //

var electron = require('electron');
var Client = require('ssh2').Client;
var conn;
var log = require('electron-log');
var fs = require("fs");
var jsonfile = require('jsonfile');
var $ = require("jquery");

var totalFiles = 0;
var totalDone = 0;
var totalSize = 0;
var amountWritten = 0;
var interval = 1;

function populateBookmarks(){
    var contents = fs.readFileSync("Bookmarks.json");
    var bookmarksContent = JSON.parse(contents);
    var bookmarksMenu = document.getElementById("bookmarks");
    var bookChildren = document.getElementById("bookmarks");
    
    while(bookChildren.firstChild){
        bookChildren.removeChild(bookChildren.firstChild);
    }
    if(bookmarksContent.Bookmarks.length == 0){
        console.log("empty");
        $(bookmarksMenu).append('<li>' +
            '<span class="empty glyphicon glyphicon-star-empty"> &nbsp; No Bookmarks Yet</span></li>');
    }
    for(var i = 0; i < bookmarksContent.Bookmarks.length; i++){
        $(bookmarksMenu).append('<li>' +
            '<span class="itemBookmark item item'+i+'"> '+
            '<span class="item-left">'+
            '<span class="bookmarkClicked bookmark'+i+'">'+ bookmarksContent.Bookmarks[i].username + '@' + bookmarksContent.Bookmarks[i].host + '</span>' +
            '</span>' +
            '<span class="item-right">' +
            '<button class="btn btn-xs pull-right btn-danger bookmarkDelete danger' +i+'">x</button>' +
            '</span>' +
            '</span>' +
            '</li>');
    }
}

function populateHistory(){
    // gets all content for connection history drop down menu from json file
    var contents = fs.readFileSync("ConnectionHistory.json");
    var historyContent = JSON.parse(contents);
    var historyMenu = document.getElementById("history");
    var historyChildren = document.getElementById("history");
    while(historyChildren.firstChild){
        historyChildren.removeChild(historyChildren.firstChild);
    }

    for(var i = historyContent.connectionHistory.length-1; i > 0; i--){
        if(historyContent.connectionHistory[i] != null){
            $(historyMenu).append('<li>' +
                    '<span class="itemHistory item item'+i+'">' +
                        '<span class="item-left">' +
                            '<span class="historyClicked history'+i+'">'+ historyContent.connectionHistory[i].username + '@' +
                            historyContent.connectionHistory[i].host +'</span>' +
                        '</span>'+
                        '<span class="item-right">'+
                            '<button class="btn btn-xs pull-right btn-danger historyDelete danger'+i+'">x</button>'+
                        '</span>'+
                    '</span>'+
                '</li>');
        }
    }
}

$(document).ready(function(){
    init();
});

function init() {
    // gets all content for bookmark dropdown menu from the json file
    var contents = fs.readFileSync("Bookmarks.json");
    var bookmarksContent = JSON.parse(contents);

    populateBookmarks();
    // when a bookmark is clicked, information will be added to the text boxes
    $('.itemBookmark').click(function(){
        var classname = this.className;
        classname = classname.replace(/[^\d.]/g, '');
        var pos = bookmarksContent.Bookmarks[parseInt(classname)];
        document.getElementById("username").value = pos.username;
        document.getElementById("port").value = pos.port;
        document.getElementById("serverName").value = pos.host;

        $('#password').select();

    });

    $('.bookmarkDelete').click(function(){
        console.log(this);
        var contents = fs.readFileSync("Bookmarks.json");
        var jsonContent = JSON.parse(contents);
        var classname = this.className;
        classname = classname.replace(/[^\d.]/g, '');
        jsonContent.Bookmarks.splice(classname, 1);
        $(".item"+classname).remove();
        if(jsonContent.Bookmarks.length == 0){
            var bookmark = document.getElementById("bookmarks");
            $(bookmark).append('<li> <span class="empty glyphicon glyphicon-star-empty"> &nbsp; No Bookmarks Yet</span></li>');
        }
        jsonfile.writeFile('Bookmarks.json', jsonContent);
    });


    // gets all content for connection history drop down menu from json file
    contents = fs.readFileSync("ConnectionHistory.json");
    var historyContent = JSON.parse(contents);

    populateHistory();
    // when a history option is clicked, information will be added to the text boxes
    $('.itemHistory').click(function(){
        var classname = this.className;
        classname = classname.replace(/[^\d.]/g, '');
        var pos = historyContent.connectionHistory[parseInt(classname)];
        document.getElementById("username").value = pos.username;
        document.getElementById("port").value = pos.port;
        document.getElementById("serverName").value = pos.host;
        $('#password').select();
    });

    $('.historyDelete').click(function(){
        var contents = fs.readFileSync("ConnectionHistory.json");
        var jsonContent = JSON.parse(contents);
        var classname = this.className;
        classname = classname.replace(/[^\d.]/g, '');
        jsonContent.connectionHistory.splice(classname, 1);
        $(".item"+classname).remove();
        jsonfile.writeFile('ConnectionHistory.json', jsonContent);
    })
}

/**
 * Logs in to remote server using html text boxes.
 * @returns {{host: *, port: number, username: *, password: *}|*}
 */
function getLoginInfo(){
    var connSettings, uname, pass, server, port, keyname;
    // Initializes variables, gets from html
    uname = document.getElementById("username").value;
    pass = document.getElementById("password").value;
    server = document.getElementById("serverName").value;
    port = document.getElementById("port").value;
    keyname = document.getElementById("keyname").value;

    try{
        var getKey = fs.readFileSync(os.homedir() + path.sep + ".ssh" + path.sep + keyname);
    }
    catch(err){
        console.log(err);
        getKey = "" ;
    }

    // Initialize connection settings, default port for now is 22
    connSettings = {
        host:       server,
        port:       port,
        username:   uname,
        password:   pass,
        privateKey: getKey
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

    if(connSettings.host=="" || connSettings.username==""){
        alert("Please enter all required information");
    }
    else {
        // for when the client is connected to the server
        conn.on('ready', function() {
            if(document.getElementById("bookmarkThis").checked){
                contents = fs.readFileSync("Bookmarks.json");
                var found = false;
                var tempJson = JSON.parse(contents);
                var tempObj = {username: connSettings.username, host: connSettings.host, port: connSettings.port};
                for(var i = 0; i < tempJson.Bookmarks.length; i++){
                    if((tempObj.username === tempJson.Bookmarks[i].username) && (tempObj.host === tempJson.Bookmarks[i].host) &&
                        (tempObj.port === tempJson.Bookmarks[i].port)){
                        found = true;
                    }
                }
                if(!found){
                    tempJson.Bookmarks.push(tempObj);
                    jsonfile.writeFileSync("Bookmarks.json", tempJson);
                }
            }
            console.log("You are now connected");
            //document.getElementById("loginText").innerHTML = "Connected to " + connSettings.host;
            jsonContent.connectionHistory.push(obj);
            jsonfile.writeFileSync(file, jsonContent);

            var legend = document.getElementById('legend');
            legend.textContent = connSettings.host;
            $(legend).append('&nbsp;<div class="btn-group" id="upperLevel2"> <ul class="dropdown-menu" id="upperLevelsRemote"> </ul></div>' +
                '<div class="btn-group"> <div class="btn-group">'+
                '<button type="button" value="Logout" id="logoutConn" class="btn btn-default">Logout</button> </div></div>');

            var settingsE2 = document.querySelector('#logoutConn');
            settingsE2.addEventListener('click', function (){
                logoutFunction();
            });

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
        $(legend).append('&nbsp;<div class="btn-group"> <div class="btn-group">'+
            '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Connection History'+
            '<span class="caret"></span> </button> <ul class="dropdown-menu bookmark-dropdown" id="history" role="menu">'+
            '</ul></div><div class="btn-group">'+
            '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Bookmarks'+
            '<span class="caret"></span></button><ul class="dropdown-menu bookmark-dropdown" id="bookmarks" role="menu">'+
            '</ul></div></div>');

        init();
        document.getElementById("username").value = "";
        document.getElementById("port").value = "";
        document.getElementById("serverName").value = "";
        document.getElementById("password").value = "";
        document.getElementById("keyname").value = "";
        document.getElementById("bookmarkThis").checked = false;
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
    // checks to see if the file already exists on local machine
    fs.open(pathToSend, 'r', (err, fd) =>{
        // if it does not, will result in an error which automatically goes to transfer by default
        if(err){
            console.log("transferred " + err);
            go();
        }
        // if it is found, prompt the user to decide to overwrite or not
        else {
            document.getElementById("dialog").innerHTML = pathToSend + " already exists. Overwrite?";
            $("#dialog").dialog({
                dialogClass: "no-close",
                buttons: [
                    {
                        text: "OK",
                        click: function () {
                            go();
                            $(this).dialog("close");
                        }
                    },
                    {
                        text: "No",
                        click: function () {
                            $(this).dialog("close");
                        }
                    }
                ]
            });
        }
        });

    function go() {
        //create connection to sftp
        conn.sftp(function (err, sftp) {
            if (err) throw err;
            //determine if file or folder
            console.log("selectedFile: " + selectedFile);
            sftp.lstat(selectedFile, function (err, stats) {
                if (err) {
                    alert("Error: remote file does not exist");
                }
                else {
                    //Check if the selected file is a directory or not
                    var isDir = stats.isDirectory();

                    if (totalDone == totalFiles) {
                        clearProgress();
                        setInterval(function () {
                            interval = interval + 1;
                        }, 1000);
                    }

                    //if folder, recursive download
                    if (isDir == true) {
                        // Creates directory locally if it does not exist already
                        if (fs.existsSync(pathToSend) == false) {
                            fs.mkdir(pathToSend, function (err) {
                                if (err) throw err;
                            });

                        }
                        //Recursive download to download files inside directory
                        countTotalFilesRemote(sftp, selectedFile);
                        recurDownload(sftp, selectedFile, pathToSend);
                    }
                    //if file, call download
                    else if (isDir == false) {
                        totalFiles += 1;
                        sftp.stat(selectedFile, function(err, stats){
                            totalSize += stats.size;
                        });
                        download(sftp, selectedFile, pathToSend);
                    }
                    // Something went wrong if this happens...
                    else {
                        alert("something's gone wrong. isDir is null.");
                        console.log(isDir);
                    }
                }
            });
        });
    }
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


        sftp.lstat(pathToSend, function(err, stats){
                if(err){
                    // assume the file does not exist on server already
                    go();
                }

                else{
                    document.getElementById("dialog").innerHTML = pathToSend + " already exists. Overwrite?";
                    $("#dialog").dialog({
                        dialogClass: "no-close",
                        buttons: [
                            {text: "OK",
                                click: function() {
                                    go();
                                    $( this ).dialog( "close" );
                                }},
                            { text: "No",
                                click: function(){
                                    $( this ).dialog("close");
                                }
                            }
                        ]
                    });
                }

            });

        function go() {
            // !! If something breaks, wet spaghetti !!
            var isDir = fs.lstatSync(selectedFile).isDirectory();

            if (totalDone == totalFiles) {
                clearProgress();
                setInterval(function () {
                    interval = interval + 1;
                }, 1000);
            }

            //if folder, recursive upload
            if (isDir) {
                sftp.mkdir(pathToSend, function (err) {
                    if (err) console.log("Error: make dir pathToSend");
                });

                countTotalFilesLocal(selectedFile);
                recurUpload(sftp, selectedFile, pathToSend);
            }
            //if file, call upload
            else if (!isDir) {
                totalFiles += 1;
                fs.lstat(selectedFile, function(err, stats){
                    totalSize += stats.size;
                });
                upload(sftp, selectedFile, pathToSend);
            }
            // If this happens, something terrible is afoot...
            else {
                alert("something's gone wrong. isDir is null.");
                console.log(isDir);
            }
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
    write.on('close', function () {
        document.getElementById("area").innerHTML += selectedFile + "- file transferred successfully\n";
        log.info(selectedFile + "- file transferred successfully\n");
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

    fs.stat(selectedFile, function (err, stats) {
        progressBar(read, write, stats, selectedFile);
    });

    // Logs info
    write.on('close', function () {
        document.getElementById("area").innerHTML += selectedFile + "- file transferred successfully" + "\n";
        log.info(selectedFile + "- file transferred successfully" + "\n");

    });

    // Reads from the remote, writes to local
    read.pipe(write);
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
            var newPath = selectedFile + slash + files[i];
            var newSend = pathToSend + "/" + files[i];
            //if file is a dir, create local copy, then recursively go into each folder and create dir and download files inside it
            if (fs.lstatSync(newPath).isDirectory()) {
                sftp.mkdir(newSend,function(err){});
                recurUpload(sftp, newPath, newSend);
                totalDone++;
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
                totalDone++;
                recurDownload(sftp, newPath, newSend) ;
            }
            //else, it is a file, so download it locally
            else{
                download(sftp, newPath, newSend) ;
            }
        }
    });
}


// TODO Documentation
function progressBar(read, write, stats, selectedFile){


    read.on('data', (chunk) => {

        amountWritten += chunk.length;
        var amountWrittenMB = amountWritten/1000000;

        var bytesWritten = write.bytesWritten;
        var fileSize = stats.size;


        var mbPerSecond = amountWrittenMB / interval ;


        setTimeout(function()
        {
            var textArea = document.getElementById('area');
            textArea.scrollTop = textArea.scrollHeight;
        }, 100);

        var sizeInMB = totalSize/1000000;

        var fileToShow = selectedFile;
        if(fileToShow.length > 40){
            fileToShow = selectedFile.substring(0, 14) + '...' + selectedFile.substring(selectedFile.length-22, selectedFile.length);
        }

        document.getElementById('itemTransferred').innerHTML = fileToShow + '&nbsp;';
        document.getElementById('totalItems').innerHTML = totalDone + ' / ' + totalFiles + '&nbsp;&nbsp;';
        document.getElementById('amountDone').innerHTML = amountWrittenMB.toFixed(2) + ' / ' + sizeInMB.toFixed(2) + ' MB&nbsp;';
        document.getElementById('perSecond').innerHTML = mbPerSecond.toFixed(2) + ' mB/s &nbsp;';

        var elem = document.getElementById("myBar");
        setTimeout(frame, 10);
        var percentage = 0;

        //noinspection JSAnnotator
        function frame() {
                bytesWritten = write.bytesWritten;
                percentage = bytesWritten/fileSize;
                elem.style.width = (percentage * 100) + '%';
                document.getElementById("progressLabel").innerHTML = ((percentage * 100)).toFixed(2) + '%';

                var percentage2 = amountWritten/totalSize;
                var elem2 = document.getElementById("myBar2");
                elem2.style.width = (percentage2 * 100) + '%';
                document.getElementById("progressLabel2").innerHTML = ((percentage2 * 100)).toFixed(2) + '%';
            if(totalDone >= totalFiles){
                setTimeout(clearProgress(), 1000);
            }

        }
    });
    // increments the total amount done each time a file has been successfully transferred
    read.on('end', ()=>{
        totalDone++;
    });
}

// once a transfer is completed, this will clear the progress bar area of unneeded text
function clearProgress(){
    document.getElementById("myBar2").style.width = '0%';
    document.getElementById("myBar").style.width = '0%';

    document.getElementById("progressLabel").innerHTML = '0%';
    document.getElementById("progressLabel2").innerHTML = '0%';

    document.getElementById('itemTransferred').innerHTML = '';
    document.getElementById('amountDone').innerHTML = '';
    document.getElementById('totalItems').innerHTML = '';
    document.getElementById('perSecond').innerHTML = '';

    totalFiles = 0;
    totalDone = 0;
    totalSize = 0;
    amountWritten = 0;
    interval = 1;
}



/*
Counts the total amount of file in a directory on the remote server being transferred.
Also adds the size of each file in bytes to the totalSize variable to know how large the directory is total.
 */
function countTotalFilesRemote(sftp, selectedFile){
    sftp.readdir(selectedFile, function(err, list){
        if(err) throw err;
        totalFiles += list.length;
        for(var i = 0; i < list.length; i++){
            var newPath = selectedFile + "/" + list[i].filename;
            totalSize += list[i].attrs.size;
            if(list[i].longname.toString().charAt(0) === 'd'){
                countTotalFilesRemote(sftp, newPath);
            }
        }
    });
}

/*
 Counts the total amount of file in a directory on the local machine being uploaded
 Also adds the size of each file in bytes to the totalSize variable to know how large the directory is total.
 */
function countTotalFilesLocal(selectedFile){
    fs.readdir(selectedFile, function (err, files) {
        if (err) throw err;
        totalFiles += files.length;
        for(var i = 0; i < files.length; i++){
            var newPath = selectedFile + slash + files[i];
            if(fs.lstatSync(newPath).isDirectory()){
                countTotalFilesLocal(newPath);
            }
            else{
                fs.lstat(newPath, function(err, stats){
                    totalSize += stats.size;
                });
            }
        }
    });
}