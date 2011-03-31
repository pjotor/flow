/* Helpers */
String.prototype.prep = function(d){ var s = this; 
for(var i in d) { s = s.replace('{'+i+'}', function($1){ 
	return d[$1.substr(1,$1.length-2)]; }); } return s; }	

$(document).ready(function(){
	/* Vars */
	// From: http://www.instructables.com/id/Easy-Post-It-sticky-note-mosaics-using-free-soft/step13/Post-It-color-hex-values/
	var colors = {
		"Basic" 		: ["#FCF0AD", "#FFFFFF"],
		"Neon" 			: ["#E9E74A","#EE5E9F","#FFDD2A","#F59DB9","#F9A55B"],
		"Ultra" 		: ["#D0E17D","#36A9CE","#EF5AA1","#AE86BC","#FFDF25"],
		"Tropical" 	: ["#56C4E8","#D0E068","#CD9EC0","#ED839D","#FFE476"],
		"Samba" 		: ["#CDDD73","#F35F6D","#FAA457","#35BEB7","#D189B9"],
		"Aquatic" 	: ["#99C7BC","#89B18C","#738FA7","#8A8FA3","#82ACB8"],
		"Sunbrite" 	: ["#F9D6AC","#E9B561","#E89132","#DA7527","#DEAC2F"],
		"Classic " 	: ["#BAB7A9","#BFB4AF","#CDC4C1","#CFB69E","#D0AD87"]
	}
	var shadow = "0 1em 2em rgba(0,0,0,.1)";
	var storeKey = "pjotor.com/time/flow/";
	var hasID = (document.location.hash.substr(2).length != 0);
	
	// Note drag options and cloning functions
	var Note = { 
	 	stack: "article", 
		create: function(){
							var css = $(this).hasClass("new") ?  
							{	boxShadow: shadow, transform: "rotate(2.5deg)", 
								top: "-80px", left: "-1px", position: "absolute" } :
							{	boxShadow: shadow };
							$(this).css(css);
						},
		start: 	function(){
							//The main cloning stuff
							if( $(this).hasClass("new") ) {
								var newNote = $(this).clone();
								newNote.draggable(Note);
								newNote.prependTo("section");
								setupColors( $(this).children(".colors") );
								$(this).children("footer").text( 
									"created: {date} {time} ".prep(getTime())
								);
								$(this).data("created", "{date} {time}".prep(getTime()));
								$(this).removeClass("new");
							}
							$(this).nudge();
					  },  
		stop: 	function(){
							if( $(this).hasClass("new") ) $(this).nudge();
							save();
						}
	}
	
	/* Extentions */
	// Slightly rotates the element with an animation.
	$.fn.nudge = function(){ 
        var rotate = "rotate("+ ( (Math.random()*5)-2.5 ) +"deg)";
        return $(this).each( function(){
        		$(this).animate({ duration: 5e2, transform: rotate });	
        	}	
        )
		}

	/* Utils */
	// Zero padding. Defaiults to 2 chas.
	var z = function(s,p,l){ p=p||"00"; l=l||2; return (p+s).substr(l*-1); }

	// Generate flow ID
	var newID = function(){ 
		var id = Math.floor((Math.random()*1e5)).toString(16);
		while( localStorage.getItem(storeKey + id) != null )
			id = Math.floor((Math.random()*1e5)).toString(16); 
		return id;
	}
		
	// Returns an Object with formatted time strings ( date: "YYYY-MM-DD" && time: "HH:MM").
	var getTime = function() {
		var d = new Date();
		return dateTime = { 
			date: d.getFullYear() + "-" + z( +1 + d.getMonth() ) + "-" + z( d.getDate() ), 
	 		time: z( d.getHours() ) + ":" + z( d.getMinutes() )
	 	}			
	}
	
	// Sets up the color picker (colors defined abow).
	var setupColors = function(parent){
		var selectedColors = [].concat(colors["Basic"]).concat(colors["Neon"]);
		var list = 	$("<ul/>").hover(
			function(){
				if( $(this).parent().width() != (selectedColors.length+1)*20 )
					$(this).parent().stop().animate({ 
						duration: 200, 
						width: ((selectedColors.length+1)*20) + "px" 
					});
			},
			function(){
					$(this).parent().stop().delay(1500).animate({ duration: 200, width: "20px" });
			}				
		);
		for( c in selectedColors ) {
			list.append(
				$("<li/>")
					.css({ background: selectedColors[c] })
					.click(function(){
						$(this).parents(".note").css({ 
							backgroundColor: $(this).css("backgroundColor")
						});
						save();
					})
			);
		}
		list.appendTo(parent);
	};		
	
	// Handles the bluring (helper)
	var bluring = function(ob){
		if( !ob.text().length ) {
			ob.text("Doubble click to edit…"); 
			ob.data("edited", false);
		} else 
			ob.data("edited", true);
			
		ob.attr("contenteditable", false);
	}	
	
	// Focus on dblclick (helper)
	var focusing = function(ob){
		ob.attr("contenteditable", true);
		if( !ob.data("edited") )
			ob.text("");
			
		ob.focus().select();
	}	
	
	/* Save/Load Functions */
	// Returns an Object with the notes (only edited notes (no, colorchange is not an edit))
	var collectNotes = function(){
		var data = [];
		$(".note").each(function(){ 
			if( $(this).children("header, p").data("edited") ) {
				data[data.length] = { 
					title: $(this).children("header").text(), 
					note: $(this).children("p").text(), 
					info: $(this).children("footer").text(), 
					meta: { 
						created: $(this).data("created"), 
						updated: $(this).data("updated"),
						position: $(this).position(), 
						backgroundColor: $(this).css("backgroundColor"), 
						edited: {
							title: $(this).children("header").data("edited"),
							note: $(this).children("p").data("edited")
						}
					}
				} 
			}
		});
		return data;
	}	
	
	// Saves the object (stringified) to local store, key define abow
	var save = function(){
		if(localStorage) 
			localStorage.setItem(storeKey + flowID, JSON.stringify({ 
				notes: collectNotes(), 
				title: $("#top").text()
			}) );
		else 
			alert("Local storage support missing.");
	}
	
	// Loads and draws the notes, key defined abow
	var load = function(){
		if(localStorage) {
			data = JSON.parse(localStorage.getItem(storeKey + flowID));
			
			if( data ) {
				if( data.title ) $("#top").text(data.title);
				var notes = data.notes;
				for( n in notes ) {
						var newNote = $("article.note.new").clone();
						newNote.removeClass("new");
						newNote.draggable(Note);
						setupColors( newNote.children(".colors") );
						
						newNote.css({ 
							backgroundColor: notes[n].meta.backgroundColor,
							top: notes[n].meta.position.top + "px",
							left: notes[n].meta.position.left + "px"
						});
						
						newNote.prependTo("section");						
	
						newNote.children("header").empty()
							.text(notes[n].title)
							.data("edited", notes[n].meta.edited.title);
						newNote.children("p").empty()
							.text(notes[n].note)
							.data("edited", notes[n].meta.edited.note);
						newNote.children("footer").empty()
							.text(notes[n].info);
						newNote.data({ 
							created: notes[n].meta.created, 
							updated: notes[n].meta.updated 
						})	
						
						newNote.nudge();
				}
			}
		} else alert("Local storage support missing.");
	}		

	/* Enhansers */
	// Sets some css and animation lazy
//	$(".del").css({ borderRadius: "28px" });

//	$("#tools .tab span").css({ transform: "rotate(-90deg)", borderRadius: "4px" });
//	$("#tools").animate({ duration: 1500, left: "-12.5%" });

	$("article.note.new").css({	boxShadow: shadow, transform: "rotate(2.5deg)", 
		top: "-65px", left: "-1px", position: "absolute" });
	
	$("#top, #bottom").css({ boxShadow: "0 1px 0 rgba(255,255,255,.2), 0 0 1em rgba(0,0,0,.3) inset", borderRadius: "4px" });
	
//	$("body").css({ boxShadow: "0 0 10em rgba(0,0,0,.5) inset" });
	/* UI stuff */
//	$("#tools .tab").toggle(
//	    function(){ $("#tools").animate({duration: 300,  left: "-1px"   }); },    
//	    function(){ $("#tools").animate({duration: 1500, left: "-12.5%" }); }
//	);
	
	$("article.note").draggable(Note);
	
	
	// Get the supplied flow ID or generate one
	var flowID = ( hasID ) ? document.location.hash.substr(2) : newID();

	/* Setup URL */
	if ( !hasID ) document.location.hash = "#!" + flowID;
	
	/* Buttons and Behavior*/
	$("#top").dblclick(function(){
		focusing($(this));
	});
	
	$("#top").blur(function(){
		bluring($(this));
		save();	
	});
		
	$("article.note header, article.note p").live("dblclick", function(){
		focusing($(this));
	});
	
	$("article.note header, article.note p").live("blur", function(){
		bluring($(this));
		$(this).parents("article.note").data("updated", "{date} {time}".prep(getTime()));
		var info = 	"created: " + $(this).parents("article.note").data("created") +  
				" - " + "updated: " + $(this).parents("article.note").data("updated");
		$(this).siblings("footer").text( info	);
		save();	
	});
	$("article.note header, article.note p, #top").live("keydown", function(event){
		if ( event.which == 13 ){ event.preventDefault(); $(this).blur(); }	
	});

	$("article.note .color ul li").live("click", function(){
		$(this).parents(".note").css( "background", $(this).css("background") );
		save();
	});		

	$(".del").live("click", function(){ 
		if( !$(this).children("header, p").data("edited") ) {
			$(this).parents("article.note").remove();
		} else {
			if ( confirm("For real real?") ) {
				$(this).parents("article.note").remove(); 
				save();
			}
		}
	});

	/* Load saved data*/
	load();
});