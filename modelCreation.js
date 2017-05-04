function createClassicCootModel(atomElements,atomPositions,bondIndices)
{
	var cylinderSides = 15;

	var finalMesh = new THREE.Mesh(new THREE.Geometry(), new THREE.MeshPhongMaterial( {vertexColors: THREE.FaceColors} ) )
	var cylindersDesired = bondIndices.length;
	
	finalMesh.geometry.vertices = Array(cylinderSides * cylindersDesired * 2);
	finalMesh.geometry.faces	= Array(cylinderSides * cylindersDesired * 2);
	
	for(var j = 0; j < cylindersDesired; j++)
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

function meshToLineCoordinates(myGeometry)
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