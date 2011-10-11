/* Helpers */
// Pattern replacer
String.prototype.prep = function (d) {
    var s = this;
    for (var i in d) {
        s = s.replace(RegExp('{'+i+'}','gi'), function ($1) {
            return d[$1.substr(1, $1.length - 2)];
        });
    }
    return s;
}
// LZW string compressor
String.prototype.lzw = function () {
    var dict = {};
    var data = (this + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i = 1; i < data.length; i++) {
        currChar = data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        } else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase = currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i = 0; i < out.length; i++) {
        out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
}
// LZW string inflator
String.prototype.LZW = function () {
    var dict = {};
    var data = (this + "").split("");
    var currChar = data[0];
    var oldPhrase = currChar;
    var out = [currChar];
    var code = 256;
    var phrase;
    for (var i = 1; i < data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        } else {
            phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
        }
        out.push(phrase);
        currChar = phrase.charAt(0);
        dict[code] = oldPhrase + currChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
}


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
					.addClass(types[i] + " item_" + n)
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
				save();
			}
		})
		.disableSelection();

    /* Drag & Drop functionality */
    var droped = function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';     
      
        switch( true ) {        	
            case ($.inArray("url", e.dataTransfer.types) != -1) || ($.inArray("text/html", e.dataTransfer.types) != -1):
                var source = $( e.dataTransfer.getData("text/html") ).filter("img").attr("src") || $( e.dataTransfer.getData("text/html") ).find("img").attr("src") || $( e.dataTransfer.getData("text/html") ).attr("src") || e.dataTransfer.getData("url");
                addImage("url(" + source + ")", e);
            break;
            case $.inArray("Files", e.dataTransfer.types) != -1:
                alert("For the time being the map only saves URI data, in the future we might activate file drag and drop.");
/*                
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
*/                
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
        if (data && $(ev.target).parent().prop("id") === "map" ) {
            $(ev.target).css({ backgroundImage: data });
            save();
        }
    }    


    // Generate flow ID
    var newID = function () {
        var id = Math.floor((Math.random() * 1e5)).toString(16);
        while (localStorage.getItem(storeKey + id) != null)
        id = Math.floor((Math.random() * 1e5)).toString(16);
        return id;
    }
    
    var storeKey = "influenceMap::";
    var hasID = (document.location.hash.substr(2).length != 0);
    var influenceID = ""; //(hasID) ? document.location.hash.substr(2) : newID();
    
	// Returns an Array with the images on the wall ()
    var collectImages = function () {
        var data = [];
        $("#map > li").each(function () {
            data[data.length] = {
                src: $(this).css("backgroundImage"),
                type: $(this).prop("class"), 
                data: $(this).data("meta")
            }
        });
        return data;
    }    
    
    // Saves the object (stringified) to local store, key define abow
    var save = function () {
        if (localStorage) {
            var images = collectImages();
            localStorage.setItem(storeKey + influenceID, JSON.stringify({
                title: $("h2 > span:first").text(),
                images: images
            }).lzw());
//            window.location.hash = "#!" + influenceID;
            return localStorage.getItem(storeKey + influenceID);
        }
        return "No localStore support detected.";
    }    

    var load = function (idData) {
        if (localStorage) {
            var data = idData.length > 6 ? idData : localStorage.getItem(storeKey + idData);
            if (data) {
                data = JSON.parse(data.LZW());
                if (data.title) $("h2 > span:first").text(data.title);
                var i, img;
                var images = data.images;
                for (i in images) {
                    img = $("<li/>").addClass(images[i].type);
                    img.css({ backgroundImage: images[i].src })
	                   .data("meta", images[i].data);	                
	                $("." + images[i].type.replace(/ /g, ".")).replaceWith(img);
                }
                influenceID = idData.length < 7 ? idData : newID();
				//$('#map').masonry( 'reload' );
            }
        } else alert( "Local storage support missing." );
    }

    $("#saveLoad").dialog({ 
        modal: true,
        draggable: false,
        width: 350,
        resizable: false,
        autoOpen: false,
        open: function(event, ui) {
            $(this).children("textarea").val(save()).select();
        },
        close: function(event, ui) {
            load($(this).children("textarea").val());
        }, 
        buttons: [{
                text: "Okididdleydoki, let's go!",
                click: function() { $(this).dialog("close"); }
        }]        
    });    

    $("#tab").click(function(){ $("#saveLoad").dialog("open"); })

	//if(hasID) 
    load(influenceID);
  });