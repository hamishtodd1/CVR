/*
 * It starts out on your belt
 * Take it off, but leave it in midair, it stays
 * Put it in proximity to your belt and look away from it and it'll go there
 * 
 * If you look down, all your thingsToBeUpdated return to your belt
 */

/* Other thingsToBeUpdated
 * In real life: say you're picking things off a bush. If you want to get a few things you pinch, if you want a lot then you scoop. It's a natural action of your hand
 * Ok here: Sphere is both hands
 * Regularizer is pinch
 * 
 * Maybe the general way to do it is "let people just manipulate the atoms and then when they look away, correct them"
 * 
 * Undo is a button on the controller that makes a sign flash up
 * 
 * Staple gun style?
 */

/*
 * sidechain flipper. Should be part of atom movement
 * do-180-degree-side-chain-flip imol chain id resno inscode altconf [function]
Where:
• imol is an integer number
• chain id is a string
• resno is an integer number
• inscode is a string
• altconf is a string
 */

/* 
 * 
 * peptide flipper - once again, grabbing it and moving it!
 * 
 * need these things
 *imol is an integer number
• chain id is a string
• resno is an integer number
• inscode is a string
• altconf
 */

/*
 * atom deleter
 * imol is an integer number
• chain id is a string
• resno is an integer number
• ins code is a string
• at name is a string
• altloc is a string
 */

//autofit best rotamer, remember strange order


function initAtomDeleter(thingsToBeUpdated, holdables, atoms, socket)
{
	var atomDeleter = new THREE.Object3D();
	
	var radius = 0.05;

	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0xFF0000, opacity: 0.7}));
	atomDeleter.add( ball );
	ball.geometry.computeBoundingSphere();
	atomDeleter.boundingSphere = ball.geometry.boundingSphere;

	// var label = new THREE.Mesh( new THREE.TextGeometry( "Deleter: \nhold with index finger and press\nbutton to delete highlighted atoms",
	// 	{size: 0.03, height: 0.0001, font: THREE.defaultFont }), LABEL_MATERIAL );
	// atomDeleter.add(label);
	// label.visible = false;
	
	var atomHighlightStatuses = null;
	atomHighlightStatuses = Array(atoms.length);
	for(var i = 0, il = atoms.length; i<il;i++)
	{
		atomHighlightStatuses[i] = false;
	}

	var deleteRequestTimer = -1;

	deleterOverride = false;
	
	atomDeleter.update = function()
	{
		if(!modelAndMap.model )
		{
			return;
		}
		
		var ourPosition = this.getWorldPosition();
		modelAndMap.model.updateMatrixWorld();
		modelAndMap.model.worldToLocal(ourPosition);
		
		var ourRadiusSq = sq( radius / getAngstrom() );
		
		var highlightColor = new THREE.Color(1,1,1);

		for(var i = 0, il = atoms.length; i < il; i++)
		{
			if( atoms[i].position.distanceToSquared( ourPosition ) < ourRadiusSq )
			{
				atomHighlightStatuses[i] = true;
				modelAndMap.model.geometry.colorAtom(i, highlightColor);
				modelAndMap.model.geometry.attributes.color.needsUpdate = true;
			}
			else if( atomHighlightStatuses[i] === true )
			{
				atomHighlightStatuses[i] = false;
				modelAndMap.model.geometry.colorAtom( i );
				modelAndMap.model.geometry.attributes.color.needsUpdate = true;
			}
		}
		
		if( //this.parent !== scene && this.parent.button1
			deleterOverride
			) 
		{
			if( deleteRequestTimer === -1 )
			{
				for(var i = 0, il = atomHighlightStatuses.length; i < il; i++)
				{
					if(atomHighlightStatuses[i])
					{
						atomHighlightStatuses[i] = false;
						console.log(atoms[i].labelString)
						socket.send("deleteAtom:" + atoms[i].labelString);
						deleteRequestTimer = 0;
					}
				}
			}
		}
		if( 1 < deleteRequestTimer && deleteRequestTimer < 2 )
		{
			console.error( "delete was requested but not happened yet" );
			deleteRequestTimer += 1;
		}
		else if( deleteRequestTimer !== -1 )
		{
			deleteRequestTimer += frameDelta;
		}
	}

	socket.messageReactions.deleteAtom = function(atomLabel)
	{
		deleteRequestTimer = -1;
		deleterOverride = false;
		modelAndMap.model.deleteAtom(atomLabel)
	}

	// socket.messageReactions.moveAtom = function(atomLabelAndNewPosition)
	// {
	// 	atomLabelAndPosition.split(",")
	// 	modelAndMap.model.deleteAtom(atomLabel)
	// 	makeModelFromCootString( messageContents, thingsToBeUpdated, visiBox.planes );

	// 	initTools();
	// }
	
	thingsToBeUpdated.atomDeleter = atomDeleter;
	holdables.atomDeleter = atomDeleter;
	scene.add(atomDeleter);
	atomDeleter.position.z = -FOCALPOINT_DISTANCE;
	atomDeleter.ordinaryParent = atomDeleter.parent;
}



/*Rotamer changer
 * Put it over an atom. Sends to coot, gets different conformations, shows them. They are selectable
 * 
 * This is a specific tool because Coot has specific suggestions. But why shouldn't it have suggestions for an arbitrary atom?
 * 
 */
//function initRotamerChanger(residues)
//{
//	rotamerChanger.update = function()
//	{
//		var selectedResidue = -1;
//		for(var i = 0; i < residues.length; i++)
//		{
//			if(residues[i].position.distanceTo(this.position) < this.selectionRadius)
//		}
//		socket.send("Rotamers needed for residue " + )
//	}
//}

/*
 * "Mutator"
	put it over an amino acid, they all appear
	with their names, 
	as soon as you move your hand over an AA in its array it glows and replaces what's in there. And you should be able to change the angles or whatever without closing this menu
	Grab the one you've just hovered over and that's it. Another way to confirm you're done is to take the ring away
	Ring should gravitate towards AA. And become transparent when it's there
	All AAs should be oriented in the way they would be oriented in the place
	
	Alternative shapes: circle because it creates a circular array, torus so it's like a handle
	Or a torus so that it has a specific plane that you can put the AA in
	
	It should also be possible to select between them using the thumbstick, so you can look at different results without moving your eyes
 */
function initMutator(thingsToBeUpdated, holdables)
{
	mutator = new THREE.Object3D();
	mutator.position.y = -0.1
	
	var handleRadius = 0.035;
	var handleTubeRadius = handleRadius / 3;
	var chunkOut = TAU / 4;
	mutator.handle = new THREE.Mesh(new THREE.TorusGeometry(handleRadius, handleTubeRadius, 7, 31, TAU - chunkOut), new THREE.MeshLambertMaterial({transparent:true,color:0xFFFF00}));
	mutator.handle.rotation.y = TAU / 4;
	mutator.handle.rotation.z = chunkOut / 2;
	mutator.handle.geometry.computeBoundingSphere();
	mutator.add(mutator.handle);	
	mutator.boundingSphere = mutator.handle.geometry.boundingSphere;
	mutator.ordinaryParent = scene;

	var labelMaterial = new THREE.MeshLambertMaterial( { color: 0x156289 } );
	var aaNames = ["leucine","alanine","serine","glycine","valine","glutamic acid","arginine","threonine", //most common
	               "asparagine","aspartic acid","cysteine","glutamine","histidine","isoleucine","lysine","methionine", "phenylalanine","proline","tryptophan","tyrosine"];
	var aaAbbreviations = ["LEU","ALA","SER","GLY","VAL","GLU","ARG","THR",
	               "ASN","ASP","CYS","GLN","HIS","ILE","LYS","MET", "PHE","PRO","TRP","TYR"];
	mutator.AAs = Array(aaNames.length);
	var ourPDBLoader = new THREE.PDBLoader();
	var innerCircleRadius = 0.12;
	var plaque = new THREE.Mesh( new THREE.CircleBufferGeometry(0.432 * innerCircleRadius, 32), new THREE.MeshBasicMaterial({color:0xF0F000, transparent: true, opacity:0.5, side:THREE.DoubleSide}) );
	var textWidth = innerCircleRadius / 3;
	function singleLoop(aaIndex, position)
	{
		ourPDBLoader.load( "data/AAs/" + aaNames[aaIndex] + ".txt", function ( carbonAlphas, geometryAtoms )
			{
				var newPlaque = plaque.clone();
				newPlaque.position.copy(position);
				mutator.add( newPlaque );

				mutator.AAs[aaIndex] = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial( {vertexColors:THREE.VertexColors} ) );
				mutator.AAs[aaIndex].atoms = Array(geometryAtoms.elements.length);
			 	for(var i = 0; i < mutator.AAs[aaIndex].atoms.length; i++)
			 	{
			 		mutator.AAs[aaIndex].atoms[i] = new Atom( geometryAtoms.elements[i], new THREE.Vector3().fromArray(geometryAtoms.attributes.position.array,3*i) );
			 	}

			 	makeMoleculeMesh( mutator.AAs[aaIndex].geometry, mutator.AAs[aaIndex].atoms );
			 	
			 	mutator.AAs[aaIndex].scale.setScalar(0.01); //it can stay at this too
				newPlaque.add( mutator.AAs[aaIndex] );
				
				var textureLoader = new THREE.TextureLoader();
				textureLoader.crossOrigin = true;
				textureLoader.load( "data/AAs/" + aaNames[aaIndex] + ".png", function(texture) 
					{
						var nameMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( textWidth, textWidth * (texture.image.naturalHeight/texture.image.naturalWidth) ), new THREE.MeshBasicMaterial({ map: texture }) );
						nameMesh.position.copy(mutator.AAs[aaIndex].position)
						nameMesh.position.y -= 0.01;
						nameMesh.position.z = 0.01;
						newPlaque.add(nameMesh);

						for(var i = 0, il = mutator.AAs.length; i < il; i++)
						{
							if(!mutator.AAs[i])
							{
								return;
							}
						}
						mutator.update = properUpdate;
					},
					function ( xhr ) {}, function ( xhr ) {console.log( 'texture loading error' );}
				);
			},
			function ( xhr ) {}, //progression function
			function ( xhr ) { console.error( "couldn't load PDB (maybe something about .txt): ", aaNames[aaIndex]  );
		});
	}
	var numInLayer1 = 7;
	for(var i = 0, il = mutator.AAs.length; i < il; i++)
	{
		var position = new THREE.Vector3();
		if(i < numInLayer1)
		{
			position.y = innerCircleRadius;
			position.applyAxisAngle( zAxis, i / numInLayer1 * TAU );
		}
		else
		{
			position.y = innerCircleRadius * 1.87;
			position.applyAxisAngle( zAxis, (i-numInLayer1) / (il-numInLayer1) * TAU );
		}
		
		singleLoop(i,position);
	}

	mutator.update = function(){};
	function properUpdate()
	{
		/*
		 * If it's on an amino acid it's working on that
		 * You take it off, the menu disappears.
		 * While you're holding it it's not looking for anything
		 * Let go of it and 
		 * 		If you've put it on your belt, it stays there
		 * 		else, it works out which is the closest amino acid and goes straight for that. It is basically impossible to move the molecule in time.
		 * 
		 * It starts out on your belt
		 * 
		 * You've selected an amino acid.
		 * We send a message to coot. It mutates and autofits.
		 */
		var mutatorAaAngstrom = getAngstrom();
		if(mutatorAaAngstrom > 0.0125)
		{
			mutatorAaAngstrom = 0.0125;
		}
		for(var i = 0, il = this.AAs.length; i < il; i++)
		{
			this.AAs[i].parent.visible = !(this.parent === scene);
			this.AAs[i].parent.children[0].visible = !(this.parent === scene);
			// this.AAs[i].parent.children[1].visible = !(this.parent === scene);

			this.AAs[i].scale.setScalar(mutatorAaAngstrom);
		}

		if(this.parent !== scene)
		{
			
		}
	}
	
	mutator.position.z = -FOCALPOINT_DISTANCE;
	thingsToBeUpdated.mutator = mutator;
	holdables.mutator = mutator;
	scene.add(mutator);
}