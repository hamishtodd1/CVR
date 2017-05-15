function mobileInitialize()
{
	var renderRequirementsObject = {
		initialized: false,
		socketOpened: false
	};
	
	//initializing cursor
	{
		var coneHeight = 0.1;
		var coneRadius = coneHeight * 0.4;
		var cursorGeometry = new THREE.ConeGeometry(coneRadius, coneHeight,31);
		cursorGeometry.computeFaceNormals();
		cursorGeometry.computeVertexNormals();
		cursorGeometry.merge( new THREE.CylinderGeometry(coneRadius / 4, coneRadius / 4, coneHeight / 2, 31 ), (new THREE.Matrix4()).makeTranslation(0, -coneHeight/2, 0) );
		cursorGeometry.applyMatrix( (new THREE.Matrix4()).makeTranslation(0, -coneHeight / 2, 0) );
		cursorGeometry.applyMatrix( (new THREE.Matrix4()).makeRotationZ(TAU/8) );
		var cursor = new THREE.Mesh(
				cursorGeometry, 
				new THREE.MeshPhongMaterial({color:0x888888, side: THREE.DoubleSide })
		);
		
		cursor.grabbing = false;
		
		cursor.followers = [];
		cursor.oldWorldPosition = new THREE.Vector3();
		//if bugs appear that can be addressed with synchronous updating, you will probably notice them!
	}
	
	var mapsAndModels = initMapsAndModels();
	var maps = mapsAndModels.ma;
	var models = mapsAndModels.mo;
	
	var socket = initSocket( renderRequirementsObject, cursor, models, maps);
	
	//Standard
	{
		Renderer = new THREE.WebGLRenderer({ antialias: true });
		Renderer.setClearColor( 0x000000 );
		Renderer.setPixelRatio( window.devicePixelRatio ); //oh. Huh.
		Renderer.setSize( window.innerWidth, window.innerHeight );
		Renderer.sortObjects = false;
		Renderer.shadowMap.cullFace = THREE.CullFaceBack;
		document.body.appendChild( Renderer.domElement );
		
		var verticalFov = 70;
		var nearestPointToBeSeenInStereo;
		
		camera = new THREE.PerspectiveCamera( 70,
				Renderer.domElement.width / Renderer.domElement.height, //window.innerWidth / window.innerHeight,
				0.001, 700);
		
		scene.add( camera );
		camera.add(cursor);
		scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
		
		ourOrientationControls = new THREE.DeviceOrientationControls(camera);
		
		ourStereoEffect = new THREE.StereoEffect( Renderer );
		ourStereoEffect.stereoCamera.eyeSep = 0.02; //very small, gotten through guessing.
		
		//this is for the fairphone in the daydream, and would need to be changed with eyeSep
//		ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] = 0.442;
		
		makeStandardScene(false);
	}

	renderRequirementsObject.initialized = true;
	if(renderRequirementsObject.socketOpened)
		mainLoop( socket, cursor, models, maps );
}