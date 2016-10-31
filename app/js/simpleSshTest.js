
var Client = require('ssh2').Client;
var log = require('electron-log');
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

//Initializes info from form
function uploadFile() {

    var uname, pass, server, path1, path2;

    var x = document.getElementById("frm1");

    uname = x.elements[1].value;
    pass = x.elements[2].value;
    server = x.elements[3].value;
    path1 = x.elements[4].value;
    path2 = x.elements[5].value;

    var connSettings = {
        host:       'river.cs.plu.edu',
        port:       22,
        username:   uname,
        password:   pass
    };

    var conn = new Client();
    conn.on('ready', function(){
        conn.sftp(function(err, sftp){
            if(err) throw err;

            var selectedFile = document.getElementById('localFileDir').files[0];
            var pathToSend = document.getElementById('path2');
            console.log(pathToSend.value);
            //use sftp here
            var fs = require("fs");
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
            read.pipe(write)
        });
    }).connect(connSettings);

}

function downloadFile(){

    var uname, pass, server, path1, path2;

    var x = document.getElementById("frm1");

    uname = x.elements[1].value;
    pass = x.elements[2].value;
    server = x.elements[3].value;
    path1 = x.elements[4].value;
    path2 = x.elements[5].value;

    var connSettings = {
        host:       'river.cs.plu.edu',
        port:       22,
        username:   uname,
        password:   pass
    };

    var conn = new Client();
    conn.on('ready', function(){
        conn.sftp(function(err, sftp){
            if(err) throw err;

            var selectedFile = document.getElementById('serverFile');
            var pathToSend = document.getElementById('localFilePath');

            //use sftp here
            var fs = require("fs");
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