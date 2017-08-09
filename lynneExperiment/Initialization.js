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
	new THREE.FileLoader().load(
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
				
				//pair of hacks that Lynne said.
				psi += 180;
				phi *= -1;
				
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
		controllers[ i ].heldBond = null;
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
	
	
	/* TODO
	 * Change to amide planes
	 * fix point mapping (getphi and getpsi)
	 * Pick up donut
	 * Allowed and not allowed sound effects and flashing
	 * Hard sphere in realtime
	 * 		Better resolution etc
	 * Labels
	 * 		angle labels that change color when angle is changed drastically
	 * 		Atom labels (probably color is fine)
	 * 		Amide plane labels
	 * 		A blob that is the residue
	 * Residue and the Calpha hydrogen are one entity
	 * 		negate the vector in the middle of tau, set them to that, then push them towards tau
	 * Record
	 * 
	 * 
	 * How about it shows, as "ghosts", the possible / allowed phis and psis given current phi and psi,
	 * 		Eg a "cross" on the ramachandran diagram
	 * 		and the ghosts are the color of points that appear on the ramachandran representing them
	 * 		Or hey, maybe a volume
	 * 
	 * Plot tau against phi or psi, get a klein bottle?
	 */
	
	//bonds
	{
		var bondLength = 0.18; //so, this needs to be in angstroms, and then everything else is changed around that
		var bondRadius = bondLength / 25;
		var bondGeometry = new THREE.CylinderGeometry(bondRadius,bondRadius, bondLength, 31);
		bondGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0,bondLength/2,0));
		bondGeometry.computeBoundingBox();
		var atomGeometry = new THREE.SphereGeometry(bondRadius*4,16,16).applyMatrix(new THREE.Matrix4().makeTranslation(0,bondLength,0));
		var bondMaterial = new THREE.MeshPhongMaterial({color:0xFFFFFF});
		
		var atomDescriptions = {
			H: {color:0xFFFFFF,radius:bondRadius*4},
			N: {color:0x2233FF,radius:bondRadius*4.1},
			O: {color:0xFF2200,radius:bondRadius*4.2},
			C: {color:0x222222,radius:bondRadius*4.3},
		}
		
		var getEndWorld = function()
		{
			var bondEnd = new THREE.Vector3(0, this.length, 0);
			this.updateMatrixWorld();
			this.localToWorld(bondEnd);
			return bondEnd;
		}
		
		function constructBond(atomType)
		{
			var newBond = new THREE.Object3D();
			newBond.add(new THREE.Mesh(bondGeometry, bondMaterial.clone()));
			newBond.add(new THREE.Mesh(atomGeometry, bondMaterial.clone()));
			newBond.children[1].material.color.setHex( atomDescriptions[atomType].color );
			newBond.children[1].scale.setScalar(1+atomDescriptions[atomType].radius-4);

			newBond.type = "bond";
			newBond.length = bondLength;
			newBond.getEndWorld = getEndWorld;
			newBond.getPhi = getPhi;
			newBond.getPsi = getPsi;
			newBond.getTau = getTau;
			
			return newBond;
		}
		
		function constructAmidePlane()
		{
			var amide = new THREE.Object3D();
			
			amide.carbon = constructBond("C");
			amide.carbon.rotation.z = -TAU/12;
			amide.add( amide.carbon );
			
			amide.oxygen = constructBond("O");
			amide.oxygen.position.copy(amide.carbon.getEndWorld() );
			amide.oxygen.rotation.z = TAU/12;
			amide.add( amide.oxygen );
			
			amide.nitrogen = constructBond("N");
			amide.nitrogen.position.copy(amide.carbon.getEndWorld() );
			amide.nitrogen.rotation.z = -TAU/4;
			amide.add( amide.nitrogen );
			
			amide.carbonAlpha = constructBond("C");
			amide.carbonAlpha.position.copy(amide.nitrogen.getEndWorld() );
			amide.carbonAlpha.rotation.z = -TAU/12;
			amide.add( amide.carbonAlpha );
			
			amide.hydrogen = constructBond("H");
			amide.hydrogen.position.copy( amide.nitrogen.getEndWorld() );
			amide.hydrogen.rotation.z = -TAU * 5/6;
			amide.add( amide.hydrogen );
			
			return amide;
		}
		
		/*
		 * Angle measurer
		 */
		
		function getTau()
		{
			//bond.rotation.z?
			var bondEnd = this.getEndWorld();
			var bondBeginning = new THREE.Vector3();
			this.localToWorld( bondBeginning );
			bondEnd.sub(bondBeginning)
			var pointingDown = new THREE.Vector3(0,-1,0);
			return pointingDown.angleTo(bondEnd);
		}
		
		function getPhi()
		{
//			if(this.parentBond === scene)
//				return 0;
//				
//			var bondEnd = this.getEndWorld();
//			bondEnd.sub(this.getWorldPosition());
//			
//			var provisionalParentHydrogen = new THREE.Vector3(-1,0,0);
//			this.parentBond.updateMatrixWorld();
//			this.parentBond.localToWorld(provisionalParentHydrogen);
//			
//			var provisionalParentNitrogen = new THREE.Vector3();
//			this.parentBond.localToWorld(provisionalParentNitrogen);
//			provisionalParentHydrogen.sub(provisionalParentNitrogen);
//			
//			var provisionalParent = this.parentBond.getEndWorld();
//			provisionalParent.sub(provisionalParentNitrogen);
//			
//			var orthogonalPlane = new THREE.Plane(provisionalParent);
//			provisionalParentHydrogen.copy(orthogonalPlane.projectPoint(provisionalParentHydrogen));
//			bondEnd.copy( orthogonalPlane.projectPoint( bondEnd ) );
//			
//			var crossProd = new THREE.Vector3().crossVectors(bondEnd,provisionalParentHydrogen);
//			crossProd.multiplyScalar(1/bondEnd.length()/provisionalParentHydrogen.length())
//			
//			return Math.asin(crossProd.length() );
			
//			return this.parentBond.rotation.y;
			return 0;
		}
		
		function getPsi()
		{
			if(this.parentBond === scene)
				return 0;
			
			this.updateMatrixWorld();
			
			var carbonAlpha = this.getWorldPosition();
			
			provisionalParentNitrogen = this.parentBond.getWorldPosition();
			provisionalParentNitrogen.sub(carbonAlpha);
				
			var provisionalCarbonBeta = this.getEndWorld();
			
			var provisionalOxygen = new THREE.Vector3(-1,this.length,0);
			this.localToWorld(provisionalOxygen);
			provisionalOxygen.sub(provisionalCarbonBeta);
			
			var orthogonalPlane = new THREE.Plane( provisionalCarbonBeta.clone().sub( carbonAlpha ).normalize() );
			
			provisionalOxygen.copy( orthogonalPlane.projectPoint( provisionalOxygen ) );
			provisionalParentNitrogen.copy( orthogonalPlane.projectPoint( provisionalParentNitrogen ) );
			
			var crossProd = new THREE.Vector3().crossVectors(provisionalOxygen,provisionalParentNitrogen);
			crossProd.multiplyScalar(1/provisionalParentNitrogen.length()/provisionalOxygen.length())
			
			return Math.asin(crossProd.length() );
			
//			return this.rotation.y;
		}
		
		/*
		 * for two amide planes and alanine: 15 bonds
		 */
		
		
		
		bonds[0].parentBond = scene;
		bonds[1].parentBond = bonds[0];
		bonds[2].parentBond = bonds[0];
		bonds[3].parentBond = bonds[1];
		bonds[4].parentBond = bonds[1];
		
		for(var i = 1; i < bonds.length; i++)
		{
			if(bonds[i].parentBond!==-1)
				bonds[i].parentBond.add(bonds[i]);
			bonds[i].position.y = bondLength;
		}
		bonds[1].rotation.z = TAU / 8;
		bonds[2].rotation.z =-TAU / 8;
		bonds[3].rotation.z = TAU / 8;
		bonds[4].rotation.z =-TAU / 8;
		scene.add(bonds[0]);
	}
	
	var ramachandran = initRamachandran(allowedArray);

	Render( controllers, bonds, ramachandran );
}

var angleAllowed;