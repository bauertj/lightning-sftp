const os = require("os");

// Remote root default directory
var remotePath = "./";

var slash = "/";
if(os.type().includes("Windows")){
    slash = "\\";
}
var checkDelete = false;

// Local root default directory
var somepath = os.homedir() + slash;
/*
 * dir: directory path to where to get files
 *
 * Will return an array with json file format of file information for jstree
 * This is for the local file tree.
 */
var _getAllFilesFromFolder = function (dir) {
    var results = [];

    fs.readdirSync(dir).forEach(function (file) {
        var fullDir = dir  + file;

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
            console.log(err);
            results.push([file, "jstree-file", fullDir, "", dir]);
        }
    });

    return results;
};

/*
 * Sets up local file tree on open
 */

var obj;
function setTree(newPath){
    // the array of all files
    var result = _getAllFilesFromFolder(newPath);
    // json array to set up the file tree
    var jsonContent = [];

    // loops through the result array to add nodes to the json file
    for (var i = 0; i < result.length; i++) {
        // creates the json object and pushes it onto the json array
        obj = {text: result[i][0], icon: result[i][1], id: result[i][2], parent: "#"};
        jsonContent.push(obj);

        // if the data is a directory it will create the children for it
        if(result[i][3] != ""){
            var temp = result[i][3];
            var child = {text: temp, icon: "jstree-file", id: temp, parent: obj.id};
            jsonContent.push(child);
        }
    }
    return jsonContent;
}


function initTree(jsonContent) {
    // initializes the tree
    $('#jstree').jstree({
        core: {
            data: jsonContent,
            check_callback: function(callback){
                if(checkDelete){
                    checkDelete=false;
                    return callback !== "delete_node";
                }
            },
            dblclick_toggle: false
        },
        plugins: ["dnd", "sort", "contextmenu"]
    });

    // event for whenever something is changed in tree
    $('#jstree').on("changed.jstree", function (e, data) {
        console.log(data.selected);
    });

// loads the select menu for parent directories once the tree is loaded
    $('#jstree').on("loaded.jstree", function (e, data) {
        console.log("loaded");
        var localOptions = document.getElementById('upperLevelsLocal');



        // empties the select option every time a tree is loaded
        while(localOptions.firstChild){
            localOptions.removeChild(localOptions.firstChild);
        }
        var tempPath = "";
        var appendedPath = "";
        // loops through the current directory path string
        for(var i = 0; i < somepath.length; i++){
            tempPath += somepath[i];

            if(somepath[i] == slash){
                appendedPath += tempPath;
                // prepends html to the select if it is not the current directory
                if(appendedPath != somepath)
                    $(localOptions).prepend($('<option value="'+appendedPath+'">' + appendedPath + '</option>'));

                tempPath = "";
            }

        }
        // prepends the current directory
        $('#upperLevelsLocal').prepend($('<option value="'+appendedPath+'" selected>' + somepath + '</option>'));
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
        var newChildren = _getAllFilesFromFolder(data.node.id + slash);
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
        var newId = data.parent + slash + data.node.text;
        $('#jstree').jstree(true).set_id(curNode, newId);

        // renames path of file to new path, essentially moving it elsewhere on system
        fs.rename(oldPath, newId);
    });


    $('#jstree').bind("dblclick.jstree", function(event){
        var parentNode = $('#jstree').jstree(true).get_node(event.target.parentNode.id);
        if(parentNode.icon != "jstree-file") {
            somepath = event.target.parentNode.id + slash;

            var newJson = setTree(somepath);

            $('#jstree').jstree('destroy');

            initTree(newJson);
        }
    });

    //WIP
    $('#jstree').on('rename_node.jstree', function(e, data) {
        var curNode = $('#jstree').jstree(true).get_node(data.node);
        var oldpath = data.node.id;
        var parentpath = data.node.parent ;
        console.log("Parent is: " + parentpath) ;
        if(parentpath == "#"){
            parentpath = somepath ;
        }
        var newpath = parentpath + slash + data.node.text ;
        $('#jstree').jstree(true).set_id(curNode, newpath);
        console.log("Old: " + oldpath);
        console.log("New: " + newpath);
        fs.rename( oldpath, newpath)
        console.log("rename event");
    });

    $('#jstree').on('delete_node.jstree', function(e, data){
        console.log("delete event");
    });

}

$(document).ready(function () {
        var jsonContent = setTree(somepath);
        initTree(jsonContent);
});



var globalSftp = "";

/*
 * dir: the remote directory default path location
 *
 * Sets up remote file tree
 * Called when the user logs in to a remote server
 */
function retrieveData(dir){
    // listens for when the connection is ready
    conn.on('ready', function(err){
        conn.sftp(function(err, sftp) {
            globalSftp = sftp;
            getTreeData(remotePath);
        });
    });
}

function getTreeData(dir) {
        console.log("Here is the directory I am getting data from: " + dir);
        var jsonData = [];
        try {
            globalSftp.readdir(dir, function (err, list) {
                if (err) {
                    console.log(err)
                    console.log(dir);
                }
                // retrieves a list of files on the default path and loops through to populate json object
                for (var i = 0; i < list.length; i++) {
                    //console.log(list[i]);
                    var fileName = list[i].filename;
                    var fulldir = dir + fileName;
                    var longname = list[i].longname;
                    var icon = "";
                    // var id = dir;
                    if (longname.substring(0, 1) != "d") {
                        icon = "jstree-file";
                    }


                    var obj = {text: fileName, icon: icon, id: fulldir, parent: "#"};
                    jsonData.push(obj);
                    if (longname.substring(0, 1) == "d") {
                        var child = {text: "test", icon: "jstree-file", id: "test", parent: fulldir};
                        jsonData.push(child);
                    }
                }

                // creates tree with the json data that was created
                createTree(jsonData);
            });
        }catch(err){
            console.log(dir);
            alert(err);
        }
}

/**
 * Sets up remote file tree when the user logs in
 * Deals with all event handling within
 *
 * @param jsonData jsonData object to pass in
 * @param sftp sftp object to pass in
 */
function createTree(jsonData){
    // once the user logs in, remove the login html from the page
    var child = document.getElementById("removable");
    child.style.display = 'none';

    $(function () {
        // sets up remote file tree with data given
        $('#jstree2').jstree({
            core: {
                data: jsonData,
                check_callback: function(callback){
                    if(checkDelete){
                        checkDelete=false;
                        return callback !== "delete_node";
                    }
                },
                dblclick_toggle: false
            },
            plugins: ["dnd", "sort", "contextmenu"]
        });

        // once the data is loaded, we will retrieve the files for the directories on top
        $('#jstree2').on("loaded.jstree", function (e, data) {
            var remoteOptions = document.getElementById('upperLevelsRemote');

            // empties the select option every time a tree is loaded
            while(remoteOptions.firstChild){
                remoteOptions.removeChild(remoteOptions.firstChild);
            }


            console.log("I created the tree! Here is the path: " + remotePath);
            var tempPath = "";
            var appendedPath = "";
            // loops through the current directory path string
            for(var i = 0; i < remotePath.length; i++){
                tempPath += remotePath[i];

                if(remotePath[i] == '/'){
                    appendedPath += tempPath;
                    // prepends html to the select if it is not the current directory
                    if(appendedPath != remotePath && appendedPath != ".")
                        $('#upperLevelsRemote').prepend($('<option value="'+appendedPath+'">' + appendedPath + '</option>'));

                    tempPath = "";
                }

            }
            // prepends the current directory
            $('#upperLevelsRemote').prepend($('<option value="'+appendedPath+'" selected>' + remotePath + '</option>'));
        })

        // event for when a node is opened
        $('#jstree2').on("open_node.jstree", function(e, data){
            console.log("this is not a test");
            globalSftp.readdir(data.node.id, function(err, list){
                console.log(list);
                for(var i = 0; i < list.length; i++) {

                    var filename = list[i].filename;
                    var longname = list[i].longname;
                    var fulldir = data.node.id + "/" + filename;

                    var parent = $('#jstree2').jstree(true).get_node(data.node.id);

                    // if it is not a directory, create as a file
                    if (longname.substring(0, 1) != "d") {
                        var child = {text: filename, icon: "jstree-file", id: fulldir};
                        if(!($('#jstree2').jstree(true).get_node(child.id))) {
                            $('#jstree2').jstree('create_node', parent, child);

                        }
                    }

                    // if the file is a directory it will create it as a directory
                    else {
                        var child = {text: filename, icon: "", id: fulldir};
                        if(!($('#jstree2').jstree(true).get_node(child.id))) {
                            $('#jstree2').jstree('create_node', parent, child);
                            var arbitraryNode = {text: "test", icon: "jstree-file", id: "test", parent: fulldir};
                            $('#jstree2').jstree('create_node', child, arbitraryNode);
                        }
                    }
                }
            });
        });


        $('#jstree2').bind("dblclick.jstree", function(event){
            var parentNode = $('#jstree2').jstree(true).get_node(event.target.parentNode.id);
            if(parentNode.icon != "jstree-file") {
                remotePath = event.target.parentNode.id + "/";

                $('#jstree2').jstree('destroy');

                getTreeData(remotePath);
            }
        });




        // event for moving nodes within the same tree
        $('#jstree2').on("move_node.jstree", function(e, data){
            // retrieves node being moved
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var oldPath = data.node.id;
            var newId = data.parent + slash + data.node.text;
            $('#jstree2').jstree(true).set_id(curNode, newId);
            // renames the path to the new path, essentially moving the file on the file system
            globalSftp.rename(oldPath, newId);
        });

        // event for moving a node to the local file tree
        $('#jstree2').on("copy_node.jstree", function(e, data){
            console.log(data);
            var filename = data.node.text;
            var newPath = data.parent + slash + filename;
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var newId = data.node.parent + slash + filename ;
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
            var newPath = data.parent + slash + filename;
            var curNode = $('#jstree').jstree(true).get_node(data.node);
            var newId = data.node.parent + slash + filename ;

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