/*
TODO before newbattle, July 1st
	Bridges resub, 30th
	Change to simpleHttpServer so you can have communication done in a thread. Sigh. Import thread
	Grabbing two ends of a chain
	Make an email to send to everyone. Advize not to actually use coot
	You want a reset button.
	Recontouring should be clever
	Get some data from Paul
	Octree selection?
	Add terminal residue
	"Carbon alpha mode", often used when zoomed out: graphics_to_ca_representation, get_bonds_representation
	Abstract target: do the whole coot tutorial, and the EM one too
	Force restraints
		Ok so when I thought it out I realized it was maybe bad
			You make the movement, but then you're "holding the things in place"
		What instead?
			Currently I take the central atom and pull it
			Possibly humans only think in single vectors, hence center

	
	Get new shampoo
	Maryam Mirzakhani
	Dogs
	Book 7Osme things
	Get stuff from Diego
	Non-vr head movement sensetivity demo
	Backbone-drawing yay
	Get that structure Paul suggested
	Ramachandran diagrams

	if async working, try moving and deleting atoms
		Make some non-VR dummy camera movement
	bug with some residues highlighting many residues?

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
	
	assemblage.scale.setScalar( 0.028 ); //0.045, 0.028 is nice, 0.01 fits on screen
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
			// initPointer(),
			initAtomLabeller(),
			initMutator(),
			// initAtomDeleter(),
			// initEnvironmentDistance(),
			// initResidueDeleter(),
			// initAutoRotamer()
			// initRefiner()
			initRigidBodyMover()
		);

		//maybe these things could be on a desk? Easier to pick up?

		var toolSpacing = 0.15;
		for(var i = 0; i < thingsToSpaceOut.length; i++)
		{
			thingsToSpaceOut[i].position.set( toolSpacing * (-thingsToSpaceOut.length/2+i),-0.4,-0.16);
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
				if( msg.mapFilename === "data/emd_3908.map")
				{
					var newMap = Map( req.response, false, visiBox, 7.87 );
				}
				else
				{
					var newMap = Map( req.response, false, visiBox );
				}
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