function Initialize()
{
	var templateRadius = 1;
	var sphereGeometryTemplate = new THREE.IcosahedronGeometry(templateRadius,4);
	
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
	
	var models = Array();
	var maps = Array();
	
	//socket shit
	{
		var initialized = false;
		var socketOpened = false;
		
		if ( !("WebSocket" in window) )
		{
			alert("Your browser does not support web sockets");
			return;
		}

		var socket = new WebSocket("ws://" + window.location.href.substring(7) + "ws");
		if(!socket)
		{
			console.log("invalid socket");
			return;
		}
		socket.onmessage = function(msg)
		{
			var messageContents = (msg.data).split(",");
			
			if( messageContents[0] === "mousePosition")
			{
				cursor.oldWorldPosition.copy(cursor.getWorldPosition());
				
				cursor.position.z = parseFloat( messageContents[2] ) - 1;
				var maxZ = 2; //maybe this should be about that clip plane thing
				cursor.position.z *= FOCALPOINT_DISTANCE * 2;
				
				cameraFrustum = (new THREE.Frustum()).setFromMatrix(camera.projectionMatrix);
				
				var frustumWidthAtZ = Renderer.domElement.width / Renderer.domElement.height * 2 * Math.tan( camera.fov / 360 * TAU / 2 ) * -cursor.position.z;
				if(isMobileOrTablet)
					frustumWidthAtZ /= 2; //coz there's two
				cursor.position.x = (parseFloat( messageContents[1] ) - 0.5) * frustumWidthAtZ;
			}
			else if( messageContents[0] === "lmb" )
			{
				if( parseInt( messageContents[1] ) )
					cursor.grabbing = true;
				else
					cursor.grabbing = false;
			}
			else if( messageContents[0] === "F5" && parseInt( messageContents[1] ) )
			{
				window.location.reload(true);
			}
			//this works fine but we can't record it!
			//siiiiigh, it would introduce complexity for the user anyway
//			else if( messageContents[0] === "o" && parseInt( messageContents[1] ) )
//			{
//				ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8] -= 0.01;
//				ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] += 0.01;
//				console.log(ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8])
//				console.log(ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8])
//			}
//			else if( messageContents[0] === "l" && parseInt( messageContents[1] ) )
//			{
//				ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8] += 0.01;
//				ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] -= 0.01;
//				console.log(ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8])
//				console.log(ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8])
//			}
			else
			{
				console.log("received unrecognized message header: ", messageContents[0] )
			}
		}
		socket.onclose = function()
		{
			console.log("The connection has been closed.");
		}
		socket.onopen = function()
		{
			socketOpened = true;
			if(initialized)
				mainLoop( socket, cursor, models, maps );
		}
	}
	
	cursor.quaternion.__proto__.distanceTo = function(q2)
	{
		var theta = Math.acos(this.w*q2.w + this.x*q2.x + this.y*q2.y + this.z*q2.z);
		if (theta>Math.PI/2) theta = Math.PI - theta;
		return theta;
	}
	
	//Standard
	{
		Renderer = new THREE.WebGLRenderer({ antialias: false });
		Renderer.setClearColor( 0x000000 );
		Renderer.setPixelRatio( window.devicePixelRatio );
		Renderer.setSize( window.innerWidth, window.innerHeight );
		Renderer.sortObjects = false;
		Renderer.shadowMap.cullFace = THREE.CullFaceBack;
		document.body.appendChild( Renderer.domElement );
		
		scene = new THREE.Scene();
		
		var verticalFov = 70;
		var nearestPointToBeSeenInStereo;
		console.log("please");
		
		camera = new THREE.PerspectiveCamera( 70,
				Renderer.domElement.width / Renderer.domElement.height, //window.innerWidth / window.innerHeight,
				0.001, 700);
		
		scene.add(ourObject);
		scene.add( camera );
		camera.add(cursor);
		scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
		
		var OurFontLoader = new THREE.FontLoader();
		OurFontLoader.load(  "http://hamishtodd1.github.io/Sysmic/gentilis.js", 
			function ( reponse ) {
				gentilis = reponse;
			},
			function ( xhr ) {}, //progression function
			function ( xhr ) { console.error( "couldn't load font" ); }
		);
		
		ourOrientationControls = new THREE.DeviceOrientationControls(camera);
		
		ourStereoEffect = new THREE.StereoEffect( Renderer );
		
		ourStereoEffect.stereoCamera.eyeSep = 0.02; //very small, gotten through guessing.
		
		//this is for the fairphone in the daydream, and would need to be changed with eyeSep
//		ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] = 0.442;
		
		makeStandardScene(false);
		
		//changes isMobileOrTablet
		(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) isMobileOrTablet = true;})(navigator.userAgent||navigator.vendor||window.opera);
	}
	
	//setting up our model
	{
		/*
		 * Oh-fucking-kay, so you get:
		 * string of atom element letters
		 * array of positions
		 * array of bonds (atom indices)
		 */
		
		var id = "3gp";
		var centeringVector = new THREE.Vector3(-10.80, -2.40, -8.80); //hack from chimera
		var angstrom = 0.03;
		
		var numMolecules = 2;
		
		function pointInBoundingSphere( point )
		{
			var localPosition = point.clone();
			this.updateMatrixWorld();
			this.worldToLocal(localPosition); //might need to update matrix world! Not for the time being though
			if( localPosition.distanceTo( this.geometry.boundingSphere.center) < this.geometry.boundingSphere.radius )
				return true;
			else return false;
		}
		function updateBoundingSphere()
		{
			var oldRadius = this.geometry.boundingSphere.radius;
			this.geometry.computeBoundingSphere();
			var radiusChange = this.geometry.boundingSphere.radius / oldRadius;
			//update the position here
			this.children[0].geometry.applyMatrix(new THREE.Matrix4().makeScale( radiusChange, radiusChange, radiusChange ));
		}
		
		var ourPDBLoader = new THREE.PDBLoader();
		ourPDBLoader.load( id + ".pdb",
			function ( geometryAtoms, geometryBonds ) {
				var atomElements = "HOH";
				var bondIndices = [];
				var atomPositions = geometryAtoms.attributes.position.array;
				var distVector = new THREE.Vector3();
				for(var i = 0, il = atomPositions.length / 3; i < il; i++)
				{
					for(var j = 1; j < 20; j++)
					{
						if( i + j >= il )
							break;
						distVector.set(
								atomPositions[i*3+0] - atomPositions[(i+j)*3+0],
								atomPositions[i*3+1] - atomPositions[(i+j)*3+1],
								atomPositions[i*3+2] - atomPositions[(i+j)*3+2]);
						if(distVector.length() < 2)
							bondIndices.push(i,i+j);
					}
				}
				var model = createClassicCootModel( geometryAtoms.elements, atomPositions,bondIndices);
				model.geometry.applyMatrix( new THREE.Matrix4().setPosition( centeringVector ) );
				model.geometry.applyMatrix(new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom));
				
				for(var i = 0; i < numMolecules; i++)
				{
					//aka object construction
					var newModel = new THREE.Mesh(model.geometry.clone(), model.material.clone());
					newModel.updateBoundingSphere = updateBoundingSphere;
					newModel.pointInBoundingSphere = pointInBoundingSphere;
					
					newModel.position.x = (-1-i) * angstrom * 10;
					newModel.position.z = -FOCALPOINT_DISTANCE;
					newModel.quaternion.set(Math.random(),Math.random(),Math.random(),Math.random());
					newModel.quaternion.normalize();

					scene.add( newModel );
					models.push( newModel );
				}
			},
			function ( xhr ) {}, //progression function
			function ( xhr ) { console.error( "couldn't load PDB" ); }
		);
		
		var ourOBJLoader = new THREE.OBJLoader();
		ourOBJLoader.load( id + ".obj",
		function ( object ) 
		{
			var map = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x888888}));
			map.geometry.addAttribute('position', new THREE.BufferAttribute( meshToLineCoordinates( object.children[0].geometry ), 3) );
			map.geometry.applyMatrix( new THREE.Matrix4().setPosition( centeringVector ) );
			map.geometry.applyMatrix( new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom) );
			
			
			for(var i = 0; i < numMolecules; i++)
			{
				maps.push( map.clone() );
				scene.add( maps[i] );
				maps[i].position.x = i * angstrom * 10;
				maps[i].position.z = -FOCALPOINT_DISTANCE
			}
		},
		function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } );
		
		//test on the rift
		//then on the phone
		
		
		/*
		 * be sure to adopt his naming conventions
		 * 
		 * info that you need: element + positions, bonds.
		 */
	}

	initialized = true;
	if(socketOpened)
		mainLoop( socket, cursor, models, maps );
}

