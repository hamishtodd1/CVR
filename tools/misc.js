/* 
	Mover
		Both hands come together to make a sphere appear
		Bit of kinematics?
		Refine by default

In real life: say you're picking things off a bush. If you want to get a few things you pinch, if you want a lot then you scoop. It's a natural action of your hand
 * Ok here: 
 * Regularizer is pinch
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

//autofit best rotamer
/*Rotamer changer
 * Put it over an atom. Sends to coot, gets different conformations, shows them. They are selectable
 * 
 * This is a specific tool because Coot has specific suggestions. But why shouldn't it have suggestions for an arbitrary atom?
 * 
 */
function initAutoRotamer(socket, models)
{
	var autoRotamer = new THREE.Object3D();
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0x00FF00, opacity: 0.7}));
	autoRotamer.add( ball );
	ball.geometry.computeBoundingSphere();
	autoRotamer.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Auto rotamer" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	autoRotamer.add(label);
	
	autoRotamer.update = function()
	{
		label.visible = this.parent === scene;

		var ourRadiusSq = sq( radius / getAngstrom() );

		if(this.parent !== scene && this.parent.button1 && !this.parent.button1Old )
		{
			for(var i = 0; i < models.length; i++)
			{
				var ourPosition = this.getWorldPosition();
				models[i].updateMatrixWorld();
				models[i].worldToLocal(ourPosition);
				
				for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
				{
					if( models[i].atoms[j].position.distanceToSquared( ourPosition ) < ourRadiusSq )
					{
						var msg = {command:"autoFitBestRotamer"};
						models[i].atoms[j].assignAtomSpecToMessage( msg );
						socket.send(JSON.stringify(msg));
					}
				}
			}
		}
	}
	
	thingsToBeUpdated.push(autoRotamer);
	holdables.push(autoRotamer)
	scene.add(autoRotamer);
	autoRotamer.ordinaryParent = autoRotamer.parent;

	return autoRotamer;
}


function initAtomLabeller(models)
{
	var atomLabeller = new THREE.Object3D();
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0x0000FF, opacity: 0.7}));
	atomLabeller.add( ball );
	ball.geometry.computeBoundingSphere();
	atomLabeller.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Atom Labeller" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	atomLabeller.add(label);
	
	atomLabeller.update = function()
	{
		label.visible = this.parent === scene;

		var ourRadiusSq = sq( radius / getAngstrom() );

		if(this.parent !== scene)
		{
			for(var i = 0; i < models.length; i++)
			{
				var ourPosition = this.getWorldPosition();
				models[i].updateMatrixWorld();
				models[i].worldToLocal(ourPosition);
				
				for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
				{
					var labelVisibility = models[i].atoms[j].position.distanceToSquared( ourPosition ) < ourRadiusSq;
					models[i].atoms[j].setLabelVisibility(labelVisibility);
				}
			}
		}
	}
	
	thingsToBeUpdated.push(atomLabeller);
	holdables.push(atomLabeller)
	scene.add(atomLabeller);
	atomLabeller.ordinaryParent = atomLabeller.parent;

	return atomLabeller;
}

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
function initMutator()
{
	var mutator = new THREE.Object3D();
	
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

	var label = makeTextSign( "Mutator" );
	label.position.z = handleRadius+handleTubeRadius;
	label.scale.setScalar(handleTubeRadius)
	mutator.add(label);

	var labelMaterial = new THREE.MeshLambertMaterial( { color: 0x156289 } );
	var aaNames = ["leucine","alanine","serine","glycine","valine","glutamic acid","arginine","threonine", //most common
	               "asparagine","aspartic acid","cysteine","glutamine","histidine","isoleucine","lysine","methionine", "phenylalanine","proline","tryptophan","tyrosine"];
	var aaAbbreviations = ["LEU","ALA","SER","GLY","VAL","GLU","ARG","THR",
	               "ASN","ASP","CYS","GLN","HIS","ILE","LYS","MET", "PHE","PRO","TRP","TYR"];
	mutator.AAs = Array(aaNames.length);
	var ourPDBLoader = new THREE.PDBLoader();
	var innerCircleRadius = 0.12;
	var plaque = new THREE.Mesh( new THREE.CircleBufferGeometry(0.432 * innerCircleRadius, 32), new THREE.MeshBasicMaterial({color:0xF0F000, transparent: true, opacity:0.5, side:THREE.DoubleSide}) );
	var textHeight = innerCircleRadius / 9;
	function singleLoop(aaIndex, position)
	{
		ourPDBLoader.load( "data/AAs/" + aaNames[aaIndex] + ".txt", function ( carbonAlphas, geometryAtoms )
			{
				var newPlaque = plaque.clone();
				newPlaque.position.copy(position);
				mutator.add( newPlaque );

				var aaAtoms = Array(geometryAtoms.elements.length);
			 	for(var i = 0; i < aaAtoms.length; i++)
			 	{
			 		aaAtoms[i] = new Atom( geometryAtoms.elements[i], new THREE.Vector3().fromArray(geometryAtoms.attributes.position.array,3*i) );
			 	}
			 	
			 	mutator.AAs[aaIndex] = makeMoleculeMesh( aaAtoms, false );
			 	
			 	mutator.AAs[aaIndex].scale.setScalar(0.01); //it can stay at this too
				newPlaque.add( mutator.AAs[aaIndex] );
				
				var nameMesh = makeTextSign( aaNames[aaIndex] );
				nameMesh.scale.setScalar(textHeight);
				nameMesh.position.copy(mutator.AAs[aaIndex].position)
				nameMesh.position.y -= 0.014;
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
			position.applyAxisAngle( zVector, i / numInLayer1 * TAU );
		}
		else
		{
			position.y = innerCircleRadius * 1.87;
			position.applyAxisAngle( zVector, (i-numInLayer1) / (il-numInLayer1) * TAU );
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
			this.AAs[i].parent.children[0].visible = this.AAs[i].parent.visible;
			this.AAs[i].parent.children[1].visible = this.AAs[i].parent.visible;

			this.AAs[i].scale.setScalar(mutatorAaAngstrom);
		}

		label.visible = this.parent === scene;
	}
	
	thingsToBeUpdated.push(mutator);
	holdables.push(mutator);
	scene.add(mutator);
	return mutator;
}

function initPointer()
{
	var pointerRadius = 0.03;
	var pointer = new THREE.Mesh(
		new THREE.CylinderBufferGeometry( pointerRadius,pointerRadius, pointerRadius * 4,32 ),
		new THREE.MeshPhongMaterial({color:0x00FFFF })
	);
	pointer.geometry.computeBoundingSphere();
	pointer.boundingSphere = pointer.geometry.boundingSphere;

	var laserRadius = 0.001;
	var laser = new THREE.Mesh(
		new THREE.CylinderBufferGeometryUncentered( laserRadius, 2), 
		new THREE.MeshBasicMaterial({color:0xFF0000, /*transparent:true,opacity:0.4*/}) 
	);
	pointer.add(laser);
	laser.visible = false;

	var label = makeTextSign( "pointer" );
	label.position.z = pointerRadius;
	label.rotation.z = -TAU/4;
	label.scale.setScalar(pointerRadius)
	pointer.add(label);
	pointer.rotation.z = TAU/4;

	pointer.update = function()
	{
		label.visible = this.parent === scene;
		
		if( this.parent !== scene )
		{
			laser.visible = this.parent.button1;
		}
		else
		{
			laser.visible = false;
		}
	}

	thingsToBeUpdated.push(pointer);
	holdables.push(pointer);
	pointer.ordinaryParent = scene;

	pointer.position.set(0,-0.4,0.1)
	scene.add(pointer);
	return pointer;
}