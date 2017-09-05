/*
 * People should be able to grab you in coot and move you towards a part of the molecule. But that actually moves that part of the molecule closer to you on the client, muhahaha
 * Seeing your partner's cursor... it's a disembodied object... you could do it as a ray but better would be if it went to whichever atom it was on.
 * 	And it is attached to the camera or whatever representing their head. So you can grab their camera and move it so that their cursor overlaps the right thing
 * 
 * Cryo EM - never refine map
 * 
 * ~40 molecules you want to get
 * 
 * Interesting: an atom doesn't have an orientation... if the daydream controller was some screw-like thing you could use it to put an atom anywhere in space
 * 
 * representation of hydrogen is overwhealming
 * 
 * Refine, minimize, optimize
 * 
 * Fundamentally: add, delete, move. Move
 * 	Rigid body refinement
 * 
 * It's like a fishing rod. If you can become proficient with that then why not this...
 * 
 * Contra your doubters, refining a tool for human use is worthwhile
 * 
 * There's a cognitive barrier and various decisions to be made about "interactivity"
 * One definition of interactivity is "things respond in 0.7 seconds". https://www.nczonline.net/blog/2009/08/11/timed-array-processing-in-javascript/ - 0.1
 * Recontouring is perceived as interactive in most situations and should be kept as such.
 * "interactive" because of its link to "fast" is objectively better, but it also helps in a deeper way. Everything should be kept as such
 * You do as much as you can on the client. Fortunately nobody expects refinement to be interactive, but it'd be nice if it could be
 */

/*
 * Re how to store the model
		Can't change this directly to indices because of midpoints
		On the other hand, it would be nice to know which bonds are associated with which atoms, so that we can move them around!
		When you change a geometry, does the whole thing have to be resubmitted to the graphics card?
			Good idea: make the atoms disappear from the actual mesh (by setting the vertices all to one pt) and make some new ones appear in a separate object
			Yeah it probably does.
			
	 * Big deal: to have a tree, with separate objects, or to have "intermediates"? Well, it's not the tree, that has been decided by the format, there is a serious disadvantage to having to process that data into a hierarchy
	 * 
	 * The way coot works is that you have these intermediates that are called into existence
	 * 
	 * Paul: "you have to decide whether to wag the tail or the dog". This is a major part of model building
	 * 		It is fine for things to become detatched from the "next" amino acid. So, until we hear otherwise, "intermediates" seem like the right decision!
	 * 		Working out phipsi is easier
	 * 		How does coot do it?
				However, you probably don't want to worry about the effect rippling up
				Sad: we could try to do it ourselves but that would probably create reproduction issues
			The argument in favour of atom parenting *would* be that it's terribly easy to change everything "beyond" a modified AA with one transformation (of its matrix)
				But that's a bad argument because at least a few things above will be transformed god-knows-how. Yeah a bunch of it will end up being a matrix but still. Is Paul aware of this?
			Look, it's about transformations. Yeah, you can manipulate things directly through vertices, but you'll want to use transformations applied to the whole lot. You already have some of these!

		Shader idea:
			Note the number of atoms and bonds you need can change, maybe undermining shader
			Ohhh, could group according to color? But in the case of sphere refine you'd be updating many colors.
			One instinct: surely multiplying by modelViewMatrix is something, right? If you shift all the atom positions into a separate thing in the shader, you're kinda doing something already handled by that?
			Either way, we are going to have a single object3D with all that data, can get to work on that.
	 */

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
	var initialZ = -FOCALPOINT_DISTANCE;
	
	new THREE.FileLoader().load( "data/try-2-map-fragment.tab.txt",
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
			var parseTarget = scalarFieldFile.replace(/\s+/g,",");
			var mapData = 
			{
				array: new Float32Array( JSON.parse("[" + parseTarget.substr(1,parseTarget.length-2) + "]") ),  //substring to remove start and end commas. -2 instead of -1 because javascript
				sizeX: 53,
				sizeY: 53,
				sizeZ: 53,
				gridSamplingX:168,
				gridSamplingY:200,
				gridSamplingZ:100,
				cellDimensionX: 64.897,
				cellDimensionY: 78.323,
				cellDimensionZ: 38.792,
				startingX: -10,
				startingY: 125,
				startingZ: 4,
				meanDensity: 0,
				maxDensity: 2.13897
				/* Map mode ........................................    2
		           Start and stop points on columns, rows, sections    33   51   48   66   46   62
		           Grid sampling on x, y, z ........................  256  256  360
		           Cell dimensions .................................  142.2 142.2 200.41 90.0 90.0 120.0
		           Fast, medium, slow axes .........................    Y    X    Z
		           Space-group .....................................    1
		           
		           scalarField: 19,19,17
		           scalarFieldLarge: 103,101,26
		           
		           Number of columns, rows, sections ...............   53 53   53
		           Start and stop points on columns, rows, sections   -10 42  125  177    4   56
		           Grid sampling on x, y, z ........................  168 200  100
		           Cell dimensions ................................. 64.8970    78.3230    38.7920    90.0000    90.0000    90.0000
		           58, 6, 11
		           
		           "the thing to add to uvw is 125,-10,4
		           uvw=0,0,0
				 */
			}
			if( mapData.array.length !== mapData.sizeX*mapData.sizeY*mapData.sizeZ )
				console.error("you may need to change map metadata")
			
			ourclock.getDelta();
			var map = cubeMarchingSystem.createMesh(mapData);
			console.log( "Contouring took ", ourclock.getDelta())
			scene.add( map );
			map.position.z = initialZ;
			map.updateBoundingSphere = updateBoundingSphere;
			map.pointInBoundingSphere = pointInBoundingSphere;
			
			map.matrixAutoUpdate = false;
			map.matrix.makeBasis(yAxis.clone().multiplyScalar(angstrom),xAxis.clone().multiplyScalar(angstrom),zAxis.clone().multiplyScalar(-angstrom))
			
			maps.push( map );
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load PDB" ); }
	);
	
	new THREE.FileLoader().load( "data/tutorial-model-with-ligand.lst.txt",
		function ( modelStringCoot )
		{
			var model = new THREE.Object3D();
		
			var modelStringTranslated = "";
			for( var i = 0, il = modelStringCoot.length; i < il; i++ )
			{
				if( modelStringCoot[i] === '[' )
					{}
				else if( modelStringCoot[i] === ']' )
					{}
				else if( modelStringCoot[i] === '(' )
					modelStringTranslated += '[';
				else if( modelStringCoot[i] === ')' )
					modelStringTranslated += ']';
				else if( modelStringCoot[i] === 'F' && modelStringCoot[i+1] === 'a' ) //because of False/false
					modelStringTranslated += 'f';
				else if( modelStringCoot[i] === 'T' && modelStringCoot[i+1] === 'r' )
					modelStringTranslated += 't';
				else
					modelStringTranslated += modelStringCoot[i];
			}
		
			var cootArray = eval(modelStringTranslated)
			
			model.atoms = cootArray[0];
			model.cylinderEnds = cootArray[1];
			model.atomsBondsMesh = new THREE.Mesh(new THREE.Geometry(),new THREE.MeshPhongMaterial( {vertexColors: THREE.FaceColors} ) )
			model.add( model.atomsBondsMesh );
			
			model.updateAtomsBondsMesh = updateAtomsBondsMesh;
			model.updateAtomsBondsMesh();
			
			model.atomsBondsMesh.geometry.applyMatrix(new THREE.Matrix4().makeScale(angstrom,angstrom,angstrom));
			model.atomsBondsMesh.geometry.computeBoundingSphere();
			model.atomsBondsMesh.position.copy(model.atomsBondsMesh.geometry.boundingSphere.center).negate();
			model.atomsBondsMesh.updateBoundingSphere = updateBoundingSphere;
			model.atomsBondsMesh.pointInBoundingSphere = pointInBoundingSphere;
			
			model.position.z = initialZ;
			model.position.x = 0;
			scene.add( model );
			models.push( model );
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load PDB" ); }
	);
}

//Baked into the geometry: a length of 1, with the correct radius.
function cylinderMatrix(endAt)
{
	var x = randomPerpVector(endAt);
	var y = endAt.clone();
	var z = new THREE.Vector3().crossVectors(x,y);
	
	x.normalize();
	z.normalize();
	
	return new THREE.Matrix4().makeBasis( x,y,z );
}

function toggleLabel(atomIndex)
{
	if( this.atoms[atomIndex].label === undefined)
	{
		this.atoms[atomIndex].label = new THREE.Mesh(
			new THREE.TextGeometry( this.atoms[atomIndex][2], {size: 0.1, height: signsize / 10, font: THREE.defaultFont }),
			new THREE.MeshPhongMaterial( {
				color: 0x156289,
				shading: THREE.FlatShading
			}) );
		
		this.atoms[atomIndex].add( this.atoms[atomIndex].label );
		
		return;
	}
	else
	{
		if( this.atoms[atomIndex].label.visible )
			this.atoms[atomIndex].label.visible = false;
		else
			this.atoms[atomIndex].label.visible = true;
	}
}

function updateAtomsBondsMesh()
{
	var defaultBondRadius = 0.05;
	
	var cylinderSides = 15;

	var numberOfCylindersDesired = 0;
	var numberOfSpheresDesired = 0;
	for(var i = 0, il = this.cylinderEnds.length; i < il; i++ )
		numberOfCylindersDesired += this.cylinderEnds[i].length;
	for(var i = 0, il = this.atoms.length; i < il; i++ )
		numberOfSpheresDesired += this.atoms[i].length;
	
	var templateSphereGeometry = new THREE.EfficientSphereGeometry(defaultBondRadius * 4);
	var nSphereVertices = templateSphereGeometry.vertices.length;
	var nSphereFaces = templateSphereGeometry.faces.length;
	
	this.atomsBondsMesh.geometry.vertices = Array(cylinderSides * numberOfCylindersDesired * 2 + numberOfSpheresDesired * nSphereVertices );
	this.atomsBondsMesh.geometry.faces	= Array(cylinderSides * numberOfCylindersDesired * 2 + numberOfSpheresDesired * nSphereFaces );
	
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
	var firstFaceIndex = 0;
	for(var i = 0, il = this.atoms.length; i < il; i++ )
	{
		for(var j = 0, jl = this.atoms[i].length; j < jl; j++)
		{
			if(this.atoms[i][j][1])
				continue;
			for(var k = 0; k < nSphereVertices; k++)
			{
				this.atomsBondsMesh.geometry.vertices[firstVertexIndex + k] = templateSphereGeometry.vertices[k].clone();
				this.atomsBondsMesh.geometry.vertices[firstVertexIndex + k].addArray(this.atoms[i][j][0]);
			}
			for(var k = 0; k < nSphereFaces; k++)
			{
				this.atomsBondsMesh.geometry.faces[firstFaceIndex + k] = templateSphereGeometry.faces[k].clone();
				this.atomsBondsMesh.geometry.faces[firstFaceIndex + k].a += firstVertexIndex;
				this.atomsBondsMesh.geometry.faces[firstFaceIndex + k].b += firstVertexIndex;
				this.atomsBondsMesh.geometry.faces[firstFaceIndex + k].c += firstVertexIndex;
				this.atomsBondsMesh.geometry.faces[firstFaceIndex + k].color = cootBondColors[i];
			}

			firstVertexIndex += nSphereVertices;
			firstFaceIndex += nSphereFaces;
		}
	}
	for(var i = 0, il = this.cylinderEnds.length; i < il; i++ )
	{
		for(var j = 0, jl = this.cylinderEnds[i].length; j < jl; j++)
		{
			for(var k = 0; k < cylinderSides; k++)
			{
				this.atomsBondsMesh.geometry.vertices[firstVertexIndex+k*2  ] = new THREE.Vector3();
				this.atomsBondsMesh.geometry.vertices[firstVertexIndex+k*2+1] = new THREE.Vector3();
				
				this.atomsBondsMesh.geometry.faces[firstFaceIndex+k*2 ] = new THREE.Face3(
					firstVertexIndex +  k*2+1,
					firstVertexIndex +  k*2+0,
					firstVertexIndex + (k*2+2) % (cylinderSides*2),
					false, cootBondColors[i] );
				
				this.atomsBondsMesh.geometry.faces[firstFaceIndex+k*2+1 ] = new THREE.Face3(
					firstVertexIndex +  k*2+1,
					firstVertexIndex + (k*2+2) % (cylinderSides*2),
					firstVertexIndex + (k*2+3) % (cylinderSides*2),
					false, cootBondColors[i] );
			}
			
			cylinderBeginning.fromArray( this.cylinderEnds[i][j][0] );
			cylinderEnd.fromArray( this.cylinderEnds[i][j][1] );
			
			if(i===5)
				insertCylinderCoordinates( cylinderBeginning, cylinderEnd, this.atomsBondsMesh.geometry.vertices, cylinderSides, firstVertexIndex, defaultBondRadius / 2 );
			else	
				insertCylinderCoordinates( cylinderBeginning, cylinderEnd, this.atomsBondsMesh.geometry.vertices, cylinderSides, firstVertexIndex, defaultBondRadius );
			
			firstVertexIndex += cylinderSides * 2;
			firstFaceIndex += cylinderSides * 2;
		}
	}
	console.log(firstVertexIndex, this.atomsBondsMesh.geometry.vertices.length)
	for(var i = firstVertexIndex, il = this.atomsBondsMesh.geometry.vertices.length; i < il; i++)
		this.atomsBondsMesh.geometry.vertices[i] = new THREE.Vector3();
	for(var i = firstFaceIndex, il = this.atomsBondsMesh.geometry.faces.length; i < il; i++)
		this.atomsBondsMesh.geometry.faces[i] = new THREE.Face3(firstVertexIndex,firstVertexIndex-1,firstVertexIndex-2);
	
	this.atomsBondsMesh.geometry.computeFaceNormals();
	this.atomsBondsMesh.geometry.computeVertexNormals();
}

function createCootModelFromElementsPositionsBondIndices(atomElements,atomPositions,bondIndices)
{
	/*
	 * We assume you get:
	 * string of atom element letters
	 * array of positions
	 * array of bonds (atom indices)
	 */
	
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
		
		insertCylinderCoordinates(aPosition, midPoint, finalMesh.geometry.vertices, cylinderSides, cylinderSides * 2 * (i * 2), aPosition.distanceTo(midPoint) / 12 );
		insertCylinderCoordinates(midPoint, bPosition, finalMesh.geometry.vertices, cylinderSides, cylinderSides * 2 * (i*2+1), bPosition.distanceTo(midPoint) / 12 );
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
	var perpVector = new THREE.Vector3();
	
	if( OurVector.equals(zAxis))
		perpVector.crossVectors(OurVector, yAxis);
	else
		perpVector.crossVectors(OurVector, zAxis);
	
	return perpVector;
}

function insertCylinderCoordinates(A,B, verticesArray, cylinderSides, arrayStartpoint, radius ) {
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