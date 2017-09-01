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

function initModelsAndMaps(models, maps)
{
	/*
	 * We assume you get:
	 * string of atom element letters
	 * array of positions
	 * array of bonds (atom indices)
	 * 
	 * be sure to adopt his naming conventions
	 */
	
	var id = "1l2y"; //3NIR is another small one
	
	var initialZ = -FOCALPOINT_DISTANCE;
	
	var numMolecules = 2;
	
//	new THREE.PDBLoader().load( "data/" + id + ".pdb", //if you get errors about origin you may need to refresh the server
//		function ( geometryAtoms, geometryBonds ) {
//			var atomElements = "HOH";
//			var bondIndices = [];
//			var atomPositions = geometryAtoms.attributes.position.array;
//			var distVector = new THREE.Vector3();
//			for(var i = 0, il = atomPositions.length / 3; i < il; i++)
//			{
//				for(var j = 1; j < 20; j++)
//				{
//					if( i + j >= il )
//						break;
//					distVector.set(
//							atomPositions[i*3+0] - atomPositions[(i+j)*3+0],
//							atomPositions[i*3+1] - atomPositions[(i+j)*3+1],
//							atomPositions[i*3+2] - atomPositions[(i+j)*3+2]);
//					if(distVector.length() < 2)
//						bondIndices.push(i,i+j);
//				}
//			}
//			var model = createCootModelFromElementsPositionsBondIndices( geometryAtoms.elements, atomPositions,bondIndices);
////			model.geometry.applyMatrix( new THREE.Matrix4().setPosition( centeringVector ) );
//			model.geometry.applyMatrix(new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom));
//			model.geometry.computeBoundingSphere();
//			
//			for(var i = 0; i < numMolecules; i++)
//			{
//				//aka object construction
//				var newModel = new THREE.Mesh(model.geometry.clone(), model.material.clone());
//				newModel.updateBoundingSphere = updateBoundingSphere;
//				newModel.pointInBoundingSphere = pointInBoundingSphere;
//				
//				newModel.position.x = (-1-i) * angstrom * 24;
//				newModel.position.z = initialZ;
//				newModel.quaternion.set(Math.random(),Math.random(),Math.random(),Math.random());
//				newModel.quaternion.normalize();
//				
//				scene.add( newModel );
//				models.push( newModel );
//			}
//		},
//		function ( xhr ) {}, //progression function
//		function ( xhr ) { console.error( "couldn't load PDB" ); }
//	);
	
	new THREE.FileLoader().load( "data/bonds_rep.txt", //if you get errors about origin you may need to refresh the server
		function ( file0 ) {
			var file1 = file0.replace(/\(/g, "[");
			var file2 = file1.replace(/\)/g, "]");
			
			//we have the molecule be an object within an object because its origin might be somewhere bonkers far away from its center and we don't want to mess with values
			var model = new THREE.Object3D();
			model.importantObject = moleculeFromCootArray( eval(file2) )
			model.add(model.importantObject);
			
			model.importantObject.geometry.applyMatrix(new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom));
			model.importantObject.geometry.computeBoundingSphere();
			model.importantObject.position.copy(model.importantObject.geometry.boundingSphere.center).negate();
			//what are they called on?
			model.importantObject.updateBoundingSphere = updateBoundingSphere;
			model.importantObject.pointInBoundingSphere = pointInBoundingSphere;
			
			model.position.z = initialZ / 8;
			model.position.x = 0;
//			model.visible = false;
			scene.add( model );
			models.push( model );
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load PDB" ); }
	);
	
	new THREE.FileLoader().load( "data/tutorial-map-fragment.tab.txt",
		function ( scalarFieldFile )
		{
			/*
			 * Kinda feels like this one has some shader stuff https://webglsamples.org/blob/blob.html
			 * Didn't volume ray casting allow you to render a surface without actually making the mesh? Wasn't that Dan's thing?
			 * 		One way of doing that: all voxels inside surface have opacity 1, outside 0. But if we're getting an odd numbered pixel then it's all opacity 0
			 * 		First try to do just that cross hatching, red and blue, so you know how to do fragment shaders
			 * 		Likely a terrible idea, you can't get your molecules in it
			 * Major problem that geometry shaders don't exist in webgl
			 * This one has workers and is threejs but is from 2009 http://philogb.github.io/blog/2010/12/10/animating-isosurfaces-with-webgl-and-workers/#result
			 * 
			 */
//			WireframeGeometry
			var parseTarget = scalarFieldFile.replace(/\s+/g,",");
			var mapData = 
			{
				array: new Float32Array( JSON.parse("[" + parseTarget.substr(1,parseTarget.length-2) + "]") ),  //substring to remove start and end commas. -2 instead of -1 because javascript
				sizeX: 103,
				sizeY: 101,
				sizeZ: 26,
				meanDensity: -0.02189,
				maxDensity: 2.13897
				/* Map mode ........................................    2
		           Start and stop points on columns, rows, sections    33   51   48   66   46   62
		           Grid sampling on x, y, z ........................  256  256  360
		           Cell dimensions .................................  142.2 142.2 200.41 90.0 90.0 120.0
		           Fast, medium, slow axes .........................    Y    X    Z
		           Space-group .....................................    1
		           
		           scalarField: 19,19,17
		           scalarFieldLarge: 103,101,26
		           
				 */
			}
			console.log(mapData.array.length, mapData.sizeX*mapData.sizeY*mapData.sizeZ)
			
			delta_t = ourclock.getDelta();
			var map = stemkoskiMarchingCubes(mapData);
			console.log( "Contouring took ", ourclock.getDelta())
			scene.add( map );
			map.position.z = initialZ;
			map.updateBoundingSphere = updateBoundingSphere;
			map.pointInBoundingSphere = pointInBoundingSphere;
			
			maps.push( map );
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load PDB" ); }
	);
	
	new THREE.FileLoader().load( "data/tutorial-model-with-ligand.lst.txt",
		function ( modelFile )
		{
//			for( var i = 0, il = modelFile.length; i < il; i++ )
//			{
//				if( modelFile[i] === '['
//			}
		
			console.log(modelFile)
			
			//we have the molecule be an object within an object because its origin might be somewhere bonkers far away from its center and we don't want to mess with values
//			var model = new THREE.Object3D();
//			model.importantObject = moleculeFromCootArray( eval(file2) )
//			model.add(model.importantObject);
//			
//			model.importantObject.geometry.applyMatrix(new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom));
//			model.importantObject.geometry.computeBoundingSphere();
//			model.importantObject.position.copy(model.importantObject.geometry.boundingSphere.center).negate();
//			//what are they called on?
//			model.importantObject.updateBoundingSphere = updateBoundingSphere;
//			model.importantObject.pointInBoundingSphere = pointInBoundingSphere;
//			
//			model.position.z = initialZ / 8;
//			model.position.x = 0;
//	//		model.visible = false;
//			scene.add( model );
//			models.push( model );
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load PDB" ); }
	);
	
//	new THREE.OBJLoader().load( "data/" + id + ".obj",
//		function ( object ) 
//		{
//			var map = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x888888}));
//			map.geometry.addAttribute('position', new THREE.BufferAttribute( geometryToLineCoordinates( object.children[0].geometry ), 3) );
//			map.geometry.applyMatrix( new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom) );
//			
//			for(var i = 0; i < numMolecules; i++)
//			{
//				maps.push( map.clone() );
//				scene.add( maps[i] );
//				maps[i].position.x = i * angstrom * 24;
//				maps[i].position.z = initialZ;
//				
//				maps[i].updateBoundingSphere = updateBoundingSphere;
//				maps[i].pointInBoundingSphere = pointInBoundingSphere;
//			}
//		},
//		function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } 
//	);
}

//the structure of this is something for the thesis: do people think about atoms, or about bonds?
function moleculeFromCootArray(masterArray)
{
//	var masterArray = [
//	               	[ //color 1
//						[ [0,0,0],[1,1,1] ], //cylinder 1a
//						[ [2,2,2],[3,3,3] ] //cylinder 1b
//	               	 ],
//	               	[ //color 2
//						[ [4,4,4],[5,5,5] ] //cylinder 2a
//	               	 ],
//	               ];
	
	var cylinderSides = 15;

	var finalMesh = new THREE.Mesh(new THREE.Geometry(), new THREE.MeshPhongMaterial( {vertexColors: THREE.FaceColors} ) )
	var numberOfCylindersDesired = 0;
	for(var i = 0, il = masterArray.length; i < il; i++ )
		numberOfCylindersDesired += masterArray[i].length;
	
	finalMesh.geometry.vertices = Array(cylinderSides * numberOfCylindersDesired * 2);
	finalMesh.geometry.faces	= Array(cylinderSides * numberOfCylindersDesired * 2);
	
	var cootBondColors = [
	                      new THREE.Color(0.2,0.2,0.2),
	                      new THREE.Color(0.8,0.8,0.2),
	                      new THREE.Color(0.8,0.2,0.2),
	                      new THREE.Color(0.2,0.4,0.8),
	                      
	                      new THREE.Color(0.8,0.8,0.8),
	                      new THREE.Color(0.8,0.8,0.8),
	                      new THREE.Color(0.8,0.8,0.8),
	                      new THREE.Color(0.8,0.8,0.8),
	                      new THREE.Color(0.8,0.8,0.8),
	                      new THREE.Color(0.8,0.8,0.8),
	                      ];
	
	
	var cylinderBeginning = new THREE.Vector3();
	var cylinderEnd = new THREE.Vector3();
	var firstVertexIndex = 0;
	var defaultBondRadius = 0.05;
	for(var i = 0, il = masterArray.length; i < il; i++ )
	{
		for(var j = 0, jl = masterArray[i].length; j < jl; j++)
		{
			for(var k = 0; k < cylinderSides; k++)
			{
				finalMesh.geometry.vertices[firstVertexIndex+k*2  ] = new THREE.Vector3();
				finalMesh.geometry.vertices[firstVertexIndex+k*2+1] = new THREE.Vector3();
				
				finalMesh.geometry.faces[firstVertexIndex+k*2 ] = new THREE.Face3(
					firstVertexIndex +  k*2+1,
					firstVertexIndex +  k*2+0,
					firstVertexIndex + (k*2+2) % (cylinderSides*2) );
				finalMesh.geometry.faces[firstVertexIndex+k*2 ].color.copy( cootBondColors[i] );
				
				finalMesh.geometry.faces[firstVertexIndex+k*2+1 ] = new THREE.Face3(
					firstVertexIndex +  k*2+1,
					firstVertexIndex + (k*2+2) % (cylinderSides*2),
					firstVertexIndex + (k*2+3) % (cylinderSides*2) );
				finalMesh.geometry.faces[firstVertexIndex+k*2+1].color.copy( cootBondColors[i] );
			}
			
			cylinderBeginning.fromArray( masterArray[i][j][0] );
			cylinderEnd.fromArray( masterArray[i][j][1] );
			
			if(i===5)
				insertCylindernumbers( cylinderBeginning, cylinderEnd, finalMesh.geometry.vertices, cylinderSides, firstVertexIndex, defaultBondRadius / 2 );
			else	
				insertCylindernumbers( cylinderBeginning, cylinderEnd, finalMesh.geometry.vertices, cylinderSides, firstVertexIndex, defaultBondRadius );
			
			firstVertexIndex += cylinderSides * 2;
		}
	}
	
	finalMesh.geometry.computeFaceNormals();
	finalMesh.geometry.computeVertexNormals();
	
	return finalMesh;
}

function createCootModelFromElementsPositionsBondIndices(atomElements,atomPositions,bondIndices)
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