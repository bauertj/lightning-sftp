
const os = require("os");
// Local root default directory
var somepath = os.homedir() + "/";
// Remote root default directory
var remotePath = "./";

var _getAllFilesFromFolder = function (dir) {
    var results1 = [];

    fs.readdirSync(dir).forEach(function (file) {
        var fullDir = dir + file;

        try {
            var stats = fs.statSync(fullDir);

            if (stats.isFile()) {
                results1.push([file, "jstree-file", fullDir, ""]);
            }
            else if (stats.isDirectory()) {
                var children = _getFilesSecondLayer(fullDir + "/");
                results1.push([file, "", fullDir, "test"]);
            }
        }
        catch(err){
            results1.push([file, "jstree-file", fullDir, "", dir]);
        }
    });

    return results1;
};

var _getFilesSecondLayer = function(dir){
    var results = [];

    fs.readdirSync(dir).forEach(function (file){
        var fullDir = dir + file;

        try {
            var stats = fs.statSync(fullDir);

            if (stats.isFile()) {
                results.push([file, "jstree-file", fullDir, "", dir]);
            }
            else if (stats.isDirectory()) {

                results.push([file, "", fullDir, "", dir]);
            }
        }
        catch(err){
            results.push([file, "jstree-file", fullDir, "", dir]);
        }

    });

    return results;
}



/* Sets up local file tree

 */
$(document).ready(function () {
        //EDIT HERE

        var result = _getAllFilesFromFolder(somepath);
        var jsonContent = [];
        for (var i = 0; i < result.length; i++) {

            var obj = {text: result[i][0], icon: result[i][1], id: result[i][2], parent: "#"};
            jsonContent.push(obj);

            // if the data is a directory it will create the children for it
            if(result[i][3] != ""){
                var temp = result[i][3];
                var child = {text: temp, icon: "jstree-file", id: temp, parent: obj.id};
                jsonContent.push(child);
                /*for(var j = 0; j < temp.length; j++){
                    var child = {text: temp[j][0], icon: temp[j][1], id: temp[j][2], parent: obj.id};
                    jsonContent.push(child);
                }*/
            }
        }

        $(function () {

            $('#jstree').jstree({
                core: {
                    data: jsonContent,
                    check_callback: function(callback){
                        return callback !== "delete_node";
                    }
                },
                plugins: ["dnd", "sort", "state"]
            });

            $('#jstree').on("changed.jstree", function (e, data) {
                console.log(data.selected);
            });

            // Local file tree event when a node is opened
            $('#jstree').on("open_node.jstree", function(e, data){
                // arbitrary node is always first on list, id is always 'test'
                var removable = $('#jstree').jstree(true).get_node(data.node.children[0]);
                if(removable.id == "test") {
                    // hides arbitrary node now that other nodes are created
                    $('#jstree').jstree('hide_node', data.node.children[0]);
                }

                // array of node objects, loops through and creates nodes
                var newChildren = _getAllFilesFromFolder(data.node.id + "/");
                for(var i = 0; i < newChildren.length; i++){
                    var child = {text: newChildren[i][0], icon: newChildren[i][1], id: newChildren[i][2], parent: obj.id};
                    // creates node in tree if the id does not already exist
                    if(!($('#jstree').jstree(true).get_node(newChildren[i][2]))){
                        $('#jstree').jstree('create_node', data.node.id, child);
                    }

                    // checks if new node is a directory, then creates arbitrary file
                    if(child.icon == ""){
                        var arbitraryNode = {text: temp, icon: "jstree-file", id: temp, parent: child.id};
                        $('#jstree').jstree('create_node', child, arbitraryNode);
                    }
                }
            });

            $('#jstree').on('move_node.jstree', function(e, data){
                var curNode = $('#jstree').jstree(true).get_node(data.node);
                var oldPath = data.node.id;
                var newId = data.parent + "/" + data.node.text;
                $('#jstree').jstree(true).set_id(curNode, newId);

                fs.rename(oldPath, newId);
                console.log("First tree: " + curNode);
            });
        });
    }
);

/*
 Sets up remote file tree
 */
function retrieveData(dir){
    var jsonData = [];

    conn.on('ready', function(err){
        conn.sftp(function(err, sftp){
            sftp.readdir(dir, function (err, list) {
                for(var i = 0; i < list.length; i++){
                    var fileName = list[i].filename;
                    var fulldir = dir + fileName;
                    var longname = list[i].longname;
                    var icon = "";
                    // var id = dir;
                    if(longname.substring(0,1) != "d"){
                        icon = "jstree-file";
                    }

                    var obj = {text: fileName, icon: icon, id: fulldir, parent: "#"};
                    jsonData.push(obj);
                }

                createTree(jsonData, sftp);
            });
        });
    });
}
function _getAllFilesSecondLayer(dir, sftp){
    sftp.readdir(dir, function (err, list) {
        for(var i = 0; i < list.length; i++) {
            var filename = list[i].filename;
            var longname = list[i].longname;
            var fulldir = dir + "/" + filename;

            var parent = $('#jstree2').jstree(true).get_node(dir);

            if (longname.substring(0, 1) != "d") {
                var child = {text: filename, icon: "jstree-file", id: fulldir};
                if(!($('#jstree2').jstree(true).get_node(child.id))) {
                    $('#jstree2').jstree('create_node', parent, child);
                }
            }
            else {
                var child = {text: filename, icon: "", id: fulldir};
                if(!($('#jstree2').jstree(true).get_node(child.id))) {
                    $('#jstree2').jstree('create_node', parent, child);
                }
            }
        }// for
    });// readdir
}

function createTree(jsonData, sftp){
    var parent = document.getElementById("userInfo");
    var child = document.getElementById("removable");
    parent.removeChild(child);
    $(function () {
        $('#jstree2').jstree({
            core: {
                data: jsonData,
                check_callback: function(callback){
                    return callback !== "delete_node";
                }
            },
            plugins: ["dnd", "sort", "state"]
        });

        $('#jstree2').on("loaded.jstree", function (e, data) {

            for (var i = 0; i < jsonData.length; i++) {
                if (jsonData[i].icon == "") {
                    _getAllFilesSecondLayer(jsonData[i].id, sftp);
                }
            }
        })

        $('#jstree2').on("open_node.jstree", function(e, data){
            sftp.readdir(data.node.id, function(err, list){
                for(var i = 0; i < list.length; i++) {
                    if (list[i].longname.substring(0,1) == "d") {
                        var newPath = data.node.id + "/" + list[i].filename;
                        _getAllFilesSecondLayer(newPath, sftp);
                    }
                }
            });
        });

        $('#jstree2').on("move_node.jstree", function(e, data){
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var oldPath = data.node.id;
            var newId = data.parent + "/" + data.node.text;
            $('#jstree2').jstree(true).set_id(curNode, newId);
            sftp.rename(oldPath, newId);
            console.log("Second tree: " + curNode);
        });

        $('#jstree2').on("copy_node.jstree", function(e, data){
            var filename = data.node.text;
            var newPath = data.parent + "/" + filename;
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var newId = data.node.parent + "/" + filename ;
            $('#jstree2').jstree(true).set_id(curNode, newId);
            if(curNode.parent == "#"){
                selectUpload(data.original.id, "./" + filename);
            }
            else{
                selectUpload(data.original.id, newPath);
            }
            $('#jstree2').jstree(true).redraw();
        });

        $('#jstree').on('copy_node.jstree', function (e, data) {
            var filename = data.node.text;
            var newPath = data.parent + "/" + filename;
            var curNode = $('#jstree').jstree(true).get_node(data.node);
            var newId = data.node.parent + "/" + filename ;
            $('#jstree').jstree(true).set_id(curNode, newId);
            if(curNode.parent == "#"){
                selectDownload(data.original.id, somepath + filename)
            }
            else{
                selectDownload(data.original.id, newPath);
            }
            $('#jstree').jstree(true).redraw();

        });
    });
}