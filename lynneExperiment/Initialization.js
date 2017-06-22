//the first init
socket.on('OnConnect_Message', function(msg)
{
	var loadingChecker = 
	{
		font: false,
		allowednesses: [false,false,false]
	}
	loadingChecker.attemptInit = function()
	{
		for(var propt in this )
		{
			if( this[propt] === false )
				return;
		}
		
		postloadInit(allowedArray);
	}
	
	var allowedArray = Array(3);
	
	for(var i = 0; i < 3; i++ )
	{
		allowedArray[i] = Array( 360 / 5 );
		
		loadAllowedArray(i, allowedArray[i], loadingChecker)
	}
	
	new THREE.FontLoader().load(  "gentilis.js", 
		function ( reponse )
		{
			gentilis = reponse;
			loadingChecker.font = true;
			loadingChecker.attemptInit();
		},
		function ( xhr ) {},
		function ( xhr ) { console.error( "couldn't load font" ); }
	);
});

function loadAllowedArray(k, allowedPhiPsiArray, loadingChecker)
{
	var tauAngle = 105 + k * 5;
	var filename = "Data/Ala_Tau_" + tauAngle.toString() + ".txt";
	new THREE.XHRLoader().load(
		filename,
		function(data)
		{
			var values = data.split(" "); //for some reason this handles the newlines as well
			
			for(var i = 0; i < allowedPhiPsiArray.length; i++)
			{
				allowedPhiPsiArray[i] = Array( 360 / 5 );
			}
			
			for(var i = 0, il = Math.floor( values.length / 3 ); i < il; i++)
			{
				var phi = parseInt( values[i*3+0] );
				var psi = parseInt( values[i*3+1] );
				while(phi < 0)
					phi += 360;
				while(psi < 0)
					psi += 360;
				
				allowedPhiPsiArray[phi / 5][psi / 5] = parseInt( values[i*3+2] );
			}
			
			loadingChecker.allowednesses[k] = true;
			loadingChecker.attemptInit();
		},
		function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load data" ); }
	);
}

function postloadInit( allowedArray )
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
	
	var controllers = Array(2);
	for(var i = 0; i < 2; i++)
	{
		controllers[ i ] = new THREE.Object3D();
		controllers[ i ].Gripping = 0;
		controllers[ i ].heldBond = -1;
		scene.add( controllers[ i ] );
	}
	var handModelLink = "Data/glove.obj"
	if ( WEBVR.isAvailable() === true ) //Hah and when all browsers have VR?
	{
		//actually people might want to spectate in google cardboard
		//you just need to move the hands to be in the right position relative to wherever they're looking
		document.body.appendChild( WEBVR.getButton( OurVREffect ) );
		spectatorScreenIndicator.visible = true;
		spectatorScreenIndicator.frustumCulled = false;
	}
	new THREE.OBJLoader().load( handModelLink,
		function ( object ) 
		{
			object.children[0].scale.setScalar( 0.00047 );
			object.children[0].rotation.y = TAU/2;
			object.children[0].rotation.z =-1;
			object.children[0].geometry.center();
			
			controllers[ LEFT_CONTROLLER_INDEX ].add( object.children[0].clone() );
			
			controllers[1-LEFT_CONTROLLER_INDEX ].add( object.children[0].clone() );
			controllers[1-LEFT_CONTROLLER_INDEX ].scale.x *= -1;
			controllers[1-LEFT_CONTROLLER_INDEX ].children[0].material = controllers[ LEFT_CONTROLLER_INDEX ].children[0].material.clone();
			controllers[1-LEFT_CONTROLLER_INDEX ].children[0].material.side = THREE.BackSide;
			controllers[1-LEFT_CONTROLLER_INDEX ].children[0].material.needsUpdate = true;
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
	 * 
	 * So how does Lynne want to use it? We could make a video with her in it? Greenscreen would be nice ofc
	 * 
	 * How about it shows, as "ghosts", the possible / allowed phis and psis given current phi and psi,
	 * 	Eg a "cross" on the ramachandran diagram
	 * 	and the ghosts are the color of points that appear on the ramachandran representing them
	 * 
	 * 
	 * The purpose of the meeting tomorrow is to show Lynne the capabilities and then decide on what to do
	 * 	She wants something to put in her presentations? Or just a youtube video? Silent
	 * 
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
	
	var bonds = Array(5);
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
	bondGeometry.merge(new THREE.SphereGeometry(bondRadius*4,16,16));
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
	scene.add(bonds[0]);
	
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
	
//	var carbonAlphas = [];
//	for(var i = 0; i < 2; i++)
//		carbonAlphas
	
	{
		function normalizedAngle(angle)
		{
			var returnValue = angle;
			while(returnValue<0)
				returnValue += TAU;
			while(returnValue >= TAU)
				returnValue -= TAU;
			return returnValue;
		}
		angleAllowed = function(tau, phi, psi)
		{
			var phiIndex = normalizedAngle(phi);
			phiIndex = Math.round(phiIndex * 360 / TAU / 5);
			var psiIndex = normalizedAngle(psi);
			psiIndex = Math.round(psiIndex * 360 / TAU / 5);
			
			var tauIndex = normalizedAngle(tau);
			tauIndex = Math.round(tauIndex * 360 / TAU / 5 );
			if( tauIndex <= 20 || 24 <= tauIndex )
			{
				console.log("received unknown tau: ", tau);
				return 0;
			}
			tauIndex -= 21;
			
			return allowedArray[ tauIndex ][ phiIndex ][ psiIndex ];
		}
	}
	
	{
		ramachandran = new THREE.Object3D();
		ramachandran.horizontalSegments = 63;
		ramachandran.plot = new THREE.Mesh( 
				new THREE.Geometry(), 
				new THREE.MeshPhongMaterial({vertexColors:THREE.FaceColors, side: THREE.DoubleSide}) );
		ramachandran.plot.geometry.vertices = Array( Math.pow(ramachandran.horizontalSegments+1, 2 ) );
		for(var i = 0, il = ramachandran.plot.geometry.vertices.length; i < il; i++)
			ramachandran.plot.geometry.vertices[i] = new THREE.Vector3();
		ramachandran.plot.geometry.faces = Array( ramachandran.horizontalSegments * ramachandran.horizontalSegments * 2 );
		allowedColor = new THREE.Color(0xFEEFC6);
		disallowedColor = new THREE.Color(0x74BDE6);
		var thisFaceColor
		for(var i = 0; i < ramachandran.horizontalSegments; i++) //row
		{
			for(var j = 0; j < ramachandran.horizontalSegments; j++) //column
			{
				thisFaceColor = angleAllowed( 115/360*TAU,
					i / ramachandran.horizontalSegments * TAU,
					j / ramachandran.horizontalSegments * TAU) ?
					allowedColor : disallowedColor;
				
				var topLeft = i * (ramachandran.horizontalSegments+1) + j;
				var bottomLeft = (i+1) * (ramachandran.horizontalSegments+1) + j;
				
				ramachandran.plot.geometry.faces[(i*ramachandran.horizontalSegments+j)*2+0] = new THREE.Face3( 
					topLeft,
					topLeft + 1,
					bottomLeft,
					new THREE.Vector3(0,0,1),
					thisFaceColor
				);
				ramachandran.plot.geometry.faces[(i*ramachandran.horizontalSegments+j)*2+1] = new THREE.Face3( 
					bottomLeft,
					topLeft + 1,
					bottomLeft + 1,
					new THREE.Vector3(0,0,1),
					thisFaceColor
				);
			}
		}
		
		ramachandran.add(ramachandran.plot);
		ramachandran.indicator = new THREE.Mesh(new THREE.SphereGeometry(0.003), new THREE.MeshBasicMaterial({color:0x000000}));
		ramachandran.add(ramachandran.indicator);
		
		ramachandran.genus = 0;
		ramachandran.width = 1;
		ramachandran.position.z = -0.1;
		ramachandran.position.y = -0.1;
		ramachandran.scale.setScalar(0.09)
		
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
			var innerRoundedness = genus < 0.5 ? genus * 2 : 1;
			if(innerRoundedness<0.02)
				innerRoundedness = 0;
			var outerRoundedness = genus >= 0.5 ? (genus-0.5) * 2 : 0;
			
			var finalOuterRadius = 2 / TAU;
			var virtualOuterRadius = outerRoundedness === 0 ? Number.MAX_SAFE_INTEGER : finalOuterRadius / outerRoundedness;
			var virtualCircumferenceCenter = new THREE.Vector3(0,0,-virtualOuterRadius);
			var circumferenceComponent = positionOnCircle( x, virtualCircumferenceCenter, yAxis, new THREE.Vector3() );
			
			var finalMinorRadius = finalOuterRadius / 3;
			var virtualMinorRadius = innerRoundedness === 0 ? Number.MAX_SAFE_INTEGER : finalMinorRadius / innerRoundedness;
			
			var virtualTubeCenter = virtualCircumferenceCenter.clone();
			virtualTubeCenter.sub(circumferenceComponent);
			virtualTubeCenter.setLength( virtualMinorRadius );
			virtualTubeCenter.add(circumferenceComponent);
			
			var tubeCenterTangent = circumferenceComponent.clone().sub(virtualTubeCenter);
			tubeCenterTangent.cross(yAxis);
			tubeCenterTangent.normalize();
			
			var finalPosition = positionOnCircle( y / (1+2*innerRoundedness), virtualTubeCenter, tubeCenterTangent, circumferenceComponent );
			return finalPosition;
		}
		
		ramachandran.desiredGenus = 1 - ramachandran.genus;
		
		ramachandran.update = function(bonds)
		{
			if( this.desiredGenus )
				this.genus += delta_t / 2;
			else
				this.genus -= delta_t / 2;
			if( this.genus > 1 )
				this.genus = 1;
			if( this.genus < 0 )
				this.genus = 0;
			
			for(var i = 0; i <= this.horizontalSegments; i++)
			{
				for(var j = 0; j <= this.horizontalSegments; j++)
					this.plot.geometry.vertices[ i * (this.horizontalSegments+1) + j ].copy(
						foldingDonutPosition( (i / this.horizontalSegments) * 2 - 1, (j / this.horizontalSegments) * 2 - 1, this.genus ) );
			}
			ramachandran.plot.geometry.computeFaceNormals();
			ramachandran.plot.geometry.computeVertexNormals();
			ramachandran.plot.geometry.verticesNeedUpdate = true;
		}
		
		document.addEventListener( 'keydown', function(event){
			if( event.keyCode === 32 )
			{
				ramachandran.desiredGenus = 1 - ramachandran.desiredGenus;
			}
			
			if(event.keyCode === 190 && WEBVR.isAvailable() === true)
			{
				event.preventDefault();
				OurVREffect.setFullScreen( true );

				VRMODE = 1; //OR GOOGLE CARDBOARD TODO, nobody wants to spectate as cardboard
				
				//bug if we do this earlier(?)
				OurVREffect.scale = 0; //you'd think this would put your eyes in the same place but it doesn't
				
				return;
			}
		}, false );
	}

	Render( controllers, bonds );
}

var angleAllowed;