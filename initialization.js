/*
expenses

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



All tools that move atoms: Could make it so 
	you can grab an atom or two anywhere, 
	move it, 
	it decides what tool would suit the current movement and shows you the "ghost"

Thumbstick could also be used for light intensity?

A big concern at some point will be navigating folders


*/




(function init()
{
	if(!WEBVR || !WEBVR.isAvailable())
	{
		console.error("No webvr!")
		return;
	}

	var launcher = {
		socketOpened: false,
		initComplete:false,
		controllerModel0Loaded: false,
		controllerModel1Loaded: false,
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

	var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.localClippingEnabled = true; //necessary if it's done in a shader you write?
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	var maps = [];
	var atoms = null; //because fixed length

	var holdables = [];

	var ourVrEffect = new THREE.VREffect( 1, renderer );
	var loopCallString = getStandardFunctionCallString(loop);
	function render()
	{
		eval(loopCallString);

		ourVrEffect.requestAnimationFrame( function(){
			ourVrEffect.render( scene, camera );
			render();
		} );
	}
	
	controllers = Array(2);
	var vrInputSystem = initVrInputSystem(controllers, launcher, renderer, ourVrEffect);

	initScaleStick();

	initStats();
	
	var debuggingWithoutVR = false;
	assemblage.scale.setScalar( debuggingWithoutVR ? 0.002 : 0.02 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return assemblage.scale.x;
	}
	assemblage.position.z = -FOCALPOINT_DISTANCE;
	scene.add(assemblage);

	var visiBox = initVisiBox(holdables, getAngstrom() * debuggingWithoutVR?0.06:0.5, maps);

	scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
	
	window.addEventListener( 'resize', function(){
	    renderer.setSize( window.innerWidth, window.innerHeight ); //nothing about vr effect?
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	document.addEventListener( 'keydown', function(event)
	{
		if(event.keyCode === 190 && ( navigator.getVRDisplays !== undefined || navigator.getVRDevices !== undefined ) )
		{
			event.preventDefault();
			vrInputSystem.startGettingInput();
			ourVrEffect.setFullScreen( true );
		}
	}, false );
	
	makeScene(true);
	
	{
		var blinker = new THREE.Mesh(new THREE.PlaneBufferGeometry(10,10),new THREE.MeshBasicMaterial({color:0x000000, transparent:true, opacity:0}))
		blinker.blinkProgress = 1;
		camera.add(blinker);
		
		document.addEventListener( 'keydown', function(event)
		{
			if(event.keyCode === 13 )
			{
				blinker.blinkProgress = -1;
			}
		}, false );
		
		blinker.update = function()
		{
			var oldBlinkProgress = blinker.blinkProgress;
			
			blinker.blinkProgress += frameDelta * 7;
			blinker.material.opacity = 1-Math.abs(this.blinkProgress);
			blinker.position.z = -camera.near - 0.00001;
			
			if( oldBlinkProgress < 0 && this.blinkProgress > 0)
			{
				ourVrEffect.toggleEyeSeparation();
				if( visiBox.position.distanceTo(camera.position) < camera.near )
				{
					visiBox.position.setLength(camera.near * 1.1);
				}
			}
		}
		
		thingsToBeUpdated.push( blinker );
	}
	
	//---------------"init part 2"
	function initTools()
	{
		var thingsToSpaceOut = [];

		thingsToSpaceOut.push( 
			initPointer(holdables),
			initMutator(holdables),
			initAtomDeleter(holdables, socket, models),
			initResidueDeleter(holdables, socket, models),
			initAtomLabeller(holdables, models)
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
		// makeModelFromCootString( msg.modelDataString, visiBox.planes );

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
				var newModel = makeModelFromCootString( modelStringCoot, visiBox.planes );
				newModel.imol = newModel.atoms[0].imol;
				assemblage.add(newModel);
				models.push(newModel);

				var averagePosition = new THREE.Vector3();
				for(var i = 0, il = newModel.atoms.length; i < il; i++)
				{
					averagePosition.add(newModel.atoms[i].position);
				}
				averagePosition.multiplyScalar( 1 / newModel.atoms.length);
				assemblage.position.sub( averagePosition.multiplyScalar(getAngstrom()) );

				initTools();
			}
		);
	}
	launcher.initComplete = true;
	launcher.attemptLaunch();
})();