function desktopInitialize()
{
	window.addEventListener( 'resize', function(){
		console.log("resizing")
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	ourVREffect = new THREE.VREffect( renderer );
//	console.log(webgl.getParameter(webgl.MAX_TEXTURE_SIZE))
	
	var controllers = Array(2);
	var VRInputSystem = initVRInputSystem(controllers);
	
	makeStandardScene(true);
	
	{
		/*
		 * We assume you get:
		 * string of atom element letters
		 * array of positions
		 * array of bonds (atom indices)
		 * 
		 * be sure to adopt his naming conventions
		 * 
		 * get rid of the below
		 */
		
		var models = Array();
		var maps = Array();
		
		var id = "1l2y"; //3NIR is another small one
		var angstrom = 0.009;
		
		var initialZ = -FOCALPOINT_DISTANCE;
		
		var numMolecules = 2;
		
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
		if(event.keyCode === 190 && ( navigator.getVRDisplays !== undefined || navigator.getVRDevices !== undefined ) )
		{
			event.preventDefault();
			VRInputSystem.startGettingInput();
			ourVREffect.setFullScreen( true );
		}
	}, false );
	
	//socket
	{
		socket = initSocket(maps);
		
		socket.messageResponses["mousePosition"] = function(messageContents)
		{
		}
		
		socket.messageResponses["lmb"] = function(messageContents)
		{
		}
		
		socket.onopen = function()
		{
			desktopLoop( socket, controllers, VRInputSystem, models, maps );
		}
	}
}