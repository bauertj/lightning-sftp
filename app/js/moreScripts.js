$('#upperLevelsLocal').change(function(){
    somepath = $(this)[0].value;
    var newJson = setTree(somepath);

    $('#jstree').jstree('destroy');

    initTree(newJson);
});