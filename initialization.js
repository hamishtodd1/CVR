/*
notify coot of atom movements
TODO for EM demo
	Thing for Paul FFS!
	accepting mtz
	refinement
	ramachandran? There's a lot already set up
	Head movement monitoring demo?
	Fucking visibox
	Notify server about movements

make that testing thing for paul
bugs with unfound atoms
bug with some residues highlighting many residues?
mutator
if two things are overlapping you pick up closer. Or glow for hover
"undo"
	Just coot undo, then get the result? Full refresh
	Button on controller reserved
	Flash or something

Thankyou letters
Get stuff from Diego
Tickets to Oxford then back from Stoke on Trent
Book 7Osme things
Sysmic
Further pips paperwork, Resend to Caroline
Meet  head of maths, Go to Newbattle, Figure out newbattle topics
Poland travel
expenses, did you get the one for CCP4EM?
Transfer money to savings account
Maya
	Admin
	reddit/bluecollarwomen
	http://www.nts.org.uk/wildlifesurvey/
	http://www.wildlifeinformation.co.uk/about_volunteering.php

Thumbstick could also be used for light intensity?

A big concern at some point will be navigating folders

*/



(function init()
{
	// if(!WEBVR.checkAvailability())
	// {
	// 	console.error("No webvr!")
	// 	return;
	// }

	var renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.localClippingEnabled = true; //necessary if it's done in a shader you write?
	renderer.sortObjects = false;
	document.body.appendChild( renderer.domElement );

	{
		// renderer.vr.enabled = true;
		// var vrButton = WEBVR.createButton( renderer );
		// document.body.appendChild( vrButton );
	}
	{
		var ourVrEffect = new THREE.VREffect( renderer );
		var loopCallString = getStandardFunctionCallString(loop);
		function render()
		{
			eval(loopCallString);
			ourVrEffect.requestAnimationFrame( function()
			{
				//a reasonable indicator is ourVREffect.isPresenting
				ourVrEffect.render( scene, camera );
				render();
			} );
		}
	}
	controllers = Array(2);
	var vrInputSystem = initVrInputSystem(controllers, renderer,ourVrEffect);

	var maps = [];
	var atoms = null; //because fixed length
	
	assemblage.scale.setScalar( 0.045 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return assemblage.scale.x;
	}
	assemblage.position.z = -FOCALPOINT_DISTANCE;
	scene.add(assemblage);

	var visiBox = initVisiBox(getAngstrom() * 10, maps);
	scene.add(visiBox)

	scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
	
	window.addEventListener( 'resize', function(){ //doesn't work if in VR
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	initSurroundings(true);
	initScaleStick();
	initStats();
	// initSpecatorRepresentation();
	
	//---------------"init part 2"
	function initTools()
	{
		var thingsToSpaceOut = [];

		thingsToSpaceOut.push( 
			initPointer(),
			// initMutator(),
			initAtomLabeller(models),
			initAtomDeleter(socket, models),
			initResidueDeleter(socket, models),
			// initAutoRotamer(socket, models),
			initRigidBodyMover(models),
			initEnvironmentDistance(models)
		);

		//maybe these things could be on a desk? Easier to pick up?

		var toolSpacing = 0.15;
		for(var i = 0; i < thingsToSpaceOut.length; i++)
		{
			thingsToSpaceOut[i].position.set( toolSpacing * (-thingsToSpaceOut.length/2+i),-0.4,-0.2);
		}
	}

	initSocket();
	models = initModelCreationSystem(visiBox.planes);

	socket.commandReactions["model"] = function(msg)
	{
		console.error("does it need to be in a string? environment distances didn't need to be")
		makeModelFromCootString( msg.modelDataString, visiBox.planes );

		initTools();
	}
	socket.commandReactions["map"] = function(msg)
	{
		//you have to convert it into an array buffer :/
		// console.log(msg["dataString"])
		// var newMap = Map( msg["dataString"], false, visiBox );
		// maps.push(newMap);
		// assemblage.add(newMap)
	}
	socket.commandReactions["loadTutorialModel"] = function(msg)
	{
		new THREE.FileLoader().load( "data/tutorialGbr.txt",
			function( modelDataString )
			{
				makeModelFromCootString( modelDataString, visiBox.planes );

				initTools();
			}
		);
		
		var req = new XMLHttpRequest();
		req.open('GET', "data/tutorialMap.map", true);
		req.responseType = 'arraybuffer';
		req.onreadystatechange = function()
		{
			if (req.readyState === 4)
			{
				var newMap = Map( req.response, false, visiBox );
				maps.push(newMap);
				assemblage.add(newMap)
			}
		};
		req.send(null);
	}
	socket.onopen = function()
	{
		//hmm there was "animate" above, do you need this?
		render();
	}
})();