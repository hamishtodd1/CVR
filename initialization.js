/*
notify coot of atom movements
TODO for EM demo
	accepting mtz
	visualize the person's head in the coot window and vice versa
	refinement
	ramachandran
	fucking surfaces

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
Meet mathematics dude
Further pips paperwork
Poland travel
Go to Newbattle
Figure out newbattle topics
expenses
train tickets
Sysmic
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
	// renderer.localClippingEnabled = true; //necessary if it's done in a shader you write?
	renderer.vr.enabled = true;
	document.body.appendChild( renderer.domElement );

	var vrButton = WEBVR.createButton( renderer );
	document.addEventListener( 'keydown', function(event)
	{
		if(event.keyCode === 69 ) //e
		{
			vrButton.onclick();
		}
	}, false );
	document.body.appendChild( vrButton );

	var loopCallString = getStandardFunctionCallString(loop);
	function render()
	{
		eval(loopCallString);
		renderer.render( scene, camera );
	}
	renderer.animate( render );

	var maps = [];
	var atoms = null; //because fixed length
	
	controllers = Array(2);
	var vrInputSystem = initControllers(controllers);
	
	var debuggingWithoutVR = false;
	assemblage.scale.setScalar( debuggingWithoutVR ? 0.02 : 0.02 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return assemblage.scale.x;
	}
	assemblage.position.z = -FOCALPOINT_DISTANCE;
	scene.add(assemblage);

	var visiBox = initVisiBox(getAngstrom() * debuggingWithoutVR?0.06:0.5, maps);
	for(var i = 0; i < visiBox.children.length; i++)
	{
		visiBox.children[i].visible = false;
	}

	scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
	
	window.addEventListener( 'resize', function(){ //doesn't work if in VR
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	initSurroundings(true);
	initScaleStick();
	initStats();
	
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
		render();
	}
})();