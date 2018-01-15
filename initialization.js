/*
1) choose a tool to move the atoms - and move them
3) display intermediate atoms???
4) display inter-atomic contacts

[
	{ "keys": ["ctrl+shift+s"], "command": "save_all" },
	{ "keys": ["ctrl+alt+s"], "command": "prompt_save_as" },

	{ "keys": ["ctrl+pagedown"], "command": "next_view_in_stack" },
	{ "keys": ["ctrl+pageup"], "command": "prev_view_in_stack" },

	{ "keys": ["ctrl+tab"], "command": "next_view" },
	{ "keys": ["ctrl+shift+tab"], "command": "prev_view" },
]


"undo"
	could make it so that the atom array can only be changed by messages from coot
	for every change, you have a log of the reverse change
	a button on the controller is reserved for "undo"

	At any time you'd like to be able to point at the ramachandran

All tools that move atoms: Could make it so 
	you can grab an atom or two anywhere, 
	move it, 
	it decides what tool would suit the current movement and shows you the "ghost"

Could use a single web worker for contouring and loading file in, interactivity remains.

Thumbstick could also be used for light intensity?

A big concern at some point will be navigating folders

https://drive.google.com/open?id=0BzudLt22BqGRRElMNmVqQjJWS2c webvr build, yes it's a bit old.
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
		dataLoaded:{
			font: false,
			controllerModel0: false,
			controllerModel1: false
		},
		attemptLaunch: function()
		{
			for(var data in this.dataLoaded)
			{
				if( !this.dataLoaded[data] )
				{
					return;
				}
			}
			if(!this.socketOpened )
			{
				return;
			}
			else
			{
				document.body.appendChild( renderer.domElement );
				render();
			}
		}
	}
	//TODO: async await for the various things. There was also different stuff here previously

	var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.localClippingEnabled = true; //necessary if it's done in a shader you write?
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	var thingsToBeUpdated = {};
	thingsToBeUpdated.labels = [];
	var holdables = {};
	
	var ourVrEffect = new THREE.VREffect( 1, renderer ); //0 is initial eye separation
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

	//scaleStick. Need a clipping plane
	initScaleStick(thingsToBeUpdated);
	
	//rename when it's more than model and map. "the workspace" or something
	modelAndMap = new THREE.Object3D();
	var debuggingWithoutVR = true;
	modelAndMap.scale.setScalar( debuggingWithoutVR ? 0.002 : 0.06 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return modelAndMap.scale.x;
	}
	modelAndMap.position.z = -FOCALPOINT_DISTANCE;
	scene.add(modelAndMap);

	var visiBox = initVisiBox(thingsToBeUpdated,holdables, getAngstrom() * debuggingWithoutVR?0.06:7);
	
	new THREE.FontLoader().load( "data/gentilis.js", function ( gentilis )
		{
			THREE.defaultFont = gentilis;
			
			launcher.dataLoaded.font = true;
			launcher.attemptLaunch();
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load font" ); }
	);
	
	scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
	
	window.addEventListener( 'resize', function(){
		console.log("resizing")
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
		
		thingsToBeUpdated.blinker = blinker;
	}

	//TODO local
	function initTools()
	{
		initPointer(thingsToBeUpdated, holdables);
		initMutator(thingsToBeUpdated, holdables, modelAndMap.model.atoms);
		initAtomDeleter(thingsToBeUpdated, holdables, modelAndMap.model.atoms, socket);
	}
	socket = initSocket();
	socket.onopen = function()
	{
		launcher.socketOpened = true;
		launcher.attemptLaunch();
	}
	socket.messageReactions["model"] = function(msg)
	{
		makeModelFromCootString( msg.modelDataString, thingsToBeUpdated, visiBox.planes );

		modelAndMap.map = Map("data/1mru.map", false, visiBox);
		modelAndMap.add(modelAndMap.map)

		initTools();
	}
	socket.messageReactions["loadStandardStuff"] = function(msg)
	{
		/*
		 * tutModelWithLigand
		 * ribosome.txt
		 * oneAtomOneBond.txt
		 * 3C0.lst
		 */
		new THREE.FileLoader().load( "data/newData.txt",
			function( modelStringCoot )
			{
				makeModelFromCootString( modelStringCoot, thingsToBeUpdated, visiBox.planes );
				initTools();
			},
			function ( xhr ) {},
			function ( xhr ) { console.error( "couldn't load basic model" ); }
		);

		// modelAndMap.map = Map("data/1mru.map", false, visiBox.planes);
		// modelAndMap.add(modelAndMap.map)

		//hmm so we need the thingy
	}
})();