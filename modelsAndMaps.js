function initMapsAndModels()
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
		//update the appearance of the bounding sphere TODO including position
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
	
	return { ma: maps, mo: models };
}