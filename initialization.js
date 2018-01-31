/*
A bug is caused by atom indices changing


bonds
residues
info on wall
labeller tool, pointer?
if two things are overlapping you pick up closer
All the tools!
Could make the beginnings of a bar chart.
Lots of shit in server to test
The various things that are being compiled more than once



1) choose a tool to move the atoms - and move them
3) display intermediate atoms???
4) display inter-atomic contacts

Left and right on stick = contour, up and down is for currently selected menu?

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

	var thingsToBeUpdated = [];
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

	initScaleStick(thingsToBeUpdated);

	initStats();
	
	var debuggingWithoutVR = false;
	assemblage.scale.setScalar( debuggingWithoutVR ? 0.002 : 0.02 ); //0.045, 0.028 is nice, 0.01 fits on screen
	getAngstrom = function()
	{
		return assemblage.scale.x;
	}
	assemblage.position.z = -FOCALPOINT_DISTANCE;
	scene.add(assemblage);

	var visiBox = initVisiBox(thingsToBeUpdated,holdables, getAngstrom() * debuggingWithoutVR?0.06:0.5, maps);

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
		var toolSpacing = 0.15;
		var numTools = 4;

		initPointer(thingsToBeUpdated, holdables).position.set( toolSpacing * (-numTools/2+1),-0.4,-0.2);
		initMutator(thingsToBeUpdated, holdables).position.set( toolSpacing * (-numTools/2+2),-0.4,-0.2);
		initAtomDeleter(thingsToBeUpdated, holdables, socket, models).position.set( toolSpacing * (-numTools/2+3),-0.4,-0.2);
		//it's broken initResidueDeleter(thingsToBeUpdated, holdables, socket, models).position.set( toolSpacing * (-numTools/2+4),-0.4,-0.2);
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
		// makeModelFromCootString( msg.modelDataString, thingsToBeUpdated, visiBox.planes );

		new THREE.FileLoader().load( "data/newData.txt",
			function( modelStringCoot )
			{
				var newModel = makeModelFromCootString( modelStringCoot, thingsToBeUpdated, visiBox.planes );
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
			},
			function ( xhr ) {},
			function ( xhr ) { console.error( "couldn't load basic model" ); }
		);

		initTools();
	}
	socket.commandReactions["map"] = function(msg)
	{
		var newMap = Map(msg["mapFilename"], false, visiBox);
		maps.push(newMap);
		assemblage.add(newMap)
	}
	socket.commandReactions["loadStandardStuff"] = function(msg)
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
				var newModel = makeModelFromCootString( modelStringCoot, thingsToBeUpdated, visiBox.planes );
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

				var duplicateModel = makeModelFromCootString( modelStringCoot, thingsToBeUpdated, visiBox.planes );
				assemblage.add(duplicateModel);
				for(var i = 0, il = duplicateModel.atoms.length; i < il; i++)
				{
					duplicateModel.atoms[i].imol++;
				}
				duplicateModel.imol = duplicateModel.atoms[0].imol;
				duplicateModel.position.set(0,2,0);
				models.push(duplicateModel);

				initTools();
			},
			function ( xhr ) {},
			function ( xhr ) { console.error( "couldn't load basic model" ); }
		);

		// var newMap = Map("data/1mru_diff.map", true, visiBox);
		var newMap = Map("data/1mru.map", false, visiBox)
		maps.push( newMap );
		assemblage.add( newMap )
		var diffMap = Map("data/1mru_diff.map", true, visiBox)
		maps.push( diffMap );
		assemblage.add( diffMap )
	}
	launcher.initComplete = true;
	launcher.attemptLaunch();
})();