const os = require("os");
const path = require('path');

var slash = path.sep ;
var checkDelete = false;
var arbitraryCounter = 0;
var globalSftp = "";

// Remote root default directory
var remotePath = "./";

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
                "max_children" : 0,
                "li_attr" : {name: "#jstree"}
            },
            "folder" : {
                "li_attr" : {name: "#jstree"}
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
        plugins: ["dnd", "sort", "contextmenu", "types", "unique"],

        "contextmenu":{
            "items":    function($node){
                var curTree = $('#jstree').jstree(true) ;
                return{
                    "Rename": {
                        "label": "Rename",
                        "action": function (obj) {
                            curTree.edit($node) ;
                        }
                    },
                    "Delete": {
                        "label": "Delete",
                        "action": function (obj) {
                            curTree.delete_node($node) ;
                        }
                    },
                    "Upload Folder":{
                        "label": "Upload to Root",
                        "action": function(obj){
                            if(conn!=null){
                                console.log(remotePath);
                                console.log(somepath);
                                console.log($node);

                                // will upload a file when it is double clicked to the root of the other tree
                                if($node.type === "file"){
                                    selectUpload($node.id, remotePath + $node.text);

                                    var newNode = {text: $node.text, icon: "jstree-file", id: remotePath + $node.text, parent: '#', type: 'file'};
                                    if(!$('#jstree2').jstree(true).get_node(newNode.id)){
                                        $('#jstree2').jstree('create_node', '#', newNode);
                                    }
                                }
                                if($node.type === "folder"){
                                    selectUpload($node.id, remotePath + $node.text);

                                    var newNode = {text: $node.text, icon: "", id: remotePath + $node.text, parent: '#', type: 'folder'};
                                    if(!$('#jstree2').jstree(true).get_node(newNode.id)){
                                        $('#jstree2').jstree('create_node', '#', newNode);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // event for whenever something is changed in tree
    $('#jstree').on("changed.jstree", function (e, data) {
        console.log(data.selected);
    })

    // loads the select menu for parent directories once the tree is loaded
    .on("loaded.jstree", function (e, data) {
        var localOptions = document.getElementById('upperLevelsLocal');
        var localOptions2 = document.getElementById('upperLevel');

        // empties the select option every time a tree is loaded

        localOptions2.removeChild(localOptions2.firstChild);
        while(localOptions.firstChild){
            localOptions.removeChild(localOptions.firstChild);
        }
        var tempPath = "";
        var appendedPath = "";
        $('#upperLevel').prepend($('<button type="button" id="upperLevels" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' + somepath + '<span class="caret"></span> </button>'));


        // loops through the current directory path string
        for(var i = 0; i < somepath.length; i++){
            tempPath += somepath[i];

            if(somepath[i] == slash){
                appendedPath += tempPath;
                // prepends html to the select if it is not the current directory
                if(appendedPath != somepath)
                    $(localOptions).prepend($('<li><a href="#" class="localDirClicked">' + appendedPath + '</a></li>'));


                tempPath = "";
            }

        }



        $('.localDirClicked').click(function () {
            console.log(this.text);
            somepath = this.text;

            var newJson = setTree(somepath);

            $('#jstree').jstree('destroy');

            initTree(newJson);
        });
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

    /*
     * Context Menu Listener for Rename Event
     */
    .on('rename_node.jstree', function(e, data) {
        var curNode = $('#jstree').jstree(true).get_node(data.node);    //The selected node to rename
        var oldpath = data.node.id;             //The name of the old path
        var parentpath = data.node.parent ;     //The name of the parent's path
        var typeDone = data.node.type           //The type of the node
        console.log("Parent is: " + parentpath) ;   //for reference

        //For use when renaming something in the current root
        if(parentpath == "#"){
            parentpath = somepath ;
        }

        //create the name of the new node
        var newpath = parentpath + slash + data.node.text ;

        //Fix the id of the new node
        $('#jstree').jstree(true).set_id(curNode, newpath);
        console.log("Old: " + oldpath); //for reference
        console.log("New: " + newpath); //for reference

        //do the rename
        fs.rename( oldpath, newpath, function(err){
            if (err) throw err;
        });
        console.log(data);  //for reference

        //if the type is a folder, fix the children as well
        if(typeDone == "folder"){
            //for each child get new path name and update the id
            for(var i = 0; i < data.node.children.length; i++){
                var curChild = $('#jstree').jstree(true).get_node(data.node.children[i]);
                var newChildPath = curNode.id + slash + curChild.text
                console.log(curNode.id) ;
                $('#jstree').jstree(true).set_id(curChild, newChildPath);
            }
        }
        //logging for application users
        var msg = "file - " + oldpath + " renamed to " + newpath + "\n";
        document.getElementById("area").innerHTML += msg;
        log.info(msg);
    })

    /*
     *  Context Menu Listener for Delete Event
     */
    .on('delete_node.jstree', function(e, data){
        console.log(data.node.type);    //for reference
        var path = data.node.id ;       //file/folder to be removed
        //removing a file, calls unlink
        if(data.node.type == "file"){
            fs.unlink(path, function(err){
                if (err) throw err;
                var msg = "file - " + path + " was removed successfully" + "\n";
                document.getElementById("area").innerHTML += msg;
                log.info(msg);
            });
        }
        //else folders, calls recursive function
        else{
            delDirRecurLocal(data.node.id);
        }
    })

    // event for moving node from remote tree to local tree
    .on("copy_node.jstree", function (e, data) {
        checkDelete = true;
        var filename = data.node.text;
        var newPath = data.parent + slash + filename;
        var curNode = $('#jstree').jstree(true).get_node(data.node);
        // checks whether the parent of the current node is on the top layer. handles accordingly
        $('#jstree').jstree(true).set_id(curNode, newPath);
        if(curNode.parent == "#"){
            selectDownload(data.original.id, somepath + filename)
            console.log("1");
        }
        else{
            selectDownload(data.original.id, newPath);
            console.log("2");
        }

        // redraws the tree when done, making sure it is up to date
        $(this).jstree(true).redraw();

    });


}

$(document).ready(function () {
        var jsonContent = setTree(somepath);
        initTree(jsonContent);
});

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
            var trypath = "" ;
            globalSftp.realpath(remotePath, function(err, trypath){
                if (err) throw err ;
                remotePath = trypath + "/";
                getTreeData(remotePath);
            });
        });
    });
}

function getTreeData(dir) {
        console.log(dir) ;
        var jsonData = [];
        try {
            globalSftp.readdir(dir, function (err, list) {
                if (err) {
                    console.log(err)
                }
                else{
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
                }
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
                    "max_children" : 0,
                    "li_attr" : {name: "#jstree2"}
                },
                "folder" : {
                    "li_attr" : {name: "#jstree2"}
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
            plugins: ["dnd", "sort", "contextmenu", "types", "unique"],

            "contextmenu":{
                "items":    function($node){
                    var curTree = $('#jstree').jstree(true) ;
                    return{
                        "Rename": {
                            "label": "Rename",
                            "action": function (obj) {
                                curTree.edit($node) ;
                            }
                        },
                        "Delete": {
                            "label": "Delete",
                            "action": function (obj) {
                                curTree.delete_node($node) ;
                            }
                        },
                        "Download Folder":{
                            "label": "Download to Root",
                            "action": function(obj){
                                if(conn!=null){
                                    console.log(remotePath);
                                    console.log(somepath);
                                    console.log($node);

                                    // will upload a file when it is double clicked to the root of the other tree
                                    if($node.type === "file"){
                                        selectDownload($node.id, somepath + $node.text);

                                        var newNode = {text: $node.text, icon: "jstree-file", id: somepath + $node.text, parent: '#', type: 'file'};
                                        if(!$('#jstree').jstree(true).get_node(newNode.id)){
                                            $('#jstree').jstree('create_node', '#', newNode);
                                        }
                                    }
                                    if($node.type === "folder"){
                                        selectDownload($node.id, somepath + $node.text);

                                        var newNode = {text: $node.text, icon: "", id: somepath + $node.text, parent: '#', type: 'folder'};
                                        if(!$('#jstree').jstree(true).get_node(newNode.id)){
                                            $('#jstree').jstree('create_node', '#', newNode);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        })

        // once the data is loaded, we will retrieve the files for the directories on top
        .on("loaded.jstree", function (e, data) {
            var remoteOptions = document.getElementById('upperLevelsRemote');
            var remoteOptions2 = document.getElementById('upperLevel2');


            remoteOptions2.removeChild(remoteOptions2.firstChild);
            // empties the select option every time a tree is loaded
            while(remoteOptions.firstChild){
                remoteOptions.removeChild(remoteOptions.firstChild);
            }

            var tempPath = "";
            var appendedPath = "";

            $('#upperLevel2').prepend($('<button type="button" id="upperLevels2" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' + remotePath + '<span class="caret"></span> </button>'));

            // loops through the current directory path string
            for(var i = 0; i < remotePath.length; i++){
                tempPath += remotePath[i];

                if(remotePath[i] == '/'){
                    appendedPath += tempPath;
                    // prepends html to the select if it is not the current directory
                    if(appendedPath != remotePath && appendedPath != ".")
                        $(remoteOptions).prepend($('<li><a href="#" class="remoteDirClicked">' + appendedPath + '</a></li>'));

                    tempPath = "";
                }

            }

            $('.remoteDirClicked').click(function () {
                var oldpath = remotePath ;
                remotePath = this.text;

                $('#jstree2').jstree('destroy');

                getTreeData(remotePath);
            });
        })

        .on("changed.jstree", function(e, data){
          //  console.log(data.selected);
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

            //console.log(parentNode);
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
            var newId = data.parent + "/" + data.node.text;

            $('#jstree2').jstree(true).set_id(curNode, newId);
            // renames the path to the new path, essentially moving the file on the file system
            globalSftp.rename(oldPath, newId);
        })

        /*
         * Context Menu Listener for Rename Event
         */
        .on('rename_node.jstree', function(e, data) {
            var curNode = $('#jstree2').jstree(true).get_node(data.node);    //The selected node to rename
            var oldpath = data.node.id;             //The name of the old path
            var parentpath = data.node.parent + slash;     //The name of the parent's path
            var typeDone = data.node.type           //The type of the node
            console.log("oldpath: " + oldpath) ;   //for reference

            //For use when renaming something in the current root
            if(parentpath == "#" + slash){
                parentpath = remotePath ;
            }
            console.log("parentpath: " + parentpath) ;   //for reference

            //create the name of the new node
            var newpath = parentpath + data.node.text ;
            console.log("newpath: " + newpath) ;   //for reference

            //Fix the id of the new node
            $('#jstree2').jstree(true).set_id(curNode, newpath);
            console.log("Old: " + oldpath); //for reference
            console.log("New: " + newpath); //for reference

            //do the rename
            globalSftp.rename( oldpath, newpath, function(err){
                if (err) throw err;
            });
            console.log(data);  //for reference

            //if the type is a folder, fix the children as well
            if(typeDone == "folder"){
                //for each child get new path name and update the id
                for(var i = 0; i < data.node.children.length; i++){
                    var curChild = $('#jstree2').jstree(true).get_node(data.node.children[i]);
                    var newChildPath = curNode.id + slash + curChild.text
                    console.log(curNode.id) ;
                    $('#jstree2').jstree(true).set_id(curChild, newChildPath);
                }
            }
            //logging for application users
            var msg = "file - " + oldpath + " renamed to " + newpath + "\n";
            document.getElementById("area").innerHTML += msg;
            log.info(msg);
        })

        /*
         *  Context Menu Listener for Delete Event
         *  WIP RACE CONDITION ISSUES
         */
        .on('delete_node.jstree', function(e, data){
            console.log(data.node.type);    //for reference
            var path = data.node.id ;       //file/folder to be removed
            //removing a file, calls unlink
            if(data.node.type == "file"){
                globalSftp.unlink(path, function(err){
                    if (err) throw err;
                    var msg = "file - " + path + " was removed successfully" + "\n";
                    document.getElementById("area").innerHTML += msg;
                    log.info(msg);
                });
            }
            //else folders, calls recursive function
            else{
                delDirRecurRemote(data.node.id);
            }
        })

        // event for moving a node to the remote file tree
        .on("copy_node.jstree", function(e, data){
            checkDelete = true;
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

    });
}


// drag and drop
$(document).on("dnd_stop.vakata", function(e, data){
    var t = $(data.event.target);
    var selectedId = data.data.nodes[0];

    console.log(data);

    var isHovered = data.event.target.className;

    // will only execute if a node is dropped in whitespace, not over another node
    if(!isHovered.includes("hover")) {
        // if a node is dropped in the remote tree...
        if (t.closest('#userInfo').length) {

            if (!(data.data.origin.element[0].id === "jstree2")) {
                console.log("1");
                selectUpload(selectedId, remotePath + data.element.text);

                var selectNode = $('#jstree').jstree(true).get_node(selectedId);
                var newNode = {
                    text: data.element.text,
                    icon: selectNode.icon,
                    id: remotePath + data.element.text,
                    parent: '#',
                    type: selectNode.type
                };
                if (!$('#jstree2').jstree(true).get_node(selectedId)) {
                    $('#jstree2').jstree('create_node', '#', newNode);
                }
            }
        }

        // if a node is dropped in the local tree...
        if (t.closest('#fileForm').length) {

            if (!(data.data.origin.element[0].id === "jstree")) {
                console.log("2");
                selectDownload(data.data.nodes[0], somepath + data.element.text);

                var selectNode = $('#jstree2').jstree(true).get_node(selectedId);
                var newNode = {
                    text: data.element.text,
                    icon: selectNode.icon,
                    id: somepath + data.element.text,
                    parent: '#',
                    type: selectNode.type
                };
                if (!$('#jstree').jstree(true).get_node(selectedId)) {
                    $('#jstree').jstree('create_node', '#', newNode);
                }
            }
        }
    }
});


/*
 * Used for local delete of folders
 */
function delDirRecurLocal(path) {
    //reads each file in path (dir)
    fs.readdirSync(path).forEach(function(file) {
        //var that represents each file being looked at
        var curPath = path + slash + file;
        //if it is a dir, go in and delete it's contents too
        if(fs.statSync(curPath).isDirectory()) {
            //recursion
            delDirRecurLocal(curPath);
        } else {
            //removes all the files by unlink
            fs.unlinkSync(curPath);
        }
    });
    //removes the folder of what was called once it is empty
    fs.rmdirSync(path);
    var msg = "file - " + path + " was removed successfully" + "\n";
    document.getElementById("area").innerHTML += msg;
    log.info(msg);
};

/*
 * Used for local delete of folders
 */
function delDirRecurRemote(path) {

    console.log(path)
    //reads each file in path (dir)
    globalSftp.readdir(path, function(err, files) {
        if (err) throw err;
        var i = 0;
        files.forEach(function (file) {
            console.log(file)
            //var that represents each file being looked at
            var curPath = path + "/" + file.filename;
            var child = $('#jstree2').jstree(true).get_node(curPath) ;
            console.log(child) ;
            console.log(curPath) ;
            //if it is a dir, go in and delete it's contents too
            if (file.longname.charAt(0) == "d") {
                //recursion
                delDirRecurRemote(curPath);
            } else {
                //removes all the files by unlink
                globalSftp.unlink(curPath, function(err){
                    console.log(curPath) ;
                    if (err) throw err ;
                });

            }

            i++;
            if(i == files.length){
                //removes the folder of what was called once it is empty
                globalSftp.rmdir(path, function(err){
                    console.log(curPath) ;
                    if (err) throw err ;
                });
                var msg = "file - " + path + " was removed successfully" + "\n";
                document.getElementById("area").innerHTML += msg;
                log.info(msg);
            }
        });
    });
};