/*
notify coot of atom movements
TODO before newbattle
	expenses
	Maryam Mirzakhani
	Dogs
	Sysmic finalize
	Newbattle shit - further pips paperwork, resend to Caroline
	Book 7Osme things
	Poland travel
	Get stuff from Diego
	ramachandran?
	Non-vr head movement sensetivity demo

TODO for EM demo
	look for bugs generally, do lots of stuff consecutively
	Make sure it works on your laptop
		Pull in vm
		Try with everything plugged in on desk

	With Paul:
		Intermediate updates only seem to come after some event that is indicated in the console
		if async working, try moving and deleting atoms
			Make some non-VR dummy camera movement
		Can my text be a special color?
		look at the encoding on those maps!
		I would like to get these surface things in
		Still got -1 for an imol in refinement??
		I only *appear* to get the one refinement update?
		bug with some residues highlighting many residues?
		Talk about force restraints
			Ok so when I thought it out I realized it was maybe bad
				You make the movement, but then you're "holding the things in place"
			What instead?
				Currently I take the central atom and pull it
				Possibly humans only think in single vectors, hence center
				This is interesting

	Sick bags
	Gel insoles?
	Plastic sheet on floor?

transfer the map

mutator
"undo"
	Just coot undo, then get the result? Full refresh
	Button on controller reserved
	Flash or something

Maya
	Admin
	reddit/bluecollarwomen
	http://www.nts.org.uk/wildlifesurvey/
	http://www.wildlifeinformation.co.uk/about_volunteering.php
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
	
	assemblage.scale.setScalar( 0.02 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return assemblage.scale.x;
	}
	assemblage.position.z = -FOCALPOINT_DISTANCE;
	assemblage.position.y = -0.11;
	scene.add(assemblage);

	var visiBox = initVisiBox(0.45, maps);
	visiBox.position.copy(assemblage.position)
	scene.add(visiBox)

	scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
	
	window.addEventListener( 'resize', function(){ //doesn't work if in VR
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	initSurroundings(true);
	initScaleStick();
	initStats(visiBox.position);
	// initMenus();
	// initSpecatorRepresentation();
	
	//---------------"init part 2"
	function initTools()
	{
		var thingsToSpaceOut = [];

		thingsToSpaceOut.push( 
			initPointer(),
			// initMutator(),
			initAtomLabeller(),
			initAtomDeleter(),
			initResidueDeleter(),
			initAutoRotamer(),
			initRefiner(),
			initRigidBodyMover(),
			initEnvironmentDistance()
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
		//does it need to be in a string? environment distances didn't need to be
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
	socket.commandReactions["mapFilename"] = function(msg)
	{
		var req = new XMLHttpRequest();
		req.open('GET', msg.mapFilename, true);
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
	socket.commandReactions["loadTutorialModel"] = function(msg)
	{
		new THREE.FileLoader().load( "data/tutorialGbr.txt",
			function( modelDataString )
			{
				makeModelFromCootString( modelDataString, visiBox.planes );

				initTools();
			}
		);
	}
	socket.onopen = function()
	{
		//hmm there was "animate" above, do you need this?
		render();
	}
})();