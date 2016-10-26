var SSH = require('simple-ssh');


function myFunction() {
    var x = document.getElementById("frm1");
    var text = "";
    var i;
    for (i = 0; i < x.length ;i++) {
        text += x.elements[i].id + ": "+ x.elements[i].value + "\n";
    }
    document.getElementById("area").innerHTML = text;
}



var username, password, server, path1, path2;

//Initializes info from form
function getInfo() {
    var x = document.getElementById("frm1");

    username = x.elements[1].value;
    password = x.elements[2].value;
    server = x.elements[3].value;
    path1 = x.elements[4].value;
    path2 = x.elements[5].value;

    var ssh = new SSH({
        host: server,
        user: username,
        pass: password
    });


    ssh.exec('sftp '+username+':'+password+ '@'+server+':/taylor.txt C:/Users/Taylor/Desktop', {
        out: function (stdout) {
            console.log(stdout);
            document.getElementById("area").innerHTML = stdout;
        }
    }).start();

    ssh.exec('ls', {
        out: function (stdout) {
            console.log(stdout);
        }
    }).start();

}
