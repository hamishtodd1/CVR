/*
 * Change color of carbons as you go down the chain, to give you landmarks. This is interesting. Useful though?
 */

/*
 * Ribbon
 * 
 * 
	1. Get all carbon alphas, ribbon will go through all of them
	2. For all points, look at point just before and just after. Normal+tangent vector is in the same plane as all 3.
	3. For all carbon alphas, look at the one just in front and cubic bezier to get a curve connecting the two
	4. "Extrude a tube" going along all these connected curves
	
	OPTIONAL! Plausibly makes it worse, a single tube is less confusing when you're looking at something in density!
	5. At places along tube where there are alpha helices and beta sheets, "thicken" tube along the curve's binomial vector.
	6. AAs which are part of an alpha helix or beta sheet are listed in pdb file
 */

ELEMENT_TO_NUMBER = {
		C: 0,
		S: 1,
		O: 2,
		N: 3,
		P: 6,
		H: 9
}
ATOM_COLORS = Array(10);
for(var i = 0; i < ATOM_COLORS.length; i++)
	ATOM_COLORS[i] = new THREE.Color( 0.2,0.2,0.2 );
ATOM_COLORS[0].setRGB(72/255,193/255,103/255); //carbon
ATOM_COLORS[1].setRGB(0.8,0.8,0.2); //sulphur
ATOM_COLORS[2].setRGB(0.8,0.2,0.2); //oxygen
ATOM_COLORS[3].setRGB(0.2,0.4,0.8); //nitrogen
ATOM_COLORS[6].setRGB(1.0,165/255,0.0); //phosphorus
ATOM_COLORS[9].setRGB(1.0,1.0,1.0); //hydrogen

DEFAULT_BOND_RADIUS = 0.055;

function Atom(element,position,imol,chainId,residueNumber,insertionCode,name,altloc)
{
	/*
	position, isHydrogen, label elements, residue. Last unused
	 */

	if( imol === -1)
	{ //MAJOR HACK PAUL IS FIXING
		imol = 0;
	}

	this.position = position;

	this.spec = {
		imol:imol,
		chainId:chainId,
		residueNumber:residueNumber,
		insertionCode:insertionCode,
		name:name,
		altloc:altloc
	}

	if(typeof element === "number") //there are a lot of these things, best to keep it as a number
	{
		this.element = element;
	}
	else
	{
		this.element = ELEMENT_TO_NUMBER[ element ];
	}

	if(this.element === undefined)
	{
		console.error("unrecognized element: ", element)
	}
}
function Residue()
{
	this.atoms = [];
	this.position = new THREE.Vector3();
}
Residue.prototype.updatePosition = function()
{
	this.position.set(0,0,0);
	for(var i = 0, il = this.atoms.length; i < il; i++)
	{
		this.position.add( this.atoms[i].position );
	}
	this.position.multiplyScalar( 1 / this.atoms.length );
}

function makeModelFromCootString( modelStringCoot, thingsToBeUpdated, visiBoxPlanes )
{
	// console.log(modelStringCoot)
	var modelStringTranslated = modelStringCoot.replace(/(\()|(\))|(Fa)|(Tr)|(1 "model")/g, function(str,p1,p2,p3,p4,p5,p6,p7)
	{
        if(p1) return "[";
        if(p2) return "]";
        if(p3) return "fa";
        if(p4) return "tr";
        if(p5) return "'model 1'";
		// if(p6||p7) return ""; //|(\])|(\[)
    });
    var cootArray = eval(modelStringTranslated);

    //WE DON'T NEED THAT NUMBER AT THE END

    if( typeof cootArray[0] === "string")
    {
    	//we have a bunch of things, preceded by their names. Necessary given the label?
    	var modelNumber = cootArray[0]
		var atomDataFromCoot = cootArray[1][0];
		var bondDataFromCoot = cootArray[1][1];

		if(cootArray.length>2)
		{
			console.error("got more than one model in there!")
		}
    }
    else
    {
    	var atomDataFromCoot = cootArray[0];
		var bondDataFromCoot = cootArray[1];
    }
	
	var model = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial( { 
		vertexColors: THREE.VertexColors,
		clippingPlanes: visiBoxPlanes
	} ) );
	
	var numberOfAtoms = 0;
	for(var i = 0, il = atomDataFromCoot.length; i < il; i++ )
	{
		numberOfAtoms += atomDataFromCoot[i].length;
	}
	model.atoms = Array(numberOfAtoms);
	
	var lowestUnusedAtom = 0;
	model.residues = [];
	if(!logged)console.log( atomDataFromCoot[0][0] )
	logged = 1;
	for(var i = 0, il = atomDataFromCoot.length; i < il; i++) //colors
	{
		for(var j = 0, jl = atomDataFromCoot[i].length; j < jl; j++)
		{ 
			model.atoms[lowestUnusedAtom] = new Atom( i, new THREE.Vector3().fromArray(atomDataFromCoot[i][j][0]), atomDataFromCoot[i][j][2][0],atomDataFromCoot[i][j][2][1],atomDataFromCoot[i][j][2][2],atomDataFromCoot[i][j][2][3],atomDataFromCoot[i][j][2][4],atomDataFromCoot[i][j][2][5] );
			
			// var residueIndex = atomDataFromCoot[i][j][3];
			// if( -1 !== residueIndex )
			// {
			// 	if( !model.residues[ residueIndex ] )
			// 	{
			// 		model.residues[ residueIndex ] = new Residue();
			// 	}
				
			// 	//YO the atoms should be inserted according to some other aspect of them, some string that WITHIN THE RESIDUE identifies them, possibly their name
			// 	model.residues[ residueIndex ].atoms.push( model.atoms[lowestUnusedAtom] );
			// 	model.atoms[ lowestUnusedAtom ].residue = model.residues[ residueIndex ];
			// }
					
			lowestUnusedAtom++;
		}
	}
	// for(var i = 0, il = model.residues.length; i < il; i++)
	// {
	// 	model.residues[i].updatePosition();
	// }

	var nSphereVertices = makeMoleculeMesh(model.geometry, model.atoms, bondDataFromCoot);

	function getIndexOfAtomWithSpecContainedInHere(spec)
	{
		var itsThisOne = true;
		for( var i = 0, il = model.atoms.length; i < il; i++ )
		{
			itsThisOne = true;
			for( var identifier in model.atoms[i].spec )
			{
				if( model.atoms[i].spec[identifier] !== spec[identifier] )
				{
					itsThisOne = false;
					break;
				}
			}
			if(itsThisOne)
			{
				return i;
			}
		}
		console.error("couldn't find atom with requested spec")
	}
	/*
	atom visible in page:
		988
		x:42.08
		y:9.668
		z:14.424
	*/
	
	requestAtomMovement = function(atomIndex,newPosition)
	{
		var msg = {command:"moveAtom"};
		Object.assign(msg,model.atoms[atomIndex].spec);
		Object.assign(msg,newPosition);
		socket.send(JSON.stringify(msg));
		socket.setTimerOnExpectedCommand("moveAtom");
	}
	socket.messageReactions.moveAtom = function(msg)
	{
		var atomIndex = getIndexOfAtomWithSpecContainedInHere(msg)
		model.atoms[atomIndex].position.copy(msg);
		model.geometry.refreshAtomPositionInMesh(atomIndex);
		model.geometry.attributes.position.needsUpdate = true;

		// if(this.atoms[atomIndex].residue)
		// {
		// 	this.atoms[atomIndex].residue.updatePosition();
		// }

		//html text!
	}

	socket.messageReactions.deleteAtom = function(msg)
	{
		var atomIndex = getIndexOfAtomWithSpecContainedInHere(msg)
		
		for(var k = 0; k < nSphereVertices; k++)
		{
			model.geometry.attributes.position.setXYZ( model.atoms[atomIndex].firstVertexIndex + k, 0, 0, 0 );
		}
		model.geometry.attributes.position.needsUpdate = true;

		//this could be avoided if the atom used its name in the residue identifier
		// for(var j = 0, jl = model.atoms[i].residue.atoms.length; j < jl; j++ )
		// {
		// 	if( model.atoms[i].residue.atoms[j] == model.atoms[i] )
		// 	{
		// 		model.atoms[i].residue.atoms.splice(j,1);
		// 		break;
		// 	}
		// }
		// model.atoms[i].residue.updatePosition();
		model.atoms.splice(i,1); //or could leave a space for an atom to be injected
	}
	

	// var traceGeometry = new THREE.TubeBufferGeometry( //and then no hiders for this
	// 		new THREE.CatmullRomCurve3( carbonAlphas ), //the residue locations? Or is that an average?
	// 		carbonAlphas.length*8, 0.1, 16 );
	// var trace = new THREE.Mesh( tubeGeometry, new THREE.MeshLambertMaterial({color:0xFF0000}));
	
	//-----Labels
	{
		var labels = [];
		thingsToBeUpdated.labels = labels;
		
		function updateLabel()
		{
			this.scale.setScalar( 1 * Math.sqrt(this.position.distanceTo(camera.position)));

			camera.updateMatrix();
			var cameraUp = yAxis.clone().applyQuaternion(camera.quaternion);
			cameraUp.add(this.parent.getWorldPosition())
			this.parent.worldToLocal(cameraUp)
			this.up.copy(cameraUp);

			this.parent.updateMatrixWorld()
			var localCameraPosition = camera.position.clone()
			this.parent.worldToLocal(localCameraPosition);
			this.lookAt(localCameraPosition);
		}
		
		model.toggleLabel = function(atomIndex)
		{
			var atom = this.atoms[atomIndex];

			if( atom.label === undefined)
			{
				var labelString = "";
				for(var propt in atom.spec)
				{
					labelString += atom.spec[propt] + ","
				}
				atom.label = makeTextSign(labelString);
				atom.label.position.copy(atom.position);
				atom.label.update = updateLabel;

				model.add( atom.label );
				labels.push( atom.label );
			}
			else
			{
				if( atom.label.visible )
				{
					atom.label.visible = false;
				}
				else
				{
					atom.label.visible = true;
				}
			}
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
		
		model.position.sub( averagePosition );
		if( modelAndMap.map )
			modelAndMap.map.position.sub(averagePosition);
	}
	
	modelAndMap.model = model;
	modelAndMap.add( model );
}

function insertCylinderCoordsAndNormals(A,B, vertexAttribute, normalAttribute, cylinderSides, firstVertexIndex, radius )
{
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

function makeMoleculeMesh(bufferGeometry, atoms, bondDataFromCoot )
{
	var bondData;
	if( bondDataFromCoot )
	{
		bondData = bondDataFromCoot;
	}
	else
	{
		bondData = Array(4); //seems to be 24
		for(var i = 0; i < bondData.length; i++)
			bondData[i] = [];
		if( atoms.length > 100 )
		{
			console.error("Sure you want to compute bonds for ", atoms.length, " atoms?")
		}
		else //TODO
		{
			for( var i = 0, il = atoms.length; i < il; i++ )
			{
				for( var j = i+1, jl = atoms.length; j < jl; j++)
				{
					if( atoms[i].position.distanceTo( atoms[j].position ) < 1.81 ) //quantum chemistry
					{
						var midPoint = atoms[i].position.clone();
						midPoint.lerp( atoms[j].position, 0.5 );
						
						bondData[ atoms[i].element ].push( [ 
                             [ atoms[i].position.x, atoms[i].position.y, atoms[i].position.z ],
                             [ midPoint.x, midPoint.y, midPoint.z ]
                           ]
						);
						
						bondData[ atoms[j].element ].push( [ 
	                         [ midPoint.x, midPoint.y, midPoint.z ],
	                         [ atoms[j].position.x, atoms[j].position.y, atoms[j].position.z ]
	                       ]
						);
					}
				}
			}
		}
	}
	var numberOfCylinders = 0;
	for(var i = 0, il = bondData.length; i < il; i++ )
	{
		numberOfCylinders += bondData[i].length;
	}
	
	var hydrogenGeometry = new THREE.EfficientSphereGeometry(DEFAULT_BOND_RADIUS * 2);
	var atomGeometry = new THREE.EfficientSphereGeometry(DEFAULT_BOND_RADIUS * 5);
	atomGeometry.vertexNormals = Array(atomGeometry.vertices.length);
	for(var i = 0, il = atomGeometry.vertices.length; i < il; i++)
	{
		atomGeometry.vertexNormals[i] = atomGeometry.vertices[i].clone().normalize();
	}
	
	var nSphereVertices = atomGeometry.vertices.length;
	var nSphereFaces = atomGeometry.faces.length;
	var cylinderSides = 15;
	
	var numberOfAtoms = atoms.length;
	//Speedup opportunity: you only need as many colors as there are atoms and bonds, not as many as there are triangles.
	bufferGeometry.addAttribute( 'position',new THREE.BufferAttribute(new Float32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereVertices) ), 3) );
	bufferGeometry.addAttribute( 'color', 	new THREE.BufferAttribute(new Float32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereVertices) ), 3) );
	bufferGeometry.addAttribute( 'normal',	new THREE.BufferAttribute(new Float32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereVertices) ), 3) );
	bufferGeometry.setIndex( new THREE.BufferAttribute(new Uint32Array( 3 * (cylinderSides * numberOfCylinders * 2 + numberOfAtoms * nSphereFaces) ), 1) );

	//can't use XYZ because itemsize is 1
	bufferGeometry.index.setABC = function(index,a,b,c)
	{
		this.array[ index*3+0 ] = a;
		this.array[ index*3+1 ] = b;
		this.array[ index*3+2 ] = c;
	}
	
	bufferGeometry.colorAtom = function( atomIndex, newColor )
	{
		if(!newColor)
		{
			newColor = ATOM_COLORS[ atoms[atomIndex].element ];
		}
		
		for(var k = 0; k < nSphereVertices; k++)
		{
			this.attributes.color.setXYZ( atoms[atomIndex].firstVertexIndex + k, 
				newColor.r, 
				newColor.g, 
				newColor.b );
		}
	}

	bufferGeometry.refreshAtomPositionInMesh = function( atomIndex )
	{
		if(atoms[atomIndex].element === 9)
		{
			for(var k = 0; k < nSphereVertices; k++)
			{
				this.attributes.position.setXYZ( atoms[atomIndex].firstVertexIndex + k,
						hydrogenGeometry.vertices[k].x + atoms[atomIndex].position.x,
						hydrogenGeometry.vertices[k].y + atoms[atomIndex].position.y,
						hydrogenGeometry.vertices[k].z + atoms[atomIndex].position.z );
			}
		}
		else
		{
			for(var k = 0; k < nSphereVertices; k++)
			{
				this.attributes.position.setXYZ( atoms[atomIndex].firstVertexIndex + k, 
						atomGeometry.vertices[k].x + atoms[atomIndex].position.x, 
						atomGeometry.vertices[k].y + atoms[atomIndex].position.y, 
						atomGeometry.vertices[k].z + atoms[atomIndex].position.z );
			}
		}
	}
	
	for(var i = 0, il = atoms.length; i < il; i++ )
	{
		atoms[i].firstVertexIndex = i*nSphereVertices;
		atoms[i].firstFaceIndex = i*nSphereFaces;
		
		bufferGeometry.colorAtom(i);
		bufferGeometry.refreshAtomPositionInMesh(i)
		
		for(var k = 0; k < nSphereVertices; k++)
		{
			bufferGeometry.attributes.normal.setXYZ( atoms[i].firstVertexIndex + k, 
					atomGeometry.vertexNormals[k].x, 
					atomGeometry.vertexNormals[k].y, 
					atomGeometry.vertexNormals[k].z );
		}
		for(var k = 0; k < nSphereFaces; k++)
		{
			bufferGeometry.index.setABC( atoms[i].firstFaceIndex + k, 
					atomGeometry.faces[k].a + atoms[i].firstVertexIndex, 
					atomGeometry.faces[k].b + atoms[i].firstVertexIndex, 
					atomGeometry.faces[k].c + atoms[i].firstVertexIndex );
		}
	}
	
	var cylinderBeginning = new THREE.Vector3();
	var cylinderEnd = new THREE.Vector3();
	var firstFaceIndex = atoms.length * atoms[1].firstFaceIndex;
	var firstVertexIndex = atoms.length * atoms[1].firstVertexIndex;
	for(var i = 0, il = bondData.length; i < il; i++ )
	{
		for(var j = 0, jl = bondData[i].length; j < jl; j++)
		{
			for(var k = 0; k < cylinderSides; k++)
			{
				bufferGeometry.index.setABC(firstFaceIndex+k*2,
					(k*2+1) + firstVertexIndex,
					(k*2+0) + firstVertexIndex,
					(k*2+2) % (cylinderSides*2) + firstVertexIndex );
				
				bufferGeometry.index.setABC(firstFaceIndex+k*2 + 1,
					(k*2+1) + firstVertexIndex,
					(k*2+2) % (cylinderSides*2) + firstVertexIndex,
					(k*2+3) % (cylinderSides*2) + firstVertexIndex );
			}
			
			cylinderBeginning.fromArray( bondData[i][j][0] );
			cylinderEnd.fromArray( bondData[i][j][1] );
			
			var bondRadius = DEFAULT_BOND_RADIUS;
 			if( i === 9) //hydrogen
 			{
				bondRadius /= 3;
 			}
			else if(bondData[i][j][2] )
			{
				bondRadius /= bondData[i][j][2];
			}
 			
 			if(bondData[i][j][2] === 2)
 			{
 				console.log("double?")
 			}
			
			insertCylinderCoordsAndNormals( cylinderBeginning, cylinderEnd, bufferGeometry.attributes.position, bufferGeometry.attributes.normal, cylinderSides, firstVertexIndex, bondRadius );
			
			for(var k = 0, kl = cylinderSides * 2; k < kl; k++)
			{
				bufferGeometry.attributes.color.setXYZ( firstVertexIndex + k, 
					ATOM_COLORS[i].r,
					ATOM_COLORS[i].g,
					ATOM_COLORS[i].b );
			}
			
			firstVertexIndex += cylinderSides * 2;
			firstFaceIndex += cylinderSides * 2;
		}
	}

	return nSphereVertices;
}