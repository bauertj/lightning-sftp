
var Client = require('ssh2').Client;
var conn = new Client();
var log = require('electron-log');
var fs = require("fs");
var jsonfile = require('jsonfile');
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




function notALoginFunction() {
    uname = document.getElementById("username").value;
    pass = document.getElementById("password").value;
    server = document.getElementById("serverName").value;




    connSettings = {
        host:       server,
        port:       22,
        username:   uname,
        password:   pass
    };


    console.log(jsonContent.connectionHistory);
    var obj = {host: connSettings.host, port: connSettings.port, username: connSettings.username};


    conn.on('ready', function(){
        console.log("You are now connected");

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