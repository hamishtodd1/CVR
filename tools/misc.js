//environment distances is a bunch of spheres you can stick in there (and leave). They stay in model space


function initEnvironmentDistance()
{
	var environmentDistancer = new THREE.Object3D();
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0xFF69B4, opacity: 0.4}));
	environmentDistancer.add( ball );
	ball.geometry.computeBoundingSphere();
	environmentDistancer.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Environment Distances" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	environmentDistancer.add(label);

	var connectionMeshes = [];
	
	// environmentDistancer.onGrab = function(controller)
	// {
	// 	this.scale.setScalar(1);

	// 	//TODO have one seed many?
	// 	// var newEnvironmentDistancer = new THREE.Mesh(environmentDistancer.geometry, environmentDistancer.material);
	// 	// newEnvironmentDistancer.label = new THREE.Mesh(label.geometry,label.material);
	// 	// scene.add(newEnvironmentDistancer);
	// 	// newEnvironmentDistancer.position.copy(environmentDistancer.position);
	// 	// newEnvironmentDistancer.quaternion.copy(environmentDistancer.quaternion);
	// 	// establishAttachment(newEnvironmentDistancer, controller);

	// 	// newEnvironmentDistancer.update = updateEnvironmentDistancer;

	// 	// holdables.push(newEnvironmentDistancer)
	// 	// thingsToBeUpdated.push(newEnvironmentDistancer);
	// 	// newEnvironmentDistancer.ordinaryParent = newEnvironmentDistancer.parent;
	// }

	var mostRecentlyRequestedResNo = null;

	function updateEnvironmentDistancer()
	{
		var localRadiusSq = sq( radius / getAngstrom() );

		label.visible = this.parent === scene || this.parent === assemblage;

		//label showing length
		//might be nice to also show/otherwise make aware of some typical lengths?
		if(this.parent !== scene && this.parent !== this.ordinaryParent)
		{
			var closestAtom = null;
			var closestAtomDistSq = Infinity;
			for(var i = 0; i < models.length; i++)
			{
				var ourPosition = this.getWorldPosition();
				models[i].updateMatrixWorld();
				models[i].worldToLocal(ourPosition);
				
				for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
				{
					var distanceSq = ourPosition.distanceToSquared(models[i].atoms[j].position);
					if(	distanceSq < localRadiusSq && distanceSq < closestAtomDistSq)
					{
						closestAtom = models[i].atoms[j];
						closestAtomDistSq = ourPosition.distanceToSquared(models[i].atoms[j].position);
					}
				}
			}


			var closestAtomResNo = null;
			if(closestAtom !== null)
			{
				closestAtomResNo = closestAtom.resNo;

				if(mostRecentlyRequestedResNo !== closestAtomResNo )
				{
					var msg = { command: "getEnvironmentDistances" };
					closestAtom.assignAtomSpecToObject( msg );
					socket.send( JSON.stringify( msg ) );
				}
			}

			if( mostRecentlyRequestedResNo !== closestAtomResNo )
			{
				for(var i = connectionMeshes.length-1; i >= 0; i--)
				{
					assemblage.remove( connectionMeshes[i] );
					// connectionMeshes[i].geometry.dispose();
					// connectionMeshes[i].dispose();
					removeSingleElementFromArray(connectionMeshes, connectionMeshes[i])
				}
				mostRecentlyRequestedResNo = closestAtomResNo;
				connectionMeshes.length = 0;
			}
		}
	}
	environmentDistancer.update = updateEnvironmentDistancer;

	//maybe reversed
	var materials = [
		new THREE.MeshLambertMaterial({color:new THREE.Color(0.7,0.7,0.2)}),
		new THREE.MeshLambertMaterial({color:new THREE.Color(0.7,0.2,0.7)})];

	socket.commandReactions["environmentDistances"] = function(msg)
	{
		var model = getModelWithImol( msg.imol );
		var connectionsByColor = [ msg.data[1][0], msg.data[1][1] ]
		for(var i = 0; i < connectionsByColor.length; i++)
		{
			for(var j = 0; j < connectionsByColor[i].length; j++)
			{
				//getting some weirdness, are the indices definitely right?
				var connection = connectionsByColor[i][j];
				
				var start = new THREE.Vector3().fromArray(connection[0]);
				var end = new THREE.Vector3().fromArray(connection[1])
				var length = start.distanceTo(end);

				var numDots = Math.floor(length* 3);
				var connectionMesh = new THREE.Mesh( DottedLineGeometry(numDots,0.07), materials[i]);
				var newY = end.clone().sub(start).multiplyScalar(0.5 / numDots);
				redirectCylinder(connectionMesh, start, newY );
				assemblage.add(connectionMesh);
				connectionMeshes.push(connectionMesh);
			}
		}
	}

	// environmentDistancer.onLetGo()
	// {
	// 	this.scale.setScalar(1/getAngstrom());
	// }
	
	holdables.push(environmentDistancer)
	thingsToBeUpdated.push(environmentDistancer);
	scene.add(environmentDistancer);
	environmentDistancer.ordinaryParent = assemblage; //note discrepancy

	return environmentDistancer;
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