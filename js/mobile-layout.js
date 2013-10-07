$(document).ready(function() {
	console.log("trailhead.js");


// Global Variables? 
//-----------------------------------//

	var match = window.matchMedia("screen and (max-width: 600px)");
	console.log(match.media); // Should be "screen and (max-width:600px)"

	// matchMedia returns an object
	// Two Methods can be used on the object: addListener and removeListener
	// Each allow you to interact with state changes. 

	var $nav = document.getElementsByClassName("title-row");

// UI Events & Event Handlers 
// ----------------------------------//

	match.addListener(mobileLayout);

// Functions and such
// ----------------------------------//

	function mobileLayout(match) {
		if (match.media == "screen and (max-width: 600px)") {
			triggerSlideMenu;
			moveNavToTop;
			createActiveTrailDiv;
		};

	//  Update this to reflect appropriate classes handling styling changes
	function triggerSlideMenu() {
		var $body = document.body,
		$hamburger = $body.getElementsByClassName("hamburger")[0];
		if (typeof $hamburger !== 'undefined' {
			$hamburger.addEventListener('click', function() {
				//  simply givin the entire page a class when the menu is active, then change its style with CSS
				$body.className = ( $body.className == 'menu-active')? '' : 'menu-active';
			});
		});
	};

	function moveNavToTop() {
		$nav.appendTo(".trailMapContainer");
	};

	function createActiveTrailDiv() {
		
	};



	 // not sure the hamburger button is ever undefined. Should it be?
	 // not sure I need to point to zero index of array, since there is only one hamburger button.
	 // It seems like TypeOf is required so you don't break the app when Hamburger is undefined. Maybe leave it for now.
	 // Seems like the play here is to change what we test. how about whether or not is visible?
