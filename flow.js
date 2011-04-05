/*
 * time/flow wall app
 * 
 * TODO: fix image saving speeds, don't overdo it
 *       fix deleter css && auto-hide
 *       fix wallpicker
 *       fix deletion of walls 
 *       add descriptive image to wallpaper (fade it out?)
 *       add url linkage of images
 *       add unhosted storage
 *       add linking and sharing
 *       add password protection
 *       add username functionality
 *       move meta data to backside of note
 */




/* Helpers */
// Pattern replacer
String.prototype.prep = function (d) {
    var s = this;
    for (var i in d) {
        s = s.replace('{' + i + '}', function ($1) {
            return d[$1.substr(1, $1.length - 2)];
        });
    }
    return s;
}
// LZW string compressor
String.prototype.lzw = function(){
    var dict = {};
    var data = (this + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i=1; i<data.length; i++) {
        currChar=data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        }
        else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase=currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i=0; i<out.length; i++) {
        out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
}
// LZW string inflator
String.prototype.LZW = function(){
    var dict = {};
    var data = (this + "").split("");
    var currChar = data[0];
    var oldPhrase = currChar;
    var out = [currChar];
    var code = 256;
    var phrase;
    for (var i=1; i<data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        }
        else {
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

$(document).ready(function () { /* Vars */
    // From: http://www.instructables.com/id/Easy-Post-It-sticky-note-mosaics-using-free-soft/step13/Post-It-color-hex-values/
    var colors = {
        "Basic": ["#FCF0AD", "#FFFFFF"],
        "Neon": ["#E9E74A", "#EE5E9F", "#FFDD2A", "#F59DB9", "#F9A55B"],
        "Ultra": ["#D0E17D", "#36A9CE", "#EF5AA1", "#AE86BC", "#FFDF25"],
        "Tropical": ["#56C4E8", "#D0E068", "#CD9EC0", "#ED839D", "#FFE476"],
        "Samba": ["#CDDD73", "#F35F6D", "#FAA457", "#35BEB7", "#D189B9"],
        "Aquatic": ["#99C7BC", "#89B18C", "#738FA7", "#8A8FA3", "#82ACB8"],
        "Sunbrite": ["#F9D6AC", "#E9B561", "#E89132", "#DA7527", "#DEAC2F"],
        "Classic ": ["#BAB7A9", "#BFB4AF", "#CDC4C1", "#CFB69E", "#D0AD87"]
    }
    var shadow = "0 1em 2em rgba(0,0,0,.1)";
    var storeKey = "pjotor.com/time/flow/";
    var hasID = (document.location.hash.substr(2).length != 0);

    // Note drag options and cloning functions
    var Note = {
        stack: "section *",
        create: function () {
            var css = $(this).hasClass("new") ? {
                boxShadow: shadow,
                transform: "rotate(2.5deg)",
                top: "-60px",
                left: "-1px",
                position: "absolute"	
            } : {
                boxShadow: shadow
            };
            if (!$(this).hasClass("img")) $(this).css(css);

            $(this).resizable({
            	aspectRatio: $(this).hasClass("img"),
                autoHide: true,
                handles: 'se',
                maxHeight: $(window).height(),
                maxWidth: $(window).width(),
                stop: function() {
                	$(this).addClass("changed");
                	save();
                }
            });
        },
        start: function () {
            //The main cloning stuff
            if ($(this).hasClass("new")) {
                var newNote = $(this).clone();
                newNote.draggable(Note).prependTo("section");

                if (!$(this).hasClass("img")) setupColors($(this).children(".colors"));

                $(this).children("footer").text("created: {date} {time} ".prep(getTime()));
                $(this).data("created", "{date} {time}".prep(getTime()));
                $(this).removeClass("new");
            }
            $(this).nudge();
        },
        stop: function () {
            if ($(this).hasClass("new")) $(this).nudge();
           	$(this).addClass("changed");
            save();
        }
    }

    var imageCss = {
        boxShadow: "none",
        // The data provider from the FileReader API don't have height and width
        // TODO: see if there's a work around for this.
        position: "absolute",
        backgroundSize: "100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left top"
    }

    /* Extentions */
    // Slightly rotates the element with an animation.
    $.fn.nudge = function () {
        var rotate = "rotate(" + ((Math.random() * 5) - 2.5) + "deg)";
        return $(this).each(function () {
            $(this).animate({
                duration: 5e2,
                transform: rotate
            });
        })
    }

    /* Utils */
    // Zero padding. Defaiults to 2 chas.
    var z = function (s, p, l) {
        p = p || "00";
        l = l || 2;
        return (p + s).substr(l * -1);
    }

    var addImage = function (data, name) {
        // Create an article element with the image as background
        // This is to add the draging and resizing functionality
        var img = $("<article/>").addClass("img").css(imageCss);
        img.css({
            backgroundImage: data
        })
        $('<div class="del">&otimes;</div>').prependTo(img);
        img.prependTo("section");
        img.data({
            name: name,
            edited: true
        });
        img.draggable(Note);
        return img
    }

    // Generate flow ID
    var newID = function () {
        var id = Math.floor((Math.random() * 1e5)).toString(16);
        while (localStorage.getItem(storeKey + id) != null)
        id = Math.floor((Math.random() * 1e5)).toString(16);
        return id;
    }

    // Returns an Object with formatted time strings ( date: "YYYY-MM-DD" && time: "HH:MM").
    var getTime = function () {
        var d = new Date();
        return dateTime = {
            date: d.getFullYear() + "-" + z(+1 + d.getMonth()) + "-" + z(d.getDate()),
            time: z(d.getHours()) + ":" + z(d.getMinutes())
        }
    }

    // Sets up the color picker (colors defined abow).
    var setupColors = function (parent) {
        var selectedColors = [].concat(colors["Basic"]).concat(colors["Neon"]);
        var list = $("<ul/>").hover(

        function () {
            if ($(this).parent().width() != (selectedColors.length + 1) * 20) $(this).parent().stop().animate({
                duration: 200,
                width: ((selectedColors.length + 1) * 20) + "px"
            });
        }, function () {
            $(this).parent().stop().delay(1500).animate({
                duration: 200,
                width: "20px"
            });
        });
        for (c in selectedColors) {
            list.append(
            $("<li/>").css({
                background: selectedColors[c]
            }).click(function () {
                $(this).parents(".note").css({
                    backgroundColor: $(this).css("backgroundColor")
                });
                save();
            }));
        }
        list.appendTo(parent);
    };

    // Handles the bluring (helper)
    var bluring = function (ob) {
        if (!ob.text().length) {
            ob.text("Doubble click to edit…");
            ob.parents("article").data("edited", false);
            		ob.data("edited", false);
        } else {
        		ob.parents("article").data("edited", true);
        		ob.data("edited", true);
        }
        ob.attr("contenteditable", false);
    }

    // Focus on dblclick (helper)
    var focusing = function (ob) {
        ob.attr("contenteditable", true);
        if ( ob.parents("article").data("edited") || ob.data("edited") ) {
        	} else ob.text("");

        ob.focus().select();
    }

    /* Save/Load Functions */
    // Returns an Object with the notes (only edited notes (no, colorchange is not an edit))
    var collectNotes = function () {
        var data = [];
        $("section > .note").each(function () {
            if ($(this).data("edited")) {
                data[data.length] = {
                    title: $(this).children("header").text(),
                    note: $(this).children("p").text(),
                    info: $(this).children("footer").text(),
                    meta: {
                        created: $(this).data("created"),
                        updated: $(this).data("updated"),
                        position: $(this).position(),
                        backgroundColor: $(this).css("backgroundColor"),
                        zIndex: $(this).css("zIndex") || 0,
                        edited: true
                    }
                }
                $(this).removeClass("changed");
            }
        });
        return data;
    }

    var collectImages = function () {
        var data = [];
        $("section > .img").each(function () {
            data[data.length] = {
                name: $(this).data("name"),
                src: $(this).css("backgroundImage"),
                position: $.extend({}, $(this).position(), {
                    width: $(this).width(),
                    height: $(this).height()
                }),
                zIndex: $(this).css("zIndex") || 0
            }
            $(this).removeClass("changed");            
        });
        return data;
    }

    // Saves the object (stringified) to local store, key define abow
    var save = function () {
        if (localStorage) {

            var images = collectImages();
            var imageNames = [];
            for (var i in images) {
                localStorage.setItem(
                storeKey + flowID + ":image:" + images[i].name, JSON.stringify(images[i]).lzw() );
                imageNames[imageNames.length] = images[i].name;
            }

            localStorage.setItem(storeKey + flowID, JSON.stringify({
                notes: collectNotes(),
                title: $("#top").text(),
                images: imageNames
            }).lzw() );
        }
    }

    // Loads and draws the notes, key defined abow
    var load = function () {
        if (localStorage) {
            data = JSON.parse(localStorage.getItem(storeKey + flowID).LZW());

            if (data) {
                if (data.title) $("#top").text(data.title);
                var i, n, img;

                var notes = data.notes;
                for (n in notes) {
                    var newNote = $("article.note.new").clone();
                    newNote.removeClass("new");
                    newNote.draggable(Note);
                    setupColors(newNote.children(".colors"));

                    newNote.css({
                        backgroundColor: notes[n].meta.backgroundColor,
                        top: notes[n].meta.position.top + "px",
                        left: notes[n].meta.position.left + "px",
                        zIndex: notes[n].meta.zIndex
                    });

                    newNote.prependTo("section");
                    newNote.data("edited", notes[n].meta.edited);

                    newNote.children("p").empty().text(notes[n].note);
                    newNote.children("footer").empty().text(notes[n].info);
                    newNote.data({
                        created: notes[n].meta.created,
                        updated: notes[n].meta.updated
                    })

                    newNote.nudge();
                }

                var images = data.images;
                for (i in images) {
                    image = JSON.parse(localStorage.getItem(storeKey + flowID + ":image:" + images[i]).LZW());
                    img = addImage(image.src, image.name);
                    img.css({
                        top: image.position.top + "px",
                        left: image.position.left + "px",
                        width: image.position.width + "px",
                        height: image.position.height,
                        zIndex: image.zIndex
                    });
                    img.data("name", images[i].name);
                }

            }
        } else alert("Local storage support missing.");
    }

    /* Enhansers */

    $("article.note.new").css({
        boxShadow: shadow,
        transform: "rotate(2.5deg)",
        top: "-65px",
        left: "-1px",
        position: "absolute"
    });

    $("#top, #bottom").css({
        boxShadow: "0 1px 0 rgba(255,255,255,.2), 0 0 1em rgba(0,0,0,.3) inset",
        borderRadius: "4px"
    });


    $("article.note").draggable(Note);


    // Get the supplied flow ID or generate one
    var flowID = (hasID) ? document.location.hash.substr(2) : newID();

    /* Setup URL */
    if (!hasID) document.location.hash = "#!" + flowID;

    /* Buttons and Behavior*/
    $("#top").dblclick(function () {
        focusing($(this));
    });

    $("#top").blur(function () {
        bluring($(this));
        save();
    });

    $("article.note header, article.note p").live("dblclick", function () {
        focusing($(this));
    });

    $("article.note header, article.note p").live("blur", function () {
        bluring($(this));
        $(this).parents("article.note").data("updated", "{date} {time}".prep(getTime()));
        var info = "created: " + $(this).parents("article.note").data("created") + " - " + "updated: " + $(this).parents("article.note").data("updated");
        $(this).siblings("footer").text(info);
        save();
    });
    $("article.note header, article.note p, #top").live("keydown", function (event) {
        if (event.which == 13) {
            event.preventDefault();
            $(this).blur();
        }
    });

    $("article.note .color ul li").live("click", function () {
        $(this).parents(".note").css("background", $(this).css("background"));
        save();
    });

    $(".del").live("click", function () {
        if (!$(this).parents("article").data("edited")) {
            $(this).parents("article").remove();
        } else {
            if (confirm("For real real?")) {
                localStorage.removeItem(storeKey + flowID + ":image:" + $(this).parents("article").data("name"));

                $(this).parents("article").remove();
                save();
            }
        }
    });

    /* Drag & Drop functionality */

    var droped = function (e) {
        e.preventDefault();
        var files = e.dataTransfer.files;
        for (var i in files) {
            // Check that it's a image and not more than 500k
            if (typeof files[i] == "object" && files[i].type.indexOf("image") > -1 && files[i].size < (1024 * 500)) {
                reader = new FileReader();
                reader.index = i;
                reader.file = files[i];
                reader.onload = function (evt) {
                	var tempImg = new Image();
                	tempImg.onload = function(){
	                    var img = addImage("url(" +this.src + ")", evt.target.file.name || evt.target.file.filename);
	                    img.css({ height: this.height, width: this.width });
	                    img.animate({
	                        duration: 500,
	                        top: "100px",
	                        left: "150px"
	                    });
               		}
               		tempImg.src = evt.target.result;
                }
                reader.readAsDataURL(files[i]);
            }
        }
        //Prevent loading the image as per default
        return false
    }

    // Prevent bubbeling and default behavior (loading the image in the browser)
    var listen = function (e) {
        e.preventDefault();
        return false;
    }

    //Add the event listner to the document
    document.addEventListener("drop", droped, true);
    $(document).bind('dragenter', listen).bind('dragover', listen).bind('dragleave', listen);


    // Sets some css and animation lazy
    //	$(".del").css({ borderRadius: "28px" });
    //	$("#tools .tab span").css({ transform: "rotate(-90deg)", borderRadius: "4px" });
    //	$("#tools").animate({ duration: 1500, left: "-12.5%" });
    //	$("body").css({ boxShadow: "0 0 10em rgba(0,0,0,.5) inset" });
    /* UI stuff */
    //	$("#tools .tab").toggle(
    //	    function(){ $("#tools").animate({duration: 300,  left: "-1px"   }); },    
    //	    function(){ $("#tools").animate({duration: 1500, left: "-12.5%" }); }
    //	);

    /* Load saved data*/
    load();
});