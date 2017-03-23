$('#upperLevelsLocal').change(function(){
    somepath = $(this)[0].value;
    var newJson = setTree(somepath);

    $('#jstree').jstree('destroy');

    initTree(newJson);
});

$('#upperLevelsRemote').change(function(){
    remotePath = $(this)[0].value;

    $('#jstree2').jstree('destroy');

    getTreeData(remotePath);
});


$('#userInfo').mouseup(function(){
    console.log("released on remote");
});