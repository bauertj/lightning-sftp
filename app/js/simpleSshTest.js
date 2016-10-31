
var Client = require('ssh2').Client;

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
            //use sftp here
            var fs = require("fs");
            var read = fs.createReadStream("C:/Users/Nate/Desktop/nate5.txt");
            var write = sftp.createWriteStream("public_html/nate5.txt");

            write.on('close',function (){
                console.log( "- file transferred successfully" );
            });

            write.on('end', function() {
                console.log( "sftp conn closed");
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
            //use sftp here
            var fs = require("fs");
            var read = sftp.createReadStream("public_html/nate5.txt");
            var write = fs.createWriteStream("C:/Users/Nate/Desktop/nate5.txt");

            write.on('close',function (){
                console.log( "- file transferred successfully" );
            });

            write.on('end', function() {
                console.log( "sftp conn closed");
                conn.close();
            });
            read.pipe(write)
        });
    }).connect(connSettings);

}