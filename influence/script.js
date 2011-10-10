  $(function(){
    
    var items = [1,2,2,1,7];
    var types = ["sq3x3","sq2x2","sq2x1","sq1x2","sq1x1"];
    var col = function(){ 
    	return '#'+('00'+(Math.random()*4096<<0).toString(16)).substr(-3);
	}
 
	var n;
    $.each(items, function(i,v){
		for(n=0; n<v; n++) {
			$('#map').append(
				$("<li/>")
					.addClass(types[i])
			);
		}
	});			
			    
    $('#map')
		.masonry({
		  itemSelector: 'li',
		  columnWidth: 182,
		  isAnimated: true,
		  isFitWidth: true, 
		  gutterWidthInteger: 10
		})
		.sortable({
			stop: function(){
				$('#map')
					.masonry( 'reload' );
 
			}
		})
		.disableSelection();

    /* Drag & Drop functionality */
    var droped = function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';        

        switch( true ) {
            case e.dataTransfer.types.indexOf("url") != -1:
                var source = $( e.dataTransfer.getData("text/html") ).filter("img").attr("src") || e.dataTransfer.getData("url");
                addImage("url(" + source + ")", e);
            break;
            case e.dataTransfer.types.indexOf("Files") != -1:
                var files = e.dataTransfer.files;
                for (var i in files) {
                    // Check that it's a image and not more than 500k
                    if (typeof files[i] == "object" && files[i].type.indexOf("image") > -1 && files[i].size < (1024 * 500)) {
                        reader = new FileReader();
                        reader.index = i;
                        reader.file = files[i];
                        reader.onload = function (evt) {
                            var tempImg = new Image();
                            tempImg.onload = function () {
                                addImage("url(" + this.src + ")", e);
                            }
                            tempImg.src = evt.target.result;
                        }
                        reader.readAsDataURL(files[i]);
                    }
                }                
            break;
            default:
                addImage("url(" + e.dataTransfer.getData('Text') + ")", e);
        }
        return false;
    }

    // Prevent bubbeling and default behavior (loading the image in the browser)
    var cancel = function (e) {
      if (e.preventDefault) e.preventDefault(); // required by FF + Safari
      return false; // required by IE
    }

    //Add the event listner to the document
    document.addEventListener("drop", droped, true);
    $(document).bind('dragenter', cancel).bind('dragover', cancel).bind('dragleave', cancel);
    
    var addImage = function (data, ev) {
        if (data && $(ev.target).parent().prop("id") === "map" )
            $(ev.target).css({ backgroundImage: data });
    }    

  });