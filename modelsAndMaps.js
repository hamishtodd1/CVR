function pointInBoundingSphere( point )
{
	var localPosition = point.clone();
	this.updateMatrixWorld();
	this.worldToLocal(localPosition);
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



function initModelsAndMaps()
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
	
	var initialZ = -FOCALPOINT_DISTANCE;
	
	var numMolecules = 2;
	
	new THREE.PDBLoader().load( "data/" + id + ".pdb", //if you get errors about origin you may need to refresh the server
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
//			model.geometry.applyMatrix( new THREE.Matrix4().setPosition( centeringVector ) );
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
	
	new THREE.OBJLoader().load( "data/" + id + ".obj",
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
	
	return { ma: maps, mo: models };
}

function createClassicCootModel(atomElements,atomPositions,bondIndices)
{
	var cylinderSides = 15;

	var finalMesh = new THREE.Mesh(new THREE.Geometry(), new THREE.MeshPhongMaterial( {vertexColors: THREE.FaceColors} ) )
	var numberOfCylindersDesired = bondIndices.length;
	
	finalMesh.geometry.vertices = Array(cylinderSides * numberOfCylindersDesired * 2);
	finalMesh.geometry.faces	= Array(cylinderSides * numberOfCylindersDesired * 2);
	
	for(var j = 0; j < numberOfCylindersDesired; j++)
	{
		var firstVertexIndex = j * cylinderSides * 2;
		for(var i = 0; i < cylinderSides; i++)
		{
			finalMesh.geometry.vertices[firstVertexIndex+i*2  ] = new THREE.Vector3();
			finalMesh.geometry.vertices[firstVertexIndex+i*2+1] = new THREE.Vector3();
			
			finalMesh.geometry.faces[firstVertexIndex+i*2 ] = new THREE.Face3(
				firstVertexIndex + i*2+1,
				firstVertexIndex + i*2+0,
				firstVertexIndex + (i*2+2) % (cylinderSides*2) );
			finalMesh.geometry.faces[firstVertexIndex+i*2 ].color.setHex( atomColor( atomElements[ bondIndices[j] ] ) );
			
			finalMesh.geometry.faces[firstVertexIndex+i*2+1 ] = new THREE.Face3(
				firstVertexIndex + i*2+1,
				firstVertexIndex + (i*2+2) % (cylinderSides*2),
				firstVertexIndex + (i*2+3) % (cylinderSides*2) );
			finalMesh.geometry.faces[firstVertexIndex+i*2+1].color.setHex(atomColor( atomElements[ bondIndices[j] ] ) );
		}
	}
	for(var i = 0, il = bondIndices.length / 2; i < il; i++)
	{
		var aIndex = bondIndices[i*2+0];
		var bIndex = bondIndices[i*2+1];
		var aPosition = new THREE.Vector3(atomPositions[aIndex*3+0],atomPositions[aIndex*3+1],atomPositions[aIndex*3+2]);
		var bPosition = new THREE.Vector3(atomPositions[bIndex*3+0],atomPositions[bIndex*3+1],atomPositions[bIndex*3+2]);
		var midPoint = aPosition.clone();
		midPoint.lerp(bPosition, 0.5);
		
		insertCylindernumbers(aPosition, midPoint, finalMesh.geometry.vertices, cylinderSides, cylinderSides * 2 * (i * 2), aPosition.distanceTo(midPoint) / 12 );
		insertCylindernumbers(midPoint, bPosition, finalMesh.geometry.vertices, cylinderSides, cylinderSides * 2 * (i*2+1), bPosition.distanceTo(midPoint) / 12 );
	}
	finalMesh.geometry.computeFaceNormals();
	finalMesh.geometry.computeVertexNormals();
	
	return finalMesh;
}

function atomColor(element)
{
	switch(element){
		case "C": return 0xC8C8C8; break;
		case "O": return 0xF00000; break;
		case "H": return 0xFFFFFF; break;
		case "N": return 0x8F8FFF; break;
		case "S": return 0xFFC832; break;
		case "P": return 0xFFA500; break;
		default: return 0xFF1493;
	}
}

function randomPerpVector(OurVector){
	var PerpVector = new THREE.Vector3();
	
	if( OurVector.equals(zAxis))
		PerpVector.crossVectors(OurVector, yAxis);
	else
		PerpVector.crossVectors(OurVector, zAxis);
	
	return PerpVector;
}

function insertCylindernumbers(A,B, verticesArray, cylinderSides, arrayStartpoint, radius ) {
	var aToB = new THREE.Vector3(B.x-A.x, B.y-A.y, B.z-A.z);
	aToB.normalize();
	var perp = randomPerpVector(aToB);
	perp.normalize(); 
	for( var i = 0; i < cylinderSides; i++)
	{
		var radiuscomponent = perp.clone();
		radiuscomponent.multiplyScalar(radius);
		radiuscomponent.applyAxisAngle(aToB, i * TAU / cylinderSides);
		
		verticesArray[arrayStartpoint + i*2 ].copy(radiuscomponent);
		verticesArray[arrayStartpoint + i*2 ].add(A);
		
		verticesArray[arrayStartpoint + i*2+1 ].copy(radiuscomponent);
		verticesArray[arrayStartpoint + i*2+1 ].add(B);
	}
}

function geometryToLineCoordinates(myGeometry)
{
	if( myGeometry.isBufferGeometry )
	{
		if( myGeometry.index !== null )
		{
			var finalMeshNumbers = new Float32Array( myGeometry.index.array.length * 18 / 3 );
			for(var i = 0, il = myGeometry.index.array.length / 3; i < il; i++)
				for(var j = 0; j < 3; j++)//sides
					for(var k = 0; k < 2; k++)//side ends
					{
						var vertexIndex = myGeometry.index.array[ i * 3 + ( j + k ) % 3 ];
						for(var l = 0; l < 3; l++) //coordinates
							finalMeshNumbers[ i * 18 + j * 6 + k * 3 + l ] = 
								myGeometry.attributes.position.array[ vertexIndex * 3 + l ];
					}
		}
		else
		{
			var finalMeshNumbers = new Float32Array( myGeometry.attributes.position.array.length * 2 );
			for(var i = 0, il = myGeometry.attributes.position.array.length / 9; i < il; i++) //triangles
				for(var j = 0; j < 3; j++)//sides
					for(var k = 0; k < 2; k++)//side ends
					{
						for(var l = 0; l < 3; l++) //coordinates
							finalMeshNumbers[ i * 18 + j * 6 + k * 3 + l ] = 
								myGeometry.attributes.position.array[ i * 9 + ( ( j + k ) % 3 ) * 3  + l ];
					}
		}
	}
	else
	{
		var finalMeshNumbers = new Float32Array( myGeometry.faces.length * 18 );
		var abc = ["a","b","c"];
		for(var i = 0, il = myGeometry.faces.length; i < il; i++)
			for(var j = 0; j < 3; j++)//sides
				for(var k = 0; k < 2; k++)//side ends
				{
					var vertexIndex = myGeometry.faces[i][abc[ ( j + k ) % 3 ] ];
					for(var l = 0; l < 3; l++) //coordinates
						finalMeshNumbers[ i * 18 + j * 6 + k * 3 + l ] = 
							myGeometry.vertices[ vertexIndex ].getComponent(l);
				}
	}
	
	return finalMeshNumbers;
}