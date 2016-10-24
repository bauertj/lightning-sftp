//var SSH = require('simple-ssh');


function myFunction() {
    var x = document.getElementById("frm1");
    var text = "";
    var i;
    for (i = 0; i < x.length ;i++) {
        text += x.elements[i].id + ": "+ x.elements[i].value + "<br>";
    }
    document.getElementById("area").innerHTML = text;
}



var username, password, server, path1, path2;

//Initializes info from form
function getInfo() {
    var x = document.getElementById("frm1");

    username = x.elements[0].value;
    password = x.elements[1].value;
    server = x.elements[2].value;
    path1 = x.elements[3].value;
    path2 = x.elements[4].value;

}

var ssh = new SSH({
    host: server,
    user: username,
    pass: password
});

ssh.exec('echo $PATH', {
    out: function(stdout) {
        console.log(stdout);
    }
}).start();

/*** Using the `args` options instead ***/
ssh.exec('echo', {
    args: ['$PATH'],
    out: function(stdout) {
        console.log(stdout);
    }
}).start();

console.log('test');