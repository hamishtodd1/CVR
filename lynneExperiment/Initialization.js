//the first init
socket.on('OnConnect_Message', function(msg)
{	
	var Renderer = new THREE.WebGLRenderer({ antialias: true }); //antialiasing would be nice and we're only aiming for 30fps
	Renderer.setClearColor( 0xACDFFC );
	Renderer.setPixelRatio( window.devicePixelRatio );
	Renderer.setSize( window.innerWidth, window.innerHeight );
	Renderer.sortObjects = false;
	Renderer.shadowMap.enabled = true;
	Renderer.shadowMap.cullFace = THREE.CullFaceBack;
	document.body.appendChild( Renderer.domElement );
	window.addEventListener( 'resize', function(){
		console.log("resizing")
	    Renderer.setSize( window.innerWidth, window.innerHeight );
	    Camera.aspect = window.innerWidth / window.innerHeight;
	    Camera.updateProjectionMatrix();
	}, false );
	
	Scene = new THREE.Scene();
	
	//FOV should depend on whether you're talking VR
	Camera = new THREE.PerspectiveCamera( 50, //will be changed by VR
			Renderer.domElement.width / Renderer.domElement.height, //window.innerWidth / window.innerHeight,
			0.001, 700);
	spectatorScreenIndicator = new THREE.Line(new THREE.Geometry());
	for(var i = 0; i < 4; i++)
		spectatorScreenIndicator.geometry.vertices.push(new THREE.Vector3());
	spectatorScreenIndicator.visible = true;
	Camera.add( spectatorScreenIndicator );
	Scene.add(Camera);
	
	VRMODE = 0;
	OurVREffect = new THREE.VREffect( Renderer );
	OurVRControls = new THREE.VRControls( Camera );
	
	var audioListener = new THREE.AudioListener();
	
	Add_stuff_from_demo();
	
	new THREE.FontLoader().load(  "gentilis.js", 
		function ( reponse ) { gentilis = reponse; },
		function ( xhr ) {},
		function ( xhr ) { console.error( "couldn't load font" ); }
	);
	
	var controllers = Array(2);
	for(var i = 0; i < 2; i++)
	{
		controllers[ i ] = new THREE.Object3D();
		controllers[ i ].Gripping = 0;
		controllers[ i ].heldBond = -1;
		Scene.add( controllers[ i ] );
	}
	var handModelLink = "Data/glove.obj"
	if ( WEBVR.isAvailable() === true ) //Hah and when all browsers have VR?
	{
		//actually people might want to spectate in google cardboard
		//you just need to move the hands to be in the right position relative to wherever they're looking
		document.body.appendChild( WEBVR.getButton( OurVREffect ) );
		spectatorScreenIndicator.visible = true;
		spectatorScreenIndicator.frustumCulled = false;
		handModelLink = "Data/external_controller01_left.obj"
	}
	new THREE.OBJLoader().load( handModelLink,
		function ( object ) 
		{
			object.children[0].geometry.applyMatrix( new THREE.Matrix4().makeRotationAxis(xAxis,0.5) );
			object.children[0].geometry.applyMatrix( new THREE.Matrix4().makeTranslation(0.002,0.036,-0.039) );
			object.children[0].geometry.applyMatrix( new THREE.Matrix4().makeScale(0.76,0.76,0.76) );
		
			controllers[ LEFT_CONTROLLER_INDEX ].add(new THREE.Mesh( object.children[0].geometry, new THREE.MeshPhongMaterial({color:0x000000}) ) )
			controllers[ LEFT_CONTROLLER_INDEX ].indicatorSphere = new THREE.Mesh(new THREE.SphereGeometry(0.01), new THREE.MeshBasicMaterial({color:0xFF0000}));
			controllers[ LEFT_CONTROLLER_INDEX ].add( controllers[ LEFT_CONTROLLER_INDEX ].indicatorSphere );
			
			controllers[1-LEFT_CONTROLLER_INDEX].add(new THREE.Mesh( object.children[0].geometry.clone(), new THREE.MeshPhongMaterial({color:0x000000}) ) )
			controllers[1-LEFT_CONTROLLER_INDEX].children[controllers[1-LEFT_CONTROLLER_INDEX].children.length-1].geometry.applyMatrix( new THREE.Matrix4().makeScale(-1,1,1) );
			controllers[1-LEFT_CONTROLLER_INDEX].indicatorSphere = new THREE.Mesh(new THREE.SphereGeometry(0.01), new THREE.MeshBasicMaterial({color:0xFF0000}));
			controllers[1-LEFT_CONTROLLER_INDEX].add( controllers[ LEFT_CONTROLLER_INDEX ].indicatorSphere );
		},
		function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } );
	
	
	/*
	 * Interactive version of that diagram
	 * You have to grab two consecutive bonds
	 * The carbon beta and the backbone hydrogen are repulsed?
	 * 		negate the vector in the middle of tau, set them to that, then push them towards tau
	 * Just put a box on the carbon beta
	 * One has this idea of "grabbing and twisting", like the top of a bottle. Or, you know, balloons!
	 * 
	 * To begin with: two coming from one, the Ca at the center
	 * 
	 * It can EITHER do phi or psi, not both at the same time? If you go for that, update the "gripped point"
	 * 		
	 */
	
	for(var i = 0; i < 2; i++)
	{
		controllers[i].rudder = new THREE.Mesh(
				new THREE.Geometry(), 
				new THREE.MeshBasicMaterial({color:0xF0F0F0, side:THREE.DoubleSide}));
		controllers[i].rudder.geometry.faces.push(new THREE.Face3(0,1,2));
		controllers[i].rudder.geometry.faces.push(new THREE.Face3(0,2,3));
		controllers[i].rudder.geometry.vertices.push( new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() );
		controllers[i].rudder.visible = false;
		controllers[i].add( controllers[i].rudder );
		
		controllers[i].rudderTipIndicator = new THREE.Mesh(new THREE.SphereGeometry(0.01), new THREE.MeshBasicMaterial({color:0x00FF00}));
		controllers[i].rudderTipIndicator.visible = false;
		controllers[i].add( controllers[i].rudderTipIndicator );
	}
	
	var bonds = Array(3); //probably the right abstraction?
	var bondLength = 0.18; //so, this needs to be in angstroms, and then everything else is changed around that
	var bondRadius = bondLength / 25;
	var getEnd = function()
	{
		var bondEnd = new THREE.Vector3(0, this.length, 0);
		this.updateMatrix();
		this.updateMatrixWorld();
		this.localToWorld(bondEnd);
		return bondEnd;
	}
	var bondGeometry = new THREE.CylinderGeometry(bondRadius,bondRadius, bondLength, 31);
	bondGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,bondLength/2,0));
	bondGeometry.computeBoundingSphere();
	var bondMaterial = new THREE.MeshPhongMaterial({color:0x888888});
	
	for(var i = 0; i < bonds.length; i++)
	{
		bonds[i] = new THREE.Mesh(bondGeometry, bondMaterial);
		bonds[i].type = "bond"
		bonds[i].length = bondLength;
		bonds[i].getEnd = getEnd;
		bonds[i].currentRudderTip = null;
		bonds[i].rotation.order = 'ZYX'; //an interesting thing to do
	}
	
	bonds[0].add(bonds[1],bonds[2]);
	bonds[0].position.y = -bondLength;
	bonds[1].position.y = bondLength;
	bonds[2].position.y = bondLength;
	bonds[1].rotation.z = TAU / 8;
	bonds[2].rotation.z =-TAU / 8;
	Scene.add(bonds[0]);
	
//	{
//		var ramachandran = new THREE.Mesh( new THREE.PlaneGeometry(1,1,2,2), new THREE.MeshPhongMaterial({color:0x888888}) );
//		ramachandran.horizontalSegments = 2; //gotta keep this updated
//		console.log( ramachandran.geometry.vertices.length ); //expecting 9
//		var indicator = new THREE.Mesh(new THREE.SphereGeometry(0.003), new THREE.MeshBasicMaterial({color:0x000000}));
//		ramachandran.add(indicator);
//		ramachandran.genus = 0;
//		ramachandran.width = 1;
////		ramachandran.indicatorOrigin = new THREE.Vector3();
//		ramachandran.z = -0.3;
//		
//		Scene.add(ramachandran);
//		
//		var curlVector = function( pointOnLine, genus, acrossVector, upVector, lineLength ) //first arg varies between -0.5 and 0.5
//		{
//			var angleAround = (pointOnLine+0.5) * TAU;
//			
//			var acrossComponent = acrossVector.clone();
//			acrossComponent.multiplyScalar(-Math.sin(angleAround));
//			var upComponent = upVector.clone();
//			upComponent.multiplyScalar(Math.cos(angleAround));
//
//			var atGenus0 = acrossComponent.clone();
//			atGenus0.multiplyScalar(pointOnLine);
//			var atGenus1 = new THREE.Vector3();
//			atGenus1.addVectors(upComponent, acrossComponent);
//			
//			var currentPosition = new THREE.Vector3();
//			currentPosition.lerpVectors( atGenus0, atGenus1, genus );
//			currentPosition.multiplyScalar(lineLength)
//			return currentPosition;
//		}
//		
//		ramachandran.update = function(bonds)
//		{
//			genus += delta_t / 5;
//			if( genus > 1 )
//				genus = 0;
//			
//			var widthCurvedness = genus * 2;
//			if( widthCurvedness > 1 )
//				widthCurvedness = 1;
//			var heightCurvedness = (genus-0.5) * 2;
//			if( heightCurvedness < 0 )
//				heightCurvedness = 0;
//			
//			var ringRadius = width / TAU / 2;
//			var tubeRadius = ringRadius / 2;
//			
//			for(var i = 0; i < horizontalSegments + 1; i++)
//			{
//				var ringVector = curlVector( i / horizontalSegments - 0.5, widthCurvedness, zAxis, xAxis, ringRadius * TAU );
//				for(var j = 0; j < horizontalSegments + 1; j++)
//				{
//					ringVector.add( curlVector( 0, heightCurvedness, yAxis, xAxis ) );
//					ramachandran.geometry.vertices[ i * horizontalSegments + j ].add( ringVector );
//				}
//			}
//		}
//	}

	Render( controllers, bonds );
});