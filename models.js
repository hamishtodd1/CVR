/*
	When you come to refactor this:
		The cylinders and spheres (separate arrays) are a "resource"
		You can change their color. They don't need an order
		When an atom is deleted, you make an "orphan" sphere and cylinder with all vertices 0
		When an atom is added, go through the spheres and cylinders and find orphans

 * Change color of carbons as you go down the chain, to give you landmarks. This is interesting. Useful though?
 */

/*
 * Ribbon
 * 
	1. Get all carbon alphas, ribbon will go through all of them
	2. For all points, look at point just before and just after. Normal+tangent vector is in the same plane as all 3.
	3. For all carbon alphas, look at the one just in front and cubic bezier to get a curve connecting the two
	4. "Extrude a tube" going along all these connected curves
	
	OPTIONAL! Plausibly makes it worse, a single tube is less confusing when you're looking at something in density!
	5. At places along tube where there are alpha helices and beta sheets, "thicken" tube along the curve's binomial vector.
	6. AAs which are part of an alpha helix or beta sheet are listed in pdb file
 */



var elementToNumber = {
		C: 0,
		S: 1,
		O: 2,
		N: 3,
		P: 6,
		H: 9
}

function Atom(element,position,imol,chainId,resNo,insertionCode,name,altloc)
{
	this.position = position;

	this.selected = false;

	this.bondPartners = [];
	this.bondFirstVertexIndices = [];

	this.imol = imol;
	this.chainId = chainId;
	this.resNo = resNo;
	this.insertionCode = insertionCode;
	this.name = name;
	this.altloc = altloc;

	if(typeof element === "number") //there are a lot of these things, best to keep it as a number
	{
		this.element = element;
	}
	else
	{
		this.element = elementToNumber[ element ];
	}

	if(this.element === undefined)
	{
		console.error("unrecognized element: ", element)
	}
}
Atom.prototype.assignAtomSpecToObject = function(msg)
{
	msg.imol = this.imol;
	msg.chainId = this.chainId;
	msg.resNo = this.resNo;
	msg.insertionCode = this.insertionCode;
	msg.name = this.name;
	msg.altloc = this.altloc;
}
Atom.prototype.assignResidueSpecToMessage = function(msg)
{
	msg.imol = this.imol;
	msg.chainId = this.chainId;
	msg.resNo = this.resNo;
	msg.insertionCode = this.insertionCode;
}
Atom.prototype.setLabelVisibility = function(labelVisibility)
{
	if( this.label === undefined && labelVisibility)
	{
		var labelString = "";
		labelString += this.imol + ",";
		labelString += this.chainId + ",";
		labelString += this.resNo + ",";
		labelString += this.insertionCode + ",";
		labelString += this.name + ",";
		labelString += this.altloc + ",";

		this.label = makeTextSign(labelString);
		this.label.position.copy(this.position);
		this.label.update = updateLabel;

		var model = getModelWithImol(this.imol);
		model.add( this.label );
		thingsToBeUpdated.push(this.label);
	}
	
	if(this.label !== undefined)
	{
		this.label.visible = labelVisibility;
	}
}
function updateLabel()
{
	this.scale.setScalar( 0.06 * Math.sqrt(this.position.distanceTo(camera.position)));
	
	this.parent.updateMatrixWorld()
	
	camera.updateMatrix();
	var cameraUp = yVector.clone().applyQuaternion(camera.quaternion);
	var parentWorldPosition = new THREE.Vector3();
	this.parent.getWorldPosition(parentWorldPosition);
	cameraUp.add(parentWorldPosition)
	this.parent.worldToLocal(cameraUp)
	this.up.copy(cameraUp);

	var localCameraPosition = camera.position.clone()
	this.parent.worldToLocal(localCameraPosition);
	this.lookAt(localCameraPosition);
}

function initModelCreationSystem( visiBoxPlanes)
{
	var models = [];

	var cylinderSides = 15;

	getModelWithImol = function(imol)
	{
		for(var i = 0; i < models.length; i++)
		{
			if(models[i].imol == imol)
			{
				return models[i]
			}
		}
		console.error("no model with imol ", imol)
	}

	var defaultBondRadius = 0.055;

	var hydrogenGeometry = new THREE.EfficientSphereGeometry(defaultBondRadius * 2);
	var atomGeometry = new THREE.EfficientSphereGeometry(defaultBondRadius * 5);
	atomGeometry.vertexNormals = Array(atomGeometry.vertices.length);
	for(var i = 0, il = atomGeometry.vertices.length; i < il; i++)
	{
		atomGeometry.vertexNormals[i] = atomGeometry.vertices[i].clone().normalize();
	}
	
	var nSphereVertices = atomGeometry.vertices.length;
	var nSphereFaces = atomGeometry.faces.length;

	makeModelFromCootString = function( modelStringCoot, thingsToBeUpdated, visiBoxPlanes, callback )
	{
		//position, isHydrogen, spec, "residue"
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
		
		var numberOfAtoms = 0;
		for(var i = 0, il = atomDataFromCoot.length; i < il; i++ )
		{
			numberOfAtoms += atomDataFromCoot[i].length;
		}
		var modelAtoms = Array(numberOfAtoms);

		for(var i = 0, il = atomDataFromCoot.length; i < il; i++) //colors
		{
			for(var j = 0, jl = atomDataFromCoot[i].length; j < jl; j++)
			{ 
				modelAtoms[atomDataFromCoot[i][j][3]] = new Atom(
					i, 
					new THREE.Vector3().fromArray(atomDataFromCoot[i][j][0]),
					atomDataFromCoot[i][j][2][0],
					atomDataFromCoot[i][j][2][1],
					atomDataFromCoot[i][j][2][2],
					atomDataFromCoot[i][j][2][3],
					atomDataFromCoot[i][j][2][4],
					atomDataFromCoot[i][j][2][5] );
			}
		}

		var model = makeMoleculeMesh(modelAtoms, true, bondDataFromCoot);

		// var traceGeometry = new THREE.TubeBufferGeometry( //and then no hiders for this
		// 		new THREE.CatmullRomCurve3( carbonAlphas ), //the residue locations? Or is that an average?
		// 		carbonAlphas.length*8, 0.1, 16 );
		// var trace = new THREE.Mesh( tubeGeometry, new THREE.MeshLambertMaterial({color:0xFF0000}));
		
		model.imol = model.atoms[0].imol;
		assemblage.add(model);
		models.push(model);

		if(models.length === 1)
		{
			var averagePosition = new THREE.Vector3();
			for(var i = 0, il = model.atoms.length; i < il; i++)
			{
				averagePosition.add(model.atoms[i].position);
			}
			averagePosition.multiplyScalar( 1 / model.atoms.length);
			assemblage.position.sub( averagePosition.multiplyScalar(getAngstrom()) );
		}
	}

	makeMoleculeMesh = function( atoms, clip, bondDataFromCoot )
	{
		var molecule = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial( { 
			vertexColors: THREE.VertexColors
		} ) );
		molecule.atoms = atoms;

		if(clip)
		{
			molecule.material.clippingPlanes = visiBoxPlanes;
		}

		var bufferGeometry = molecule.geometry;

		var atomColors = Array(10);
		for(var i = 0; i < atomColors.length; i++)
			atomColors[i] = new THREE.Color( 0.2,0.2,0.2 );
		atomColors[0].setRGB(72/255,193/255,103/255); //carbon
		atomColors[1].setRGB(0.8,0.8,0.2); //sulphur
		atomColors[2].setRGB(0.8,0.2,0.2); //oxygen
		atomColors[3].setRGB(0.2,0.4,0.8); //nitrogen
		atomColors[6].setRGB(1.0,165/255,0.0); //phosphorus
		atomColors[9].setRGB(1.0,1.0,1.0); //hydrogen

		var bondData;
		if( bondDataFromCoot )
		{
			bondData = bondDataFromCoot;
		}
		else
		{
			bondData = Array(4);
			//position position, bondNumber, index index
			//coords never seem to be correct to more than three and a half decimal places
			for(var i = 0; i < bondData.length; i++)
			{
				bondData[i] = [];
			}
			if( atoms.length > 100 )
			{
				console.error("Sure you want to compute bonds for ", atoms.length, " atoms?")
			}
			else
			{
				for( var i = 0, il = atoms.length; i < il; i++ )
				{
					for( var j = i+1, jl = atoms.length; j < jl; j++)
					{
						if( atoms[i].position.distanceTo( atoms[j].position ) < 1.81 ) //quantum chemistry
						{
							bondData[ atoms[i].element ].push( [[],[],1,i,j]);
							bondData[ atoms[i].element ].push( [[],[],1,j,i]);
						}
					}
				}
			}
		}
		var numberOfCylinders = 0;
		for(var i = 0, il = bondData.length; i < il; i++ )
		{
			for(var j = 0, jl = bondData[i].length; j < jl; j++)
			{
				//TODO
				if( bondData[i][j][3] === -1 || bondData[i][j][4] === -1 )
				{
					continue;
				}
				var atom = atoms[bondData[i][j][3]];
				var possiblyRepeatedBondPartner = atoms[ bondData[i][j][4] ];

				for(var k = 0, kl = atom.bondPartners.length; k < kl; k++)
				{
					if(atom.bondPartners[k] === possiblyRepeatedBondPartner )
					{
						break;
					}
				}
				if(k === kl)
				{
					atom.bondPartners.push( possiblyRepeatedBondPartner );
					possiblyRepeatedBondPartner.bondPartners.push( atom );
					numberOfCylinders += 2;
					
					if( bondData[i][j][2] !== 1)
					{
						console.log( "more than one bond! You have work to do" )
					}
				}
			}
		}
		
		var numberOfAtoms = atoms.length;
		//Speedup opportunity: you only need as many colors as there are atoms and bonds, not as many as there are triangles.
		//we are assuming fixed length for all these arrays and that is it
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
		
		molecule.colorAtom = function( atom, newColor )
		{
			if(!newColor)
			{
				newColor = atomColors[ atom.element ];
			}
			
			for(var k = 0; k < nSphereVertices; k++)
			{
				this.geometry.attributes.color.setXYZ( atom.firstVertexIndex + k, 
					newColor.r, 
					newColor.g, 
					newColor.b );
			}

			this.geometry.attributes.color.needsUpdate = true;

			for(var j = 0, jl = atom.bondPartners.length; j < jl; j++)
			{
				var bondFirstVertexIndex = atom.bondFirstVertexIndices[j];
				for(var k = 0, kl = cylinderSides * 2; k < kl; k++)
				{
					this.geometry.attributes.color.setXYZ( bondFirstVertexIndex + k,
						newColor.r,
						newColor.g,
						newColor.b );
				}
			}
		}
		
		molecule.setAtomRepresentationPosition = function( atom, newPosition )
		{
			if(newPosition)
			{
				atom.position.copy(newPosition);
			}

			var sourceGeometry = atomGeometry;
			var bondRadius = defaultBondRadius;
			if(atom.element === 9)
			{
				sourceGeometry = hydrogenGeometry;
				bondRadius = defaultBondRadius / 3
			}

			for(var k = 0; k < nSphereVertices; k++)
			{
				this.geometry.attributes.position.setXYZ( atom.firstVertexIndex + k, 
						sourceGeometry.vertices[k].x + atom.position.x, 
						sourceGeometry.vertices[k].y + atom.position.y, 
						sourceGeometry.vertices[k].z + atom.position.z );
			}

			for(var i = 0, il = atom.bondPartners.length; i < il; i++)
			{
				refreshCylinderCoordsAndNormals(
					atom.position,
					atom.position.clone().lerp(atom.bondPartners[i].position,0.5),
					this.geometry, cylinderSides, 
					atom.bondFirstVertexIndices[i],
					bondRadius );

				var thisBondIndexToPartner = atom.bondPartners[i].bondPartners.indexOf(atom);
				var partnersBondFirstVertexIndex = atom.bondPartners[i].bondFirstVertexIndices[ thisBondIndexToPartner ];
				refreshCylinderCoordsAndNormals(
					atom.bondPartners[i].position,
					atom.bondPartners[i].position.clone().lerp(atom.position,0.5),
					this.geometry, cylinderSides, 
					partnersBondFirstVertexIndex,
					bondRadius );
			}
			this.geometry.attributes.position.needsUpdate = true;

			if(atom.label)
			{
				atom.label.position.copy(atom.position)
			}
		}
		
		var cylinderFirstFaceIndex = atoms.length * nSphereFaces;
		var cylinderFirstVertexIndex = atoms.length * nSphereVertices;
		for(var i = 0, il = atoms.length; i < il; i++ )
		{
			atoms[i].firstVertexIndex = i*nSphereVertices;
			atoms[i].firstFaceIndex = i*nSphereFaces;
			
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

			for(var j = 0, jl = atoms[ i ].bondPartners.length; j < jl; j++)
			{
				//bondPartners could have a fixed length of 4
				atoms[i].bondFirstVertexIndices.push(cylinderFirstVertexIndex);

				for(var k = 0; k < cylinderSides; k++)
				{
					bufferGeometry.index.setABC(cylinderFirstFaceIndex+k*2,
						(k*2+1) + cylinderFirstVertexIndex,
						(k*2+0) + cylinderFirstVertexIndex,
						(k*2+2) % (cylinderSides*2) + cylinderFirstVertexIndex );
					
					bufferGeometry.index.setABC(cylinderFirstFaceIndex+k*2 + 1,
						(k*2+1) + cylinderFirstVertexIndex,
						(k*2+2) % (cylinderSides*2) + cylinderFirstVertexIndex,
						(k*2+3) % (cylinderSides*2) + cylinderFirstVertexIndex );
				}
				
				cylinderFirstVertexIndex += cylinderSides * 2;
				cylinderFirstFaceIndex += cylinderSides * 2;
			}

			molecule.colorAtom(atoms[i]);
			molecule.setAtomRepresentationPosition(atoms[i])
		}

		return molecule;
	}

	var highlightColor = new THREE.Color(1,1,1);
	highlightResiduesOverlappingSphere = function(sphericalObject, radiusSquared)
	{
		for(var i = 0; i < models.length; i++)
		{
			var localPosition = new THREE.Vector3();
			sphericalObject.getWorldPosition(localPosition);
			models[i].updateMatrixWorld();
			models[i].worldToLocal(localPosition);
			
			for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
			{
				if( models[i].atoms[j].position.distanceToSquared( localPosition ) < radiusSquared )
				{
					if(!models[i].atoms[j].selected)
					{
						models[i].atoms[j].selected = true;

						for(var k = 0, kl = models[i].atoms.length; k < kl; k++)
						{
							if(models[i].atoms[k].resNo === models[i].atoms[j].resNo)
							{
								models[i].colorAtom(models[i].atoms[k], highlightColor);
							}
						}
					}
				}
				else
				{
					if( models[i].atoms[j].selected )
					{
						models[i].atoms[j].selected = false;

						for(var k = 0, kl = models[i].atoms.length; k < kl; k++)
						{
							if(models[i].atoms[k].resNo === models[i].atoms[j].resNo)
							{
								models[i].colorAtom(models[i].atoms[k]);
							}
						}
					}
				}
			}
		}
	}

	turnOffAllHighlights = function()
	{
		for(var i = 0; i < models.length; i++)
		{
			for(var j = 0, jl = models[i].atoms[j].length; j < jl; j++)
			{
				if( models[i].atoms[j].selected )
				{
					models[i].atoms[j].selected = false;

					for(var k = 0, kl = models[i].atoms.length; k < kl; k++)
					{
						if(models[i].atoms[k].resNo === models[i].atoms[j].resNo)
						{
							models[i].colorAtom(models[i].atoms[k]);
						}
					}
				}
			}
		}
	}

	//------------Socket
	{
		function getAtomWithSpecContainedInHere(objectOrArrayContainingSpec)
		{
			if(objectOrArrayContainingSpec.imol !== undefined)
			{
				var model = getModelWithImol(objectOrArrayContainingSpec.imol);

				for( var i = 0, il = model.atoms.length; i < il; i++ )
				{
					if( model.atoms[i].chainId === objectOrArrayContainingSpec.chainId &&
						model.atoms[i].resNo === objectOrArrayContainingSpec.resNo &&
						model.atoms[i].insertionCode === objectOrArrayContainingSpec.insertionCode &&
						model.atoms[i].name === objectOrArrayContainingSpec.name &&
						model.atoms[i].altloc === objectOrArrayContainingSpec.altloc )
					{
						return model.atoms[i];
					}
				}
			}
			else
			{
				var model = (objectOrArrayContainingSpec[0] === -1 ? models[0]:models[objectOrArrayContainingSpec[0]]);

				for( var i = 0, il = model.atoms.length; i < il; i++ )
				{
					if( model.atoms[i].chainId === objectOrArrayContainingSpec[1] &&
						model.atoms[i].resNo === objectOrArrayContainingSpec[2] &&
						model.atoms[i].insertionCode === objectOrArrayContainingSpec[3] &&
						model.atoms[i].name === objectOrArrayContainingSpec[4] &&
						model.atoms[i].altloc === objectOrArrayContainingSpec[5] )
					{
						return model.atoms[i];
					}
				}
			}
			
			console.error("couldn't find atom with requested spec")
		}

		socket.commandReactions.deleteAtom = function(msg)
		{
			var atom = getAtomWithSpecContainedInHere(msg);
			var model = getModelWithImol(atom.imol);

			for(var i = 0; i < atom.bondPartners.length; i++)
			{
				refreshCylinderCoordsAndNormals( zeroVector, zeroVector,
					model.geometry, cylinderSides, atom.bondFirstVertexIndices[i], 0 );

				var thisBondIndex = atom.bondPartners[i].bondPartners.indexOf(atom);

				refreshCylinderCoordsAndNormals( zeroVector, zeroVector,
					model.geometry, cylinderSides, atom.bondPartners[i].bondFirstVertexIndices[thisBondIndex], 0 );

				atom.bondPartners[i].bondPartners.splice(thisBondIndex, 1);
				atom.bondPartners[i].bondFirstVertexIndices.splice(thisBondIndex, 1);
			}
			for(var k = 0; k < nSphereVertices; k++)
			{
				model.geometry.attributes.position.setXYZ( atom.firstVertexIndex + k, 0, 0, 0 );
			}

			model.geometry.attributes.position.needsUpdate = true;

			removeSingleElementFromArray(model.atoms, atom)
			delete atom;

			return true;
		}

		socket.commandReactions.residueInfo = function(msg)
		{
			/*
			0: [atom-name, alt-conf]
			1: [occ b-factor ele seg-id]
			2: new position
			3: index
			*/
			var model = getModelWithImol(msg.imol);
			for(var i = 0, il = msg.atoms.length; i < il; i++)
			{
				var atom = model.atoms[msg.atoms[i][3]];
				atom.position.fromArray( msg.atoms[i][2] );
				model.setAtomRepresentationPosition(atom);
			}
			model.geometry.attributes.position.needsUpdate = true;
		}

		//could they have different connectivity? :/
		socket.commandReactions.intermediateRepresentation = function(msg)
		{
			// console.log("receiving?")
			var model = getModelWithImol(msg.imol);

			var arrayWithSpecs = msg.intermediateRepresentation[0];
			for(var i = 0; i < arrayWithSpecs.length; i++)
			{
				for(var j = 0; j < arrayWithSpecs[i].length; j++)
				{
					var atom = getAtomWithSpecContainedInHere( arrayWithSpecs[i][j][2] );
					atom.position.fromArray( arrayWithSpecs[i][j][0] );
					model.setAtomRepresentationPosition( atom );
				}
			}
			model.geometry.attributes.position.needsUpdate = true;
		}
	}

	return models;
}