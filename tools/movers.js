/* 
	Mover
		Both hands come together to make a sphere appear
		Bit of kinematics?
		Refine by default

 * Ok here: 
 * Regularizer is pinch
 */

/* Refinement
	
	startRefinement(imol, residue_list)
	    refine_residues(imol, residue_list) //hope this doesn't block??

	getIntermediateAtoms(newDrags):
		for(drag in newDrags)
	    intermediateAtoms = get_intermediate_atoms_bonds_representation()
	    if( intermediateAtoms == False )
	    	//we're finished, need to send final thing
	    else:
	    	if()
	    	intermediate_atoms_distortions(residues_spec_list)
	    	jsify_and_send( intermediateAtoms )

	acceptRefinement():
	    accept_regularizement()
	    sendAtomPositions

	pullAtom(atom_spec, position):
	    drag_intermediate_atom_py(atom_spec, position)

	rejectCurrentRefinement():
	    clear_atom_pull_restraint()
	    clear_up_moving_atoms()
	    sendAtomPositions

	intermediate_atoms_distortions(residues_spec_list)

	continue to hold the thing in place and it continues to send force vectors


	"residues_distortions(imol, residues_spec_list)"

	You may want to see environment distances as the things are moving
	
 */


//this is the default thing that your hands do
//you know so well what your hand is doing, do you HAVE to have refinement turned on for this?
function initRigidBodyMover( models )
{
	/*
		Replaces peptide flipper and sidechainflipper.
		Can work during refinement or not!

		all residues in a spherical region surrounding your hand are refining
		A switch that says "refinement on/off"

		Next plan: make it a sphere unless your hands are close, in which case it's a pill shape
		One end in each hand

		Or, two spheres, and all the residues between them, along the chain, get highlighted
			Paul says this may help select them https://github.com/pemsley/coot/blob/f4630d7da146ecece648600f7208c46809072063/python/fitting.py
			python_representation(imol) - you get a list of chain, chains have list of residues, residues have list of atoms, atoms have list of atom-properties.  You can find your chain by chain-id, and look for the residue numbers in that chain.
	*/

	var rigidBodyMover = new THREE.Object3D();
	var ball = new THREE.LineSegments( new THREE.WireframeGeometry(new THREE.EfficientSphereGeometry(1) ) );
	rigidBodyMover.add(ball);
	rigidBodyMover.scale.setScalar(0.1)
	ball.geometry.computeBoundingSphere();
	rigidBodyMover.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Rigid Mover" );
	label.position.z = 1;
	label.scale.setScalar(1/3)
	rigidBodyMover.add(label);

	var capturedAtoms = [];
	var localCapturedAtomPositions = [];

	rigidBodyMover.update = function()
	{
		label.visible = this.parent === scene;

		if(this.parent !== this.ordinaryParent)
		{
			console.error("need to notify server about movements!")
			// msg.x = 
			// msg.x = 
			// msg.z = 

			if( this.parent.button1 )
			{
				this.parent.updateMatrixWorld();

				if( !this.parent.button1Old )
				{
					var localRadiusSq = sq(this.scale.x / getAngstrom())
					for(var i = 0; i < models.length; i++)
					{
						var ourPosition = this.getWorldPosition();
						models[i].updateMatrixWorld();
						models[i].worldToLocal(ourPosition);
						
						for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
						{
							if(models[i].atoms[j].position.distanceToSquared( ourPosition ) < localRadiusSq )
							{
								capturedAtoms.push(models[i].atoms[j]);
								localCapturedAtomPositions.push(models[i].atoms[j].position.clone());
								models[i].localToWorld(localCapturedAtomPositions[localCapturedAtomPositions.length-1]);
								this.parent.worldToLocal(localCapturedAtomPositions[localCapturedAtomPositions.length-1]);
							}
						}
					}
				}

				for(var i = 0, il = capturedAtoms.length; i < il; i++)
				{
					var model = getModelWithImol(capturedAtoms[i].imol);
					model.updateMatrixWorld()
					
					var newAtomPosition = localCapturedAtomPositions[i].clone();
					this.parent.localToWorld(newAtomPosition);
					model.worldToLocal(newAtomPosition);
					model.setAtomPosition(capturedAtoms[i], newAtomPosition)
				}
			}
		}

		if( !this.parent.button1 && this.parent.button1Old )
		{
			capturedAtoms = [];
			localCapturedAtomPositions = [];
		}
	}

	holdables.push(rigidBodyMover)
	scene.add(rigidBodyMover);
	rigidBodyMover.ordinaryParent = rigidBodyMover.parent;
	thingsToBeUpdated.push(rigidBodyMover);

	return rigidBodyMover;
}

function initAutoRotamer( models )
{
	/* Rotamer changer
	 * Put it over an atom. Sends to coot, gets different conformations, shows them. They are selectable
	 * This is a specific tool because Coot has specific suggestions. But why shouldn't it have suggestions for an arbitrary atom?
	 */

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

		if(this.parent !== scene )
		{
			if( this.parent.button1 && !this.parent.button1Old )
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
							//TODO this gets sent more than you would like
						}
					}
				}
			}
			else
			{
				highlightResiduesOverlappingSphere(this, ourRadiusSq)
			}
		}
	}

	autoRotamer.onLetGo = turnOffAllHighlights;
	
	thingsToBeUpdated.push(autoRotamer);
	holdables.push(autoRotamer)
	scene.add(autoRotamer);
	autoRotamer.ordinaryParent = autoRotamer.parent;

	return autoRotamer;
}