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


	"residues_distortions(imol, residues_spec_list)"
 */


//this is the default thing that your hands do
//you know so well what your hand is doing, do you HAVE to have refinement turned on for this?
function initRigidBodyMover(controllers, models)
{
	/*
		Replaces peptide flipper and sidechainflipper.
		Can work during refinement or not!

		all residues in a spherical region surrounding your hand are refining
		A switch that says "refinement on/off"
	*/

	var attachedControllerIndex = 0;

	var rigidBodyMover = new THREE.Object3D();
	var ball = new THREE.LineSegments( new THREE.WireframeGeometry(new THREE.EfficientSphereBufferGeometry(1) ) );
	rigidBodyMover.add(ball);
	ball.geometry.computeBoundingSphere();
	rigidBodyMover.boundingSphere = ball.geometry.boundingSphere;
	controllers[attachedControllerIndex].add(rigidBodyMover);

	var label = makeTextSign( "Rigid Mover" );
	label.position.z = radius;
	rigidBodyMover.add(label);

	var capturedAtoms = [];
	var localCapturedAtomPositions = [];

	rigidBodyMover.update = function()
	{
		if( controllers[attachedControllerIndex].button1 )
		{
			controllers[attachedControllerIndex].updateMatrixWorld();

			if( !controllers[attachedControllerIndex].button1Old )
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
							controllers[attachedControllerIndex].worldToLocal(localCapturedAtomPositions[localCapturedAtomPositions.length-1]);
						}
					}
				}
			}

			for(var i = 0, il = capturedAtoms.length; i < il; i++)
			{
				var model = getModelWithImol(capturedAtoms[i].imol);
				model.updateMatrixWorld()
				
				var newAtomPosition = localCapturedAtomPositions[i].clone();
				controllers[attachedControllerIndex].localToWorld(newAtomPosition);
				model.worldToLocal(newAtomPosition);
				model.setAtomPosition(capturedAtoms[i], newAtomPosition)
			}
		}
		else
		{
			if( controllers[attachedControllerIndex].button1Old )
			{
				capturedAtoms = [];
				localCapturedAtomPositions = [];
			}

			//a cylinder. It can encompass a bunch of residues that way
			//it has a default size
			//bring your other hand over and you can increase it
		}
	}

	// thingsToBeUpdated.push(rigidBodyMover);

	return rigidBodyMover;
}

function initAutoRotamer(socket, models)
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