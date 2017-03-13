const os = require("os");
// Local root default directory
var somepath = os.homedir() + "/";
// Remote root default directory
var remotePath = "./";


/*
 * dir: directory path to where to get files
 *
 * Will return an array with json file format of file information for jstree
 * This is for the local file tree.
 */
var _getAllFilesFromFolder = function (dir) {
    var results = [];

    fs.readdirSync(dir).forEach(function (file) {
        var fullDir = dir + file;

        try {
            var stats = fs.statSync(fullDir);
            // Changes pushed information based on whether the result is a file or directory
            if (stats.isFile()) {
                results.push([file, "jstree-file", fullDir, ""]);
            }
            else if (stats.isDirectory()) {
                results.push([file, "", fullDir, "test"]);
            }
        }
        // sometimes stats is not permitted on some files. catch the error and assume it is a file
        catch(err){
            results.push([file, "jstree-file", fullDir, "", dir]);
        }
    });

    return results;
};

/*
 * Sets up local file tree on open
 */
$(document).ready(function () {

        // the array of all files
        var result = _getAllFilesFromFolder(somepath);
        // json array to set up the file tree
        var jsonContent = [];

        // loops through the result array to add nodes to the json file
        for (var i = 0; i < result.length; i++) {
            // creates the json object and pushes it onto the json array
            var obj = {text: result[i][0], icon: result[i][1], id: result[i][2], parent: "#"};
            jsonContent.push(obj);

            // if the data is a directory it will create the children for it
            if(result[i][3] != ""){
                var temp = result[i][3];
                var child = {text: temp, icon: "jstree-file", id: temp, parent: obj.id};
                jsonContent.push(child);
            }
        }

        $(function () {
            // initializes the tree
            $('#jstree').jstree({
                core: {
                    data: jsonContent,
                    check_callback: function(callback){
                        return callback !== "delete_node";
                    }
                },
                plugins: ["dnd", "sort", "state"]
            });

            // event for whenever something is changed in tree
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
                        var arbitraryNode = {text: "test", icon: "jstree-file", id: "test", parent: child.id};
                        $('#jstree').jstree('create_node', child, arbitraryNode);
                    }
                }
            });

            // event for when a node is moved within the same tree. updates both on tree
            // and on the file system
            $('#jstree').on('move_node.jstree', function(e, data){
                var curNode = $('#jstree').jstree(true).get_node(data.node);
                var oldPath = data.node.id;
                var newId = data.parent + "/" + data.node.text;
                $('#jstree').jstree(true).set_id(curNode, newId);

                // renames path of file to new path, essentially moving it elsewhere on system
                fs.rename(oldPath, newId);
            });
        });
    }
);

/*
 * dir: the remote directory default path location
 *
 * Sets up remote file tree
 * Called when the user logs in to a remote server
 */
function retrieveData(dir){
    var jsonData = [];

    // listens for when the connection is ready
    conn.on('ready', function(err){
        conn.sftp(function(err, sftp){
            sftp.readdir(dir, function (err, list) {
                // retrieves a list of files on the default path and loops through to populate json object
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
                // creates tree with the json data that was created
                createTree(jsonData, sftp);
            });
        });
    });
}

/*
 * dir: directory to get file information from
 * sftp: sftp object
 *
 * Reads a second layer of files in order to populate the remote file tree
 */
function _getAllFilesSecondLayer(dir, sftp){
    sftp.readdir(dir, function (err, list) {
        // retrieve a list of files in order to update the tree
        for(var i = 0; i < list.length; i++) {
            var filename = list[i].filename;
            var longname = list[i].longname;
            var fulldir = dir + "/" + filename;

            var parent = $('#jstree2').jstree(true).get_node(dir);

            // if the file is a directory it will create it as a directory
            if (longname.substring(0, 1) != "d") {
                var child = {text: filename, icon: "jstree-file", id: fulldir};
                if(!($('#jstree2').jstree(true).get_node(child.id))) {
                    $('#jstree2').jstree('create_node', parent, child);
                }
            }
            // if it is not a directory, create as a file
            else {
                var child = {text: filename, icon: "", id: fulldir};
                if(!($('#jstree2').jstree(true).get_node(child.id))) {
                    $('#jstree2').jstree('create_node', parent, child);
                }
            }
        }// for
    });// readdir
}

/**
 * Sets up remote file tree when the user logs in
 * Deals with all event handling within
 *
 * @param jsonData jsonData object to pass in
 * @param sftp sftp object to pass in
 */
function createTree(jsonData, sftp){
    // once the user logs in, remove the login html from the page
    var parent = document.getElementById("userInfo");
    var child = document.getElementById("removable");
    parent.removeChild(child);

    $(function () {
        // sets up remote file tree with data given
        $('#jstree2').jstree({
            core: {
                data: jsonData,
                check_callback: function(callback){
                    return callback !== "delete_node";
                }
            },
            plugins: ["dnd", "sort", "state"]
        });

        // once the data is loaded, we will retrieve the files for the directories on top
        $('#jstree2').on("loaded.jstree", function (e, data) {
            for (var i = 0; i < jsonData.length; i++) {
                if (jsonData[i].icon == "") {
                    _getAllFilesSecondLayer(jsonData[i].id, sftp);
                }
            }
        })

        // event for when a node is opened
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

        // event for moving nodes within the same tree
        $('#jstree2').on("move_node.jstree", function(e, data){
            // retrieves node being moved
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var oldPath = data.node.id;
            var newId = data.parent + "/" + data.node.text;
            $('#jstree2').jstree(true).set_id(curNode, newId);
            // renames the path to the new path, essentially moving the file on the file system
            sftp.rename(oldPath, newId);
        });

        // event for moving a node to the local file tree
        $('#jstree2').on("copy_node.jstree", function(e, data){
            var filename = data.node.text;
            var newPath = data.parent + "/" + filename;
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var newId = data.node.parent + "/" + filename ;
            $('#jstree2').jstree(true).set_id(curNode, newId);

            // checks whether the parent of the current node is on the top layer. handles accordingly
            if(curNode.parent == "#"){
                selectUpload(data.original.id, "./" + filename);
            }
            else{
                selectUpload(data.original.id, newPath);
            }
            
            // redraws the tree when done, making sure it is up to date
            $('#jstree2').jstree(true).redraw();
        });

        // event for moving node from local tree to remote tree
        $('#jstree').on('copy_node.jstree', function (e, data) {
            var filename = data.node.text;
            var newPath = data.parent + "/" + filename;
            var curNode = $('#jstree').jstree(true).get_node(data.node);
            var newId = data.node.parent + "/" + filename ;

            // checks whether the parent of the current node is on the top layer. handles accordingly
            $('#jstree').jstree(true).set_id(curNode, newId);
            if(curNode.parent == "#"){
                selectDownload(data.original.id, somepath + filename)
            }
            else{
                selectDownload(data.original.id, newPath);
            }

            // redraws the tree when done, making sure it is up to date
            $('#jstree').jstree(true).redraw();

        });
    });
}