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
 * Contra your doubters, refining a tool for human use is worthwhile. Compute time is incredibly cheap - buying server time is so-and-so/GHz. But human time is blah
 * 
 * There's a cognitive barrier and various decisions to be made about "interactivity"
 * One definition of interactivity is "things respond in 0.7 seconds". https://www.nczonline.net/blog/2009/08/11/timed-array-processing-in-javascript/ - 0.1
 * Recontouring is perceived as interactive in most situations and should be kept as such.
 * "interactive" because of its link to "fast" is objectively better, but it also helps in a deeper way. Everything should be kept as such
 * You do as much as you can on the client. Fortunately nobody expects refinement to be interactive, but it'd be nice if it could be
 */

/*
 * Re how to store the model
	When you change a geometry, does the whole thing have to be resubmitted to the graphics card? Yeah it probably does.
		Good idea: make the atoms disappear from the actual mesh (by setting the vertices all to one pt) and make some new ones appear in a separate object
		
	It's fine if there's a delay when you grab something while the "move these vertices" message is submitted to the graphics card", just so long as there isn't one while you're moving
		
 * 
 * 
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
	if( localPosition.distanceTo( this.boundingSphere.center) < this.boundingSphere.radius )
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

function initModelsAndMaps(models, maps, labels)
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
			
			ourClock.getDelta();
			var cubeMarchingSystem = CubeMarchingSystem();
			var map = cubeMarchingSystem.createMesh(mapData);
			console.log( "Contouring took ", ourClock.getDelta())
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
	
	var atomMaterials = Array(10);
	for(var i = 0; i < atomMaterials.length; i++)
		atomMaterials[i] = new THREE.MeshPhongMaterial( {color:0x0C0C0C} );
	atomMaterials[0].color.setRGB(0.2,0.2,0.2);
	atomMaterials[1].color.setRGB(0.8,0.8,0.2);
	atomMaterials[2].color.setRGB(0.8,0.2,0.2);
	atomMaterials[3].color.setRGB(0.2,0.4,0.8);
	
	var defaultBondRadius = 0.05;
	
	/*
	 * tutModelWithLigand
	 * ribosome.txt
	 * oneAtomOneBond.txt
	 */
	new THREE.FileLoader().load( "data/tutModelWithLigand.txt",
		function ( modelStringCoot )
		{
			var modelStringTranslated = modelStringCoot.replace(/(\])|(\[)|(\()|(\))|(Fa)|(Tr)/g, function(str,p1,p2,p3,p4,p5,p6) {
				if(p1||p2) return '';
		        if(p3) return '[';
		        if(p4) return ']';
		        if(p5) return 'fa';
		        if(p6) return 'tr';
		    });
			var cootArray = eval(modelStringTranslated);
			console.log("string processed fully");
			
			ourClock.getDelta();
			
			var atomDataFromCoot = cootArray[0];
			var bondDataFromCoot = cootArray[1];
			var numberOfCylinders = 0;
			var numberOfAtoms = 0;
			for(var i = 0, il = atomDataFromCoot.length; i < il; i++ )
				numberOfAtoms += atomDataFromCoot[i].length;
			for(var i = 0, il = bondDataFromCoot.length; i < il; i++ )
				numberOfCylinders += bondDataFromCoot[i].length;
			
			model = new THREE.Object3D();
			model.atoms = Array(numberOfAtoms);
			
			var lowestUnusedAtom = 0;
			for(var i = 0, il = atomDataFromCoot.length; i < il; i++) //colors
			{
				for(var j = 0, jl = atomDataFromCoot[i].length; j < jl; j++)
				{
					model.atoms[lowestUnusedAtom] = {element:i}; //a number, not a string
					model.atoms[lowestUnusedAtom].labelString = atomDataFromCoot[i][j][2];
					model.atoms[lowestUnusedAtom].position = new THREE.Vector3().fromArray(atomDataFromCoot[i][j][0]);
					
					lowestUnusedAtom++;
				}
			}
			
			{
				var averagePosition = new THREE.Vector3();
				for(var i = 0, il = model.atoms.length; i < il; i++)
				{
					averagePosition.add(model.atoms[i].position);
				}
				averagePosition.multiplyScalar( 1  /model.atoms.length);
				
				var furthestDistanceSquared = -1;
				for(var i = 0, il = model.atoms.length; i < il; i++)
				{
					var distSq = averagePosition.distanceToSquared(model.atoms[i].position)
					if(distSq>furthestDistanceSquared)
						furthestDistanceSquared = distSq;
				}
				
				model.boundingSphere = new THREE.Sphere( averagePosition, Math.sqrt( furthestDistanceSquared ) ); //urgh, at some point you need a think about where angstrom gets dealt with
				model.pointInBoundingSphere = pointInBoundingSphere;
			}
			
			//------Making shit
			model.atomsBondsMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhongMaterial( {vertexColors:THREE.VertexColors} ) );
			model.add(model.atomsBondsMesh);
			
			var templateSphereGeometry = new THREE.EfficientSphereGeometry(defaultBondRadius * 4);
			templateSphereGeometry.vertexNormals = Array(templateSphereGeometry.vertices.length);
			for(var i = 0, il = templateSphereGeometry.vertices.length; i < il; i++)
				templateSphereGeometry.vertexNormals[i] = templateSphereGeometry.vertices[i].clone().normalize();
			
			var nSphereVertices = templateSphereGeometry.vertices.length;
			var nSphereFaces = templateSphereGeometry.faces.length;
			var cylinderSides = 15;
			
			model.atomsBondsMesh.geometry.addAttribute( 'position', new THREE.BufferAttribute(new Float32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereVertices) ), 3) );
			model.atomsBondsMesh.geometry.addAttribute( 'color', 	new THREE.BufferAttribute(new Float32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereVertices) ), 3) );
			model.atomsBondsMesh.geometry.addAttribute( 'normal',	new THREE.BufferAttribute(new Float32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereVertices) ), 3) );
			model.atomsBondsMesh.geometry.addAttribute( 'index', 	new THREE.BufferAttribute(new  Uint32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereFaces) ), 1) ); //setIndex?
			
			model.atomsBondsMesh.geometry.index.setABC = function(index,a,b,c) //can't use XYZ because itemsize is 1
			{
				this.array[index*3+0] = a;
				this.array[index*3+1] = b;
				this.array[index*3+2] = c;
			}
			
			var firstVertexIndex = 0;
			var firstFaceIndex = 0;
			for(var i = 0, il = model.atoms.length; i < il; i++ )
			{
				model.atoms[i].firstVertexIndex = firstVertexIndex;
				model.atoms[i].firstFaceIndex = firstFaceIndex;
				
				for(var k = 0; k < nSphereVertices; k++)
				{
					model.atomsBondsMesh.geometry.attributes.position.setXYZ( firstVertexIndex + k, 
							templateSphereGeometry.vertices[k].x + model.atoms[i].position.x, 
							templateSphereGeometry.vertices[k].y + model.atoms[i].position.y, 
							templateSphereGeometry.vertices[k].z + model.atoms[i].position.z );
					
					model.atomsBondsMesh.geometry.attributes.color.setXYZ( firstVertexIndex + k, 
							atomMaterials[model.atoms[i].element].color.r, 
							atomMaterials[model.atoms[i].element].color.g, 
							atomMaterials[model.atoms[i].element].color.b );
					
					model.atomsBondsMesh.geometry.attributes.normal.setXYZ( firstVertexIndex + k, 
							templateSphereGeometry.vertexNormals[k].x, 
							templateSphereGeometry.vertexNormals[k].y, 
							templateSphereGeometry.vertexNormals[k].z );
				}
				for(var k = 0; k < nSphereFaces; k++)
				{
					model.atomsBondsMesh.geometry.index.setABC( firstFaceIndex + k, 
							templateSphereGeometry.faces[k].a + firstVertexIndex, 
							templateSphereGeometry.faces[k].b + firstVertexIndex, 
							templateSphereGeometry.faces[k].c + firstVertexIndex );
				}

				firstVertexIndex += nSphereVertices;
				firstFaceIndex += nSphereFaces;
			}
			
			//---------Bonds. You can't update them but don't worry about them too much until Paul has the damn atom-indexed version
			var cylinderBeginning = new THREE.Vector3();
			var cylinderEnd = new THREE.Vector3();
			for(var i = 0, il = bondDataFromCoot.length; i < il; i++ )
			{
				for(var j = 0, jl = bondDataFromCoot[i].length; j < jl; j++)
				{
					for(var k = 0; k < cylinderSides; k++)
					{
						model.atomsBondsMesh.geometry.index.setABC(firstFaceIndex+k*2,
							(k*2+1) + firstVertexIndex,
							(k*2+0) + firstVertexIndex,
							(k*2+2) % (cylinderSides*2) + firstVertexIndex );
						
						model.atomsBondsMesh.geometry.index.setABC(firstFaceIndex+k*2 + 1,
							(k*2+1) + firstVertexIndex,
							(k*2+2) % (cylinderSides*2) + firstVertexIndex,
							(k*2+3) % (cylinderSides*2) + firstVertexIndex );
					}
					
					cylinderBeginning.fromArray( bondDataFromCoot[i][j][0] );
					cylinderEnd.fromArray( bondDataFromCoot[i][j][1] );
					
					if(i===5)
						insertCylinderCoordsAndNormals( cylinderBeginning, cylinderEnd, model.atomsBondsMesh.geometry.attributes.position, model.atomsBondsMesh.geometry.attributes.normal, cylinderSides, firstVertexIndex, defaultBondRadius / 2 );
					else
						insertCylinderCoordsAndNormals( cylinderBeginning, cylinderEnd, model.atomsBondsMesh.geometry.attributes.position, model.atomsBondsMesh.geometry.attributes.normal, cylinderSides, firstVertexIndex, defaultBondRadius );
					
					for(var k = 0, kl = cylinderSides * 2; k < kl; k++)
					{
						model.atomsBondsMesh.geometry.attributes.color.setXYZ( firstVertexIndex + k, 
							atomMaterials[i].color.r,
							atomMaterials[i].color.g,
							atomMaterials[i].color.b );
					}
					
					firstVertexIndex += cylinderSides * 2;
					firstFaceIndex += cylinderSides * 2;
				}
			}
			
			if(firstFaceIndex*3 !== model.atomsBondsMesh.geometry.index.array.length || firstFaceIndex*3 !== model.atomsBondsMesh.geometry.index.array.length)
				console.error("not all vertices or faces filled?")
			
			//takes twice as long if you do this
//			model.atomsBondsMesh.geometry.computeFaceNormals();
//			model.atomsBondsMesh.geometry.computeVertexNormals();
			
//			model.updateBoundingSphere = updateBoundingSphere;
//			model.pointInBoundingSphere = pointInBoundingSphere;
				
			model.moveAtom = function(atomIndex)
			{
				this.atoms[atomIndex].position.x += 2;
				
				for(var k = 0; k < nSphereVertices; k++)
				{
					model.atomsBondsMesh.geometry.attributes.position.setXYZ( this.atoms[atomIndex].firstVertexIndex + k, 
							templateSphereGeometry.vertices[k].x + model.atoms[i].position.x, 
							templateSphereGeometry.vertices[k].y + model.atoms[i].position.y, 
							templateSphereGeometry.vertices[k].z + model.atoms[i].position.z );
				}
				
				model.atomsBondsMesh.verticesNeedUpdate = true;
			}
			
			//-----Labels
			{
				var updateLabel = function()
				{
					if(!this.visible)
						return;
					this.scale.setScalar( 20 * Math.sqrt(this.getWorldPosition().distanceTo(camera.position)));
					
//					var positionToLookAt = camera.position.clone();
//					this.worldToLocal(positionToLookAt);
//					//and something about up?
//					this.lookAt(positionToLookAt);
				}
				
				var labelMaterial = new THREE.MeshPhongMaterial( { color: 0x156289, shading: THREE.FlatShading });
				model.toggleLabel = function(atomIndex)
				{
					if( this.atoms[atomIndex].label === undefined)
					{
						this.atoms[atomIndex].label = new THREE.Mesh(
							new THREE.TextGeometry( this.atoms[atomIndex].labelString, {size: defaultBondRadius * 4, height: defaultBondRadius / 4, font: THREE.defaultFont }),
							labelMaterial );
						
						labels.push( this.atoms[atomIndex].label );
						
						this.atoms[atomIndex].label.update = updateLabel;
						
						this.atoms[atomIndex].label.position = this.atoms[atomIndex].position;
						this.add( this.atoms[atomIndex].label );
						
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
				
				model.toggleLabel(0);
			}
			
			model.position.z = initialZ;
			model.position.sub( model.boundingSphere.center.clone().multiplyScalar(angstrom) );
			model.scale.setScalar(angstrom)
			scene.add( model );
			models.push( model );
			
			console.log( "Making model took ", ourClock.getDelta())
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load PDB" ); }
	);
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

//assumes ourVector is not zeroVector
function randomPerpVector(ourVector){
	var perpVector = new THREE.Vector3();
	
	if( ourVector.equals(zAxis))
		perpVector.crossVectors(ourVector, yAxis);
	else
		perpVector.crossVectors(ourVector, zAxis);
	
	return perpVector;
}

function insertCylinderCoordsAndNormals(A,B, vertexAttribute, normalAttribute, cylinderSides, firstVertexIndex, radius ) {
	var aToB = new THREE.Vector3().subVectors(B,A);
	aToB.normalize();
	var tickVector = randomPerpVector(aToB);
	tickVector.normalize(); 
	for( var i = 0; i < cylinderSides; i++)
	{
		vertexAttribute.setXYZ(  firstVertexIndex + i*2, tickVector.x*radius + A.x,tickVector.y*radius + A.y,tickVector.z*radius + A.z );
		vertexAttribute.setXYZ(firstVertexIndex + i*2+1, tickVector.x*radius + B.x,tickVector.y*radius + B.y,tickVector.z*radius + B.z );
		
		normalAttribute.setXYZ(  firstVertexIndex + i*2, tickVector.x,tickVector.y,tickVector.z );
		normalAttribute.setXYZ(firstVertexIndex + i*2+1, tickVector.x,tickVector.y,tickVector.z );
		
		tickVector.applyAxisAngle(aToB, TAU / cylinderSides);
	}
}