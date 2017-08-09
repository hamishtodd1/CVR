function desktopInitialize()
{
	window.addEventListener( 'resize', function(){
		console.log("resizing")
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	ourVRControls = new THREE.VRControls( camera );
	ourVREffect = new THREE.VREffect( renderer );
//	console.log(webgl.getParameter(webgl.MAX_TEXTURE_SIZE))
	
	var controllers = Array(2);
	var controllerMaterial = new THREE.MeshPhongMaterial({color:0x000000});
	for(var i = 0; i < 2; i++)
	{
		controllers[ i ] = new THREE.Object3D();
		controllers[ i ].gripping = 0;
		controllers[ i ].add(new THREE.Mesh( new THREE.Geometry(), controllerMaterial.clone() ))
		scene.add( controllers[ i ] );
	}
	new THREE.OBJLoader().load( "data/external_controller01_left.obj",
		function ( object ) 
		{	
			var controllerModelGeometry = object.children[0].geometry;
		
			controllerModelGeometry.applyMatrix( new THREE.Matrix4().makeRotationAxis(xAxis,0.5) );
			controllerModelGeometry.applyMatrix( new THREE.Matrix4().makeTranslation(0.002,0.036,-0.039) );
//			controllerModelGeometry.applyMatrix( new THREE.Matrix4().makeScale(0.76,0.76,0.76) );
			
			controllers[  LEFT_CONTROLLER_INDEX ].children[0].geometry = controllerModelGeometry;
			
			controllers[1-LEFT_CONTROLLER_INDEX ].children[0].geometry = controllerModelGeometry.clone();
			controllers[1-LEFT_CONTROLLER_INDEX ].children[0].geometry.applyMatrix( new THREE.Matrix4().makeScale(-1,1,1) );
		},
		function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } );
	
	makeStandardScene(true);
	
	{
		/*
		 * We assume you get:
		 * string of atom element letters
		 * array of positions
		 * array of bonds (atom indices)
		 * 
		 * be sure to adopt his naming conventions
		 */
		
		var models = Array();
		var maps = Array();
		
		var id = "1l2y"; //3NIR is another small one
		var angstrom = 0.009;
		
		var initialZ = -FOCALPOINT_DISTANCE;
		
		var numMolecules = 0;
		
		var ourPDBLoader = new THREE.PDBLoader();
		ourPDBLoader.load( "data/" + id + ".pdb", //if you get errors about origin you may need to refresh the server
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
//				model.geometry.applyMatrix( new THREE.Matrix4().setPosition( centeringVector ) );
				model.geometry.applyMatrix(new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom));
				model.geometry.computeBoundingSphere();
				
				for(var i = 0; i < numMolecules; i++)
				{
					//aka object construction
					var newModel = new THREE.Mesh(model.geometry.clone(), model.material.clone());
					newModel.updateBoundingSphere = updateBoundingSphere;
					newModel.pointInBoundingSphere = pointInBoundingSphere;
					
					newModel.position.x = (-1-i) * angstrom * 24;
					newModel.position.z = initialZ;
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
		ourOBJLoader.load( "data/" + id + ".obj",
			function ( object ) 
			{
				var map = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x888888}));
				map.geometry.addAttribute('position', new THREE.BufferAttribute( geometryToLineCoordinates( object.children[0].geometry ), 3) );
				map.geometry.applyMatrix( new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom) );
				
				for(var i = 0; i < numMolecules; i++)
				{
					maps.push( map.clone() );
					scene.add( maps[i] );
					maps[i].position.x = i * angstrom * 24;
					maps[i].position.z = initialZ;
					
					maps[i].updateBoundingSphere = updateBoundingSphere;
					maps[i].pointInBoundingSphere = pointInBoundingSphere;
				}
			},
			function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } 
		);
	}
	
	for(var i = 0; i < models.length; i++)
		models[i].position.z = -5;
	for(var i = 0; i < maps.length; i++)
		maps[i].position.z = -5;
	
	document.addEventListener( 'keydown', function(event)
	{
		if(event.keyCode === 190 && WEBVR.isAvailable() === true)
		{
			event.preventDefault();
			ourVRControls.vrInputs[0].requestPresent([{ source: renderer.domElement }])
			ourVREffect.setFullScreen( true );
		}
	}, false );
	
	socket = initSocket();
	
	socket.messageResponses["mousePosition"] = function(messageContents)
	{
	}
	
	socket.messageResponses["lmb"] = function(messageContents)
	{
	}
	
	socket.onopen = function()
	{
		desktopLoop( socket, controllers, models, maps );
	}
}