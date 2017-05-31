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
	
	scene = new THREE.Scene();
	
	Camera = new THREE.PerspectiveCamera( 50, //will be changed by VR
			Renderer.domElement.width / Renderer.domElement.height, //window.innerWidth / window.innerHeight,
			0.001, 700);
	spectatorScreenIndicator = new THREE.Line(new THREE.Geometry());
	for(var i = 0; i < 4; i++)
		spectatorScreenIndicator.geometry.vertices.push(new THREE.Vector3());
	spectatorScreenIndicator.visible = true;
	Camera.add( spectatorScreenIndicator );
	scene.add(Camera);
	
	VRMODE = 0;
	OurVREffect = new THREE.VREffect( Renderer );
//	console.log(OurVREffect.requestAnimationFrame)
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
//		scene.add( controllers[ i ] );
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
	 * Want to have angle labels really
	 * And atom labels?
	 * A blob that is the residue
	 */
	
	for(var i = 0; i < 2; i++)
	{
		var stickLength = 0.1;
		controllers[i].angleStick = new THREE.Mesh( 
				new THREE.CylinderGeometry( stickLength / 32, stickLength / 32, stickLength, 16 ), 
				new THREE.MeshBasicMaterial({color:0xF0F0F0, side:THREE.DoubleSide}));
		
		controllers[i].angleStick.geometry.applyMatrix( new THREE.Matrix4().makeRotationAxis( zAxis, TAU / 4 ) );
		controllers[i].angleStick.visible = false;

		controllers[i].add( controllers[i].angleStick );
	}
	
	var bonds = Array(5); //probably the right abstraction?
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
		bonds[i].rotation.order = 'ZYX'; //an interesting thing to do
		bonds[i].isBackbone = false;
	}
	
	bonds[0].add(bonds[1],bonds[2]);
	bonds[1].add(bonds[3],bonds[4]);
	bonds[0].isBackbone = true;
	bonds[1].isBackbone = true;
	for(var i = 1; i < bonds.length; i++)
	{
		bonds[i].position.y = bondLength;
	}
	bonds[1].rotation.z = TAU / 8;
	bonds[2].rotation.z =-TAU / 8;
	bonds[3].rotation.z = TAU / 8;
	bonds[4].rotation.z =-TAU / 8;
//	scene.add(bonds[0]);
	
	function getTau( branchBond )
	{
		for(var i = 0; i < branchBond.children.length; i++)
		{
			if( branchBond.children[i].isBackbone )
			{
				var childAxis = yAxis.clone();
				branchBond.children[i].updateMatrix();
				childAxis.applyMatrix( branchBond.children[i].matrix );
				var CAToNitrogen = yAxis.clone().negate();
				return CAToNitrogen.angleTo( childAxis );
			}
		}
	}
	
	function getPhi(branchBond)
	{
		//0 is when three backbone bonds are in a hexagon
		if(branchBond.parent === scene)
			return;
		
		var parentBondDirection = branchBond.parent.getWorldPosition();
		branchBond.worldToLocal( parentBondDirection );
		
		for(var i = 0; i < branchBond.children.length; i++)
		{
			if( branchBond.children[i].isBackbone )
			{
				var childBondDirection = yAxis.clone();
				branchBond.children[i].updateMatrix();
				childBondDirection.applyMatrix( branchBond.children[i].matrix );
				return getAntiClockwiseYPlaneAngle( parentBondDirection, childBondDirection )
			}
		}
	}
	
	function getAntiClockwiseYPlaneAngle(vec1,vec2)
	{
		var vec1Plane = new THREE.Vector2(vex1.x, vec1.y);
		var vec2Plane = new THREE.Vector2(vex2.x, vec2.y);
		
		var angle = vec2Plane.angle() - vec1Plane.angle();
		return angle;
	}
	
	var carbonAlphas = [];
	for(var i = 0; i < 2; i++)
		carbonAlphas
	
	{
		ramachandran = new THREE.Object3D();
		ramachandran.horizontalSegments = 40;
		ramachandran.plot = new THREE.Mesh( 
				new THREE.Geometry(), 
				new THREE.MeshPhongMaterial({color:0x888888, side: THREE.DoubleSide}) );
		ramachandran.plot.geometry.vertices = Array( Math.pow(ramachandran.horizontalSegments+1, 2 ) );
		for(var i = 0, il = ramachandran.plot.geometry.vertices.length; i < il; i++)
			ramachandran.plot.geometry.vertices[i] = new THREE.Vector3();
		ramachandran.plot.geometry.faces = Array( ramachandran.horizontalSegments * ramachandran.horizontalSegments * 2 );
		for(var i = 0; i < ramachandran.horizontalSegments; i++) //row
		{
			for(var j = 0; j < ramachandran.horizontalSegments; j++) //column
			{
				var topLeft = i * (ramachandran.horizontalSegments+1) + j;
				var bottomLeft = (i+1) * (ramachandran.horizontalSegments+1) + j;
				ramachandran.plot.geometry.faces[(i*ramachandran.horizontalSegments+j)*2+0] = new THREE.Face3( 
						topLeft,
						topLeft + 1,
						bottomLeft );
				ramachandran.plot.geometry.faces[(i*ramachandran.horizontalSegments+j)*2+1] = new THREE.Face3( 
						bottomLeft,
						topLeft + 1,
						bottomLeft + 1 );
			}
		}
		
		ramachandran.add(ramachandran.plot);
		ramachandran.indicator = new THREE.Mesh(new THREE.SphereGeometry(0.003), new THREE.MeshBasicMaterial({color:0x000000}));
		ramachandran.add(ramachandran.indicator);
		
		ramachandran.genus = 0;
		ramachandran.width = 1;
		ramachandran.position.z = -0.3;
		ramachandran.rotation.x = TAU / 4
		ramachandran.scale.setScalar(0.1)
		
		scene.add(ramachandran);
		
		var positionOnCircle = function(arcLength, center, axis, angleZeroPosition )
		{
			var radiusVector = angleZeroPosition.clone();
			radiusVector.sub( center );
			
			var circumference = TAU * radiusVector.length();
			var angle = arcLength / circumference * TAU;
			
			var position = radiusVector.clone();
			position.applyAxisAngle(axis,angle); //or minus that angle?
			position.add(center);
			
			return position;
		}
		
		//accepts numbers from a 2x2 square centered at the origin. Returns that for genus = 0, gives 2x(2/3) donut for genus = 1
		var foldingDonutPosition = function( x, y, genus )
		{
			var finalOuterRadius = 2 / TAU;
			var virtualOuterRadius = genus === 0 ? Number.MAX_SAFE_INTEGER : finalOuterRadius / genus;
			
			var virtualCircumferenceCenter = new THREE.Vector3(0,0,-virtualOuterRadius);
			var circumferenceComponent = positionOnCircle( x, virtualCircumferenceCenter, yAxis, new THREE.Vector3() );
			
			var finalMinorRadius = finalOuterRadius / 3;
			var virtualMinorRadius = genus === 0 ? Number.MAX_SAFE_INTEGER : finalMinorRadius / genus;
			
			var virtualTubeCenter = virtualCircumferenceCenter.clone();
			virtualTubeCenter.setLength( virtualMinorRadius );
			
			var tubeCenterTangent = circumferenceComponent.clone().sub(virtualTubeCenter);
			tubeCenterTangent.cross(yAxis);
			tubeCenterTangent.normalize();
			var tubeComponent = positionOnCircle( y, virtualTubeCenter, tubeCenterTangent, circumferenceComponent );
			
			return tubeComponent;
		}
		
		ramachandran.desiredGenus = 1 - ramachandran.genus;
		
		ramachandran.update = function(bonds)
		{
			if( this.desiredGenus )
				this.genus += delta_t / 7;
			else
				this.genus -= delta_t / 7;
			if( this.genus > 1 )
				this.desiredGenus = 0;
			if( this.genus < 0 )
				this.desiredGenus = 1;
			
			for(var i = 0; i <= this.horizontalSegments; i++)
			{
				for(var j = 0; j <= this.horizontalSegments; j++)
					this.plot.geometry.vertices[ i * (this.horizontalSegments+1) + j ].copy(
						foldingDonutPosition( i / this.horizontalSegments * 2 - 1, j / this.horizontalSegments * 2 - 1, this.genus ) );
			}
			if(!logged) console.log(this.plot.geometry.vertices)
			logged = 1;
			ramachandran.plot.geometry.computeFaceNormals();
			ramachandran.plot.geometry.computeVertexNormals();
			ramachandran.plot.geometry.verticesNeedUpdate = true;
		}
	}

	Render( controllers, bonds );
});