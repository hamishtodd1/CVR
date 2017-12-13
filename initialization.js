/*
Target remains: get coot connection working with "refine"
Going to bring in laptop

"undo"
	could make it so that the atom array can only be changed by messages from coot
	for every change, you have a log of the reverse change
	a button on the controller is reserved for "undo"

All tools that move atoms: Could make it so 
	you can grab an atom or two anywhere, 
	move it, 
	it decides what tool would suit the current movement and shows you the "ghost"

Make a video intro to controls

Could use a single web worker for contouring and loading file in, interactivity remains.

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
				render();
			}
		}
	}

	// var launcher = {
	// 	requirementLevel: 0,
	// 	requirements:[],
	// 	subLaunchers:[],
	// 	attemptLaunchHavingFulfilledRequirement:function(requirement)
	// 	{
	// 		this.requirements[this.requirementLevel][requirement] = true;
	// 		for(var i = 0; i < this.requirements[requirementLevel].length; i++)
	// 		{
	// 			if( !this.requirements[requirementLevel][i] )
	// 			{
	// 				return;
	// 			}
	// 		}
	// 		this.requirementLevel++;
	// 		this.subLaunchers[requirementLevel]();
	// 	}
	// };

	// launcher.subLaunchers[0] = //the rest of this function
	// launcher.subLaunchers[1] = //the rest of this function
	// function()
	// {
	// 	loadModel("data/tutModelWithLigand.txt", thingsToBeUpdated, visiBox.planes);
	// 	initMap("data/try-2-map-fragment.tab.txt", visiBox.planes);
	// }



	var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.localClippingEnabled = true; //necessary if it's done in a shader you write?
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	var thingsToBeUpdated = {};
	thingsToBeUpdated.labels = [];
	var holdables = {};
	
	var visiBox = initVisiBox(thingsToBeUpdated,holdables);
	
	var ourVrEffect = new THREE.VREffect( renderer );
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
	// var scaleStick = new THREE.Mesh(new THREE.CylinderBufferGeometryUncentered(0.01,0.01,1,),new THREE.MeshLambertMaterial({color:0xFF0000}));
	// scaleStick.cylinders = Array()
	
	//rename when it's more than model and map. "the workspace" or something
	modelAndMap = new THREE.Object3D();
	modelAndMap.scale.setScalar( 0.02 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return modelAndMap.scale.x;
	}
	modelAndMap.position.z = -FOCALPOINT_DISTANCE;
	scene.add(modelAndMap);
	
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
	
//	initSphereSelector(cursor);
	
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
	socket = new WebSocket("ws://" + window.location.href.substring(7) + "ws");
	if(!socket)
	{
		console.log("invalid socket");
		return;
	}
	socket.onclose = function()
	{
		console.log("The connection has been closed. Maybe you had no data loaded?");
	}

	function initTools()
	{
		initMutator(thingsToBeUpdated, holdables, modelAndMap.model.atoms);
		initAtomDeleter(thingsToBeUpdated, holdables, modelAndMap.model.atoms, modelAndMap.model.geometry, socket);
	}


	socket.messageReactions = {};
	socket.messageReactions["model"] = function(messageContents)
	{
		makeModelFromCootString( messageContents, thingsToBeUpdated, visiBox.planes );

		initTools();
	}
	socket.messageReactions["loadStandardStuff"] = function(messageContents)
	{
		/*
		 * tutModelWithLigand
		 * ribosome.txt
		 * oneAtomOneBond.txt
		 * 3C0.lst
		 */
		new THREE.FileLoader().load( "data/tutModelWithLigand.txt",
			function( modelStringCoot )
			{
				makeModelFromCootString( modelStringCoot, thingsToBeUpdated, visiBox.planes );
				initTools();
			},
			function ( xhr ) {},
			function ( xhr ) { console.error( "couldn't load basic model" ); }
		);
		initMap("data/try-2-map-fragment.tab.txt", visiBox.planes);
	}
	
	socket.onmessage = function(msg)
	{
		//speedup opportunity no doubt
		var indexOfDelimiter = msg.data.indexOf(":");
		if(indexOfDelimiter === -1)
		{
			console.log("received message without header: ", msg.data)
			return;
		}
		var header = msg.data.substring(0,indexOfDelimiter);
		var messageContents = msg.data.substring( indexOfDelimiter+1);

		if(!socket.messageReactions[header])
		{
			console.error("Mistyped header: ", header)
		}
		else socket.messageReactions[header](messageContents);
	}
	
	socket.onopen = function()
	{
		launcher.socketOpened = true;
		launcher.attemptLaunch();
	}
})();