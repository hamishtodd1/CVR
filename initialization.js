/*
Deal with the solid mesh problem and that kinda deals with the clipping planes bug

expenses
train tickets
ketopine

TODO for EM demo
	interatomic contacts
	ramachandran
	solid mesh

Lots of shit in server to test/implement
mutator
Try just having "rigid" atom movement. THEN think about other tools. Refine is most important
if two things are overlapping you pick up closer. Or glow for hover
"undo"
	Just coot undo, then get the result?
	Button on controller reserved
	Flash or something

All tools that move atoms: Could make it so 
	you can grab an atom or two anywhere, 
	move it, 
	it decides what tool would suit the current movement and shows you the "ghost"

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

	var launcher = {
		socketOpened: false,
		initComplete:false,
		attemptLaunch: function()
		{
			for(var condition in this)
			{
				if( !this[condition] )
				{
					return;
				}
			}
			
			document.body.appendChild( renderer.domElement );
			render();
		}
	}
	//TODO: async await for the various things. There was also different stuff here previously

	var renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	// renderer.localClippingEnabled = true; //necessary if it's done in a shader you write?
	renderer.vr.enabled = true;
	document.body.appendChild( renderer.domElement );

	var vrButton = WEBVR.createButton( renderer );
	document.addEventListener( 'keydown', function(event)
	{
		if(event.keyCode === 69 ) //e, because that's what it usually is
		{
			vrButton.onclick();
		}
	}, false );
	document.body.appendChild( vrButton );

	var loopCallString = getStandardFunctionCallString(loop);
	function render() {

		eval(loopCallString);
		renderer.render( scene, camera );

	}
	renderer.animate( render );

	var maps = [];
	var atoms = null; //because fixed length
	
	controllers = Array(2);
	var vrInputSystem = initControllers(controllers);
	
	var debuggingWithoutVR = false;
	assemblage.scale.setScalar( debuggingWithoutVR ? 0.002 : 0.02 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return assemblage.scale.x;
	}
	assemblage.position.z = -FOCALPOINT_DISTANCE;
	scene.add(assemblage);

	var visiBox = initVisiBox(getAngstrom() * debuggingWithoutVR?0.06:0.5, maps);

	scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
	
	window.addEventListener( 'resize', function(){ //doesn't work if in VR
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	makeScene(true);

	initScaleStick();
	initStats();
	
	//---------------"init part 2"
	function initTools()
	{
		var thingsToSpaceOut = [];

		thingsToSpaceOut.push( 
			initPointer(),
			initMutator(),
			initAtomDeleter(socket, models),
			initResidueDeleter(socket, models),
			initAtomLabeller(models),
			initAutoRotamer(socket, models)
		);

		var toolSpacing = 0.15;
		for(var i = 0; i < thingsToSpaceOut.length; i++)
		{
			thingsToSpaceOut[i].position.set( toolSpacing * (-thingsToSpaceOut.length/2+i),-0.4,-0.2);
		}
	}

	socket = initSocket();
	models = initModelCreationSystem(socket, visiBox.planes);

	socket.onopen = function()
	{
		launcher.socketOpened = true;
		launcher.attemptLaunch();
	}
	socket.commandReactions["model"] = function(msg)
	{
		console.log("hm")
		makeModelFromCootString( msg.modelDataString, visiBox.planes );

		initTools();
	}
	socket.commandReactions["map"] = function(msg)
	{
		var newMap = Map(msg["mapFilename"], false, visiBox);
		maps.push(newMap);
		assemblage.add(newMap)
	}
	socket.commandReactions["loadTutorialModel"] = function(msg)
	{
		new THREE.FileLoader().load( "data/tutorialGbr.txt",
			function( modelStringCoot )
			{
				makeModelFromCootString( modelStringCoot, visiBox.planes );

				initTools();
			}
		);
	}
	launcher.initComplete = true;
	launcher.attemptLaunch();
})();