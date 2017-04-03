$('#upperLevelsLocal').change(function(){
    somepath = $(this)[0].value;
    var newJson = setTree(somepath);

    $('#jstree').jstree('destroy');

    initTree(newJson);
});




$('#fileForm').mouseup(function(){
    console.log("released on tree");
});

$('#userInfo').mouseup(function(){
    console.log("released on tree2");
});