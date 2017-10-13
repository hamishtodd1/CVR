function desktopInitialize()
{
	var labels = [];
	var tools = [];
	
	var launcher = {
		socketOpened: false,
		fontLoaded: false,
		attemptLaunch: function()
		{
			/*
			 * tutModelWithLigand
			 * 
			 * ribosome.txt
			 * oneAtomOneBond.txt
			 * 3C0.lst
			 */
			
			if(!this.socketOpened || !this.fontLoaded)
				return;
			else
			{
				//rename when it's more than model and map. "the workspace" or something
				modelAndMap = new THREE.Object3D();
				modelAndMap.scale.setScalar(0.01); //angstrom
				modelAndMap.position.z = -FOCALPOINT_DISTANCE;
				scene.add(modelAndMap);
				
				getAngstrom = function()
				{
					return modelAndMap.scale.x;
				}
				
				initMutator(tools);
//				initAtomDeleter(tools);
				
				loadModel("data/tutModelWithLigand.txt", labels);
				loadMap("data/try-2-map-fragment.tab.txt");
				
				desktopLoop( socket, controllers, VRInputSystem, labels, tools );
			}
		}
	}
	
	new THREE.FontLoader().load( "data/gentilis.js", 
		function ( gentilis ) {
			THREE.defaultFont = gentilis;
			
			launcher.fontLoaded = true;
			launcher.attemptLaunch();
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load font" ); }
	);
	
	scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
	
	ourVREffect = new THREE.VREffect( renderer );
	
	var controllers = Array(2);
	var VRInputSystem = initVRInputSystem(controllers);
	handSeparation = controllers[0].position.distanceTo( controllers[1].position );
	oldHandSeparation = handSeparation;
	
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
			VRInputSystem.startGettingInput();
			ourVREffect.setFullScreen( true );
		}
	}, false );
	
	makeStandardScene(true);
	
//	initSphereSelector(cursor);

	//socket crap
	{
		socket = initSocket();
		
		socket.onopen = function( )
		{
			launcher.socketOpened = true;
			launcher.attemptLaunch();
		}
		
		socket.messageResponses["This is the server"] = function(messageContents)
		{}
		
		socket.messageResponses["mousePosition"] = function(messageContents)
		{}
		
		socket.messageResponses["lmb"] = function(messageContents)
		{}
		
		
		
		//A solution to narrow screens. Works fine but we can't record it!
		//siiiiigh, it would introduce complexity for the user anyway
//		else if( messageContents[0] === "o" && parseInt( messageContents[1] ) )
//		{
//			ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8] -= 0.01;
//			ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] += 0.01;
//			console.log(ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8])
//			console.log(ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8])
//		}
//		else if( messageContents[0] === "l" && parseInt( messageContents[1] ) )
//		{
//			ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8] += 0.01;
//			ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] -= 0.01;
//			console.log(ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8])
//			console.log(ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8])
//		}
	}
}