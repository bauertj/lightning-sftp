const os = require("os");

// Remote root default directory
var remotePath = "./";

var slash = "/";
if(os.type().includes("Windows")){
    slash = "\\";
}
var checkDelete = false;
var arbitraryCounter = 0;

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
                results.push([file, "jstree-file", fullDir, "", "file"]);
            }
            else if (stats.isDirectory()) {
                results.push([file, "", fullDir, "test"+arbitraryCounter, "folder"]);
            }
            arbitraryCounter++;
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
        obj = {text: result[i][0], icon: result[i][1], id: result[i][2], parent: "#", type: result[i][4]};
        jsonContent.push(obj);

        // if the data is a directory it will create the children for it
        if(result[i][3] != ""){
            var temp = result[i][3];
            var child = {text: "test", icon: "jstree-file", id: temp, parent: obj.id, type: "file"};
            jsonContent.push(child);
        }
    }
    return jsonContent;
}

/**
 * Initializes the local file tree.
 * This method also contains all the functionality of the local tree
 * with event listeners implemented.
 * @param jsonContent the content of the tree in json format
 */
function initTree(jsonContent) {
    // initializes the tree
    $('#jstree').jstree({
        "types": {
            "file" : {
                "max_children" : 0
            },
            "folder" : {

            }
        },
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
        plugins: ["dnd", "sort", "contextmenu", "types", "unique"]
    });

    // event for whenever something is changed in tree
    $('#jstree').on("changed.jstree", function (e, data) {
        console.log(data.selected);
    })

    // loads the select menu for parent directories once the tree is loaded
    .on("loaded.jstree", function (e, data) {
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
    })

    // Local file tree event when a node is opened
    .on("open_node.jstree", function(e, data){

        // removes the 'test' node put in
        for(var i = 0; i < data.node.children.length; i++){
            if(data.node.children[i].includes("test")){
                var removable = $('#jstree').jstree(true).get_node(data.node.children[i]);
                if(removable.text === "test")
                    $('#jstree').jstree(true).hide_node(removable);
            }
        }

        // array of node objects, loops through and creates nodes
        var newChildren = _getAllFilesFromFolder(data.node.id + slash);
        for(var i = 0; i < newChildren.length; i++){
            var child = {text: newChildren[i][0], icon: newChildren[i][1], id: newChildren[i][2], parent: obj.id, type: newChildren[i][4]};
            // creates node in tree if the id does not already exist
            if(!($('#jstree').jstree(true).get_node(newChildren[i][2]))){
                $('#jstree').jstree('create_node', data.node.id, child);
            }

            // checks if new node is a directory, then creates arbitrary file
            if(child.icon == ""){
                var arbitraryNode = {text: "test", icon: "jstree-file", id: "test"+arbitraryCounter, parent: child.id};
                $('#jstree').jstree('create_node', child, arbitraryNode);
                arbitraryCounter++;
            }
        }
    })

    // event for when a node is moved within the same tree. updates both on tree
    // and on the file system
    .on('move_node.jstree', function(e, data){
        var curNode = $('#jstree').jstree(true).get_node(data.node);
        var oldPath = data.node.id;
        var newId = data.parent + slash + data.node.text;
        $('#jstree').jstree(true).set_id(curNode, newId);

        // renames path of file to new path, essentially moving it elsewhere on system
        fs.rename(oldPath, newId);

    })


    .bind("dblclick.jstree", function(event){
        // parentNode is the node that is double clicked
        var parentNode = $('#jstree').jstree(true).get_node(event.target.parentNode.id);

        console.log(parentNode);
        // if it is a folder, create a new tree with that as the root
        if(parentNode.type === "folder") {
            somepath = event.target.parentNode.id + slash;

            var newJson = setTree(somepath);
            $('#jstree').jstree('destroy');
            initTree(newJson);
        }

        // will upload a file when it is double clicked to the root of the other tree
        if(conn != null && parentNode.type === "file"){
            selectUpload(parentNode.id, remotePath + parentNode.text);

            var newNode = {text: parentNode.text, icon: "jstree-file", id: remotePath + parentNode.text, parent: '#', type: 'file'};
            if(!$('#jstree2').jstree(true).get_node(newNode.id)){
                $('#jstree2').jstree('create_node', '#', newNode);
            }

        }
    })

    //WIP
    .on('rename_node.jstree', function(e, data) {
        var curNode = $('#jstree').jstree(true).get_node(data.node);
        var oldpath = data.node.id;
        var parentpath = data.node.parent ;
        var typeDone = data.node.type
        console.log("Parent is: " + parentpath) ;
        if(parentpath == "#"){
            parentpath = somepath ;
        }
        var newpath = parentpath + slash + data.node.text ;
        $('#jstree').jstree(true).set_id(curNode, newpath);
        console.log("Old: " + oldpath);
        console.log("New: " + newpath);
        fs.rename( oldpath, newpath, function(err){
            if (err) throw err;
        });
        console.log(data);
        if(typeDone == "folder"){
            for(var i = 0; i < data.node.children.length; i++){
                var curChild = $('#jstree').jstree(true).get_node(data.node.children[i]);
                var newChildPath = curNode.id + slash + curChild.text
                console.log(curNode.id) ;
                $('#jstree').jstree(true).set_id(curChild, newChildPath);
            }
        }
        console.log("rename event");
    })

    .on('delete_node.jstree', function(e, data){
        console.log(data.node.type);
        //works for files
        if(data.node.type == "file"){
            fs.unlink(data.node.id, function(err){
               if (err) throw err;
            });
        }
        //else folders WIP
        else{
            console.log("WIP");
        }

    })
    // event for moving node from remote tree to local tree
    .on("copy_node.jstree", function (e, data) {
        var filename = data.node.text;
        var newPath = data.parent + slash + filename;
        var curNode = $('#jstree').jstree(true).get_node(data.node);
        var newId = somepath + filename ;

        // checks whether the parent of the current node is on the top layer. handles accordingly
        $('#jstree').jstree(true).set_id(curNode, newId);
        if(curNode.parent == "#"){
            selectDownload(data.original.id, somepath + filename)
        }
        else{
            selectDownload(data.original.id, newPath);
        }

        // redraws the tree when done, making sure it is up to date
        $(this).jstree(true).redraw();

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
                    var type = "folder";
                    // var id = dir;
                    if (longname.substring(0, 1) != "d") {
                        icon = "jstree-file";
                        type = "file";
                    }


                    var obj = {text: fileName, icon: icon, id: fulldir, parent: "#", type: type};
                    jsonData.push(obj);
                    if (longname.substring(0, 1) == "d") {
                        var child = {text: "test", icon: "jstree-file", id: "test" + arbitraryCounter, parent: fulldir, type: "file"};
                        jsonData.push(child);
                        arbitraryCounter++;
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
            "types": {
                "file" : {
                    "max_children" : 0
                },
                "folder" : {

                }
            },
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
            plugins: ["dnd", "sort", "contextmenu", "types", "unique"]
        })

        // once the data is loaded, we will retrieve the files for the directories on top
        .on("loaded.jstree", function (e, data) {
            var remoteOptions = document.getElementById('upperLevelsRemote');

            // empties the select option every time a tree is loaded
            while(remoteOptions.firstChild){
                remoteOptions.removeChild(remoteOptions.firstChild);
            }

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
        .on("open_node.jstree", function(e, data){
            // removes the 'test' node put in
            for(var i = 0; i < data.node.children.length; i++){
                if(data.node.children[i].includes("test")){
                    var removable = $(this).jstree(true).get_node(data.node.children[i]);
                    if(removable.text === "test")
                        $(this).jstree(true).hide_node(removable);
                }
            }
            globalSftp.readdir(data.node.id, function(err, list){
                for(var i = 0; i < list.length; i++) {

                    var filename = list[i].filename;
                    var longname = list[i].longname;
                    var fulldir = data.node.id + "/" + filename;

                    var parent = $('#jstree2').jstree(true).get_node(data.node.id);

                    // if it is not a directory, create as a file
                    if (longname.substring(0, 1) != "d") {
                        var child = {text: filename, icon: "jstree-file", id: fulldir, type: "file"};
                        if(!($('#jstree2').jstree(true).get_node(child.id))) {
                            $('#jstree2').jstree('create_node', parent, child);

                        }
                    }

                    // if the file is a directory it will create it as a directory
                    else {
                        var child = {text: filename, icon: "", id: fulldir, type: "folder"};
                        if(!($('#jstree2').jstree(true).get_node(child.id))) {
                            $('#jstree2').jstree('create_node', parent, child);
                            var arbitraryNode = {text: "test", icon: "jstree-file", id: "test" + arbitraryCounter, parent: fulldir};
                            $('#jstree2').jstree('create_node', child, arbitraryNode);
                            arbitraryCounter++;
                        }
                    }
                }
            });
        })


        .bind("dblclick.jstree", function(event){
            // parent node is the node that is double clicked
            var parentNode = $('#jstree2').jstree(true).get_node(event.target.parentNode.id);

            console.log(parentNode);
            // will open the directory as the new root when double clicked
            if(parentNode.type === "folder") {
                remotePath = event.target.parentNode.id + "/";
                $('#jstree2').jstree('destroy');
                getTreeData(remotePath);
            }
            
            // double click file to download
            if(conn != null && parentNode.type === "file"){
                selectDownload(parentNode.id, somepath + parentNode.text);
                var newNode = {text: parentNode.text, icon: "jstree-file", id: somepath + parentNode.text, parent: '#', type: 'file'};
                if(!$('#jstree').jstree(true).get_node(newNode.id)){
                    $('#jstree').jstree('create_node', '#', newNode);
                }
            }
        })


        // event for moving nodes within the same tree
        .on("move_node.jstree", function(e, data){
            // retrieves node being moved
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var oldPath = data.node.id;
            var newId = data.parent + slash + data.node.text;

            $('#jstree2').jstree(true).set_id(curNode, newId);
            // renames the path to the new path, essentially moving the file on the file system
            globalSftp.rename(oldPath, newId);
        })

        // event for moving a node to the remote file tree
        .on("copy_node.jstree", function(e, data){
            var filename = data.node.text;
            var newPath = data.parent + slash + filename;
            var curNode = $('#jstree2').jstree(true).get_node(data.node);
            var newId = data.node.parent + slash + filename ;
            $('#jstree2').jstree(true).set_id(curNode, newId);

            // checks whether the parent of the current node is on the top layer. handles accordingly
            if(curNode.parent == "#"){
                selectUpload(data.original.id, remotePath + filename);
            }
            else{
                selectUpload(data.original.id, newPath);
            }

            // redraws the tree when done, making sure it is up to date
            $('#jstree2').jstree(true).redraw();
        });

       /* $(document).on("dnd_stop.vakata", function(e, data){
            console.log(data);
            var origin = data.data.origin.element[0].id;
            if(origin === "jstree"){

            }
            else if(origin === "jstree2"){
                $('#jstree').mouseup(function(){


                    console.log("released on local");


                }).off();
            }
        });*/
    });
}