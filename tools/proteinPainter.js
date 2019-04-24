/*
	TODO (probably, might need to think more)
		When you want to lay down a new one, read the atoms near your hand.
			Should be able to grab any residue. It breaks off
			Grab a terminal residue and you start working out of that
			Overlap a residue, and it moves the last Calpha you put down such that it can connect nicely to the calpha of what you've touched
		The new, first, residue still gets put in the same place, but we move the assemblage into the right orientation
		rama
			can be used to detect when you want to "retract"?
		Check you can rotate assemblage at same time
			if not, probably need to check update order
		exported to pdb

	Education
		together with the mutator, you can get anything
		Can have an interactive version of the diagram above this monitor
		Should be able to arbitrarily add atoms. In fact that should be how you make the sidechains
*/

function initProteinPainter()
{
	// let rama = Ramachandran()
	// objectsToBeUpdated.push(rama)
	// scene.add(rama)
	// rama.update = function()
	// {
	// 	if(amides.length >= 2)
	// 	{
	// 		// rama.position.copy(activeAmide.position)

	// 		// let previousNitrogenLocation = cBeta.clone().negate().add(nextCAlpha)
	// 		// let previousAmide = amides[ amides.indexOf(activeAmide) - 1 ]
	// 		// previousNitrogenLocation.applyMatrix( previousAmide.matrix )
	// 		// previousNitrogenLocation.sub(activeAmide.position)

	// 		// let nextCBeta = cBeta.clone().applyQuaternion(activeAmide.quaternion)
			
			

	// 		//when you put a new amide in, the rama moves
	// 		let phi = 0
	// 		let psi = 0
	// 	}
	// 	else
	// 	{
	// 		rama.visible = false
	// 	}
	// }

	let proteinPainterMesh = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.08,0.08,0.002,32), new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.5}))
	proteinPainterMesh.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(TAU/4))
	let proteinPainter = Tool(proteinPainterMesh)

	proteinPainter.onPickUp = function()
	{
		this.rotation.x = -TAU/4
	}

	//different segments. Do not screw around lightly, their positions are expected to be where they currently are
	{
		var amidePdbRead = {
			elements:["C","O","C","N","C"],
			positions:[
				new THREE.Vector3(0.0,		0.0,0.0),
				new THREE.Vector3(HS3*2,	0.0,0.0),
				new THREE.Vector3(HS3,		0.5,0.0),
				new THREE.Vector3(HS3,		1.5,0.0),
				new THREE.Vector3(HS3*2,	2.0,0.0),
			]
		}

		var nTerminusPdbRead = {
			elements:["N", "C", "C"],
			positions:[
				new THREE.Vector3(0.0,	-0.5, -HS3),
				new THREE.Vector3(0.0,	0.0,	0.0),
				new THREE.Vector3(0.0,	-0.5,	HS3)
			]
		}
		var cTerminusPdbRead = {
			elements:["C","O","C","O"],
			positions:[
				new THREE.Vector3(0.0,	0.0,0.0),
				new THREE.Vector3(HS3*2,0.0,0.0),
				new THREE.Vector3(HS3,	0.5,0.0),
				new THREE.Vector3(HS3,	1.5,0.0)
			]
		}

		var sideChainAndHydrogenPdbRead = {
			elements:[
				"H","C","C"],
			positions:[
				new THREE.Vector3(-HS3,	0.5, 	0.0),
				new THREE.Vector3(0.0,	-0.5,	HS3),
				new THREE.Vector3(0.0,	0.0,	0.0),
			]
		}

		var allOfThem = [ amidePdbRead, nTerminusPdbRead, sideChainAndHydrogenPdbRead, cTerminusPdbRead ];
		for(var j = 0; j < allOfThem.length; j++)
		{
			for(var i = 0; i < allOfThem[j].positions.length; i++)
			{
				allOfThem[j].positions[i].y *= Math.sqrt(1.5)
				allOfThem[j].positions[i].multiplyScalar(1.8/Math.sqrt(1.5));
			}
		}

		var nTerminusAtoms = [];
		for(var i = 0; i < nTerminusPdbRead.elements.length; i++)
		{
			nTerminusAtoms.push( new Atom( nTerminusPdbRead.elements[i], nTerminusPdbRead.positions[i].clone() ) );
		}
		var nTerminus = makeMoleculeMesh( nTerminusAtoms, false );

		var amideAtoms = [];
		for(var i = 0; i < amidePdbRead.elements.length; i++)
		{
			amideAtoms.push( new Atom( amidePdbRead.elements[i], amidePdbRead.positions[i].clone() ) );
		}
		// var bondData = [[[[],[],1,0,2],[[],[],1,2,3]],[],[[[],[],1,1,2]],[[[],[],1,3,4],[[],[],1,3,5]],[],[],[],[],[],[]];
		// changeBondBetweenAtomsToDouble(bondData, 1,2);
		var amide = makeMoleculeMesh( amideAtoms, false );
		var amideDiagonalLength = amide.atoms[ amide.atoms.length - 1 ].position.length();

		var cTerminusAtoms = [];
		for(var i = 0; i < cTerminusPdbRead.elements.length; i++)
		{
			cTerminusAtoms.push( new Atom( cTerminusPdbRead.elements[i], cTerminusPdbRead.positions[i].clone() ) );
		}
		// var bondData = [[[[],[],1,0,2],[[],[],1,2,3]],[],[[[],[],1,1,2],[[],[],1,3,4]],[],[],[],[],[],[],[]];
		// changeBondBetweenAtomsToDouble(bondData, 1,2);
		var cTerminus = makeMoleculeMesh( cTerminusAtoms, false );	 	

		var sideChainAndHydrogenAtoms = [];
		for(var i = 0; i < sideChainAndHydrogenPdbRead.elements.length; i++)
		{
			sideChainAndHydrogenAtoms.push( new Atom( sideChainAndHydrogenPdbRead.elements[i], sideChainAndHydrogenPdbRead.positions[i].clone() ) );
		}
		var sideChainAndHydrogen = makeMoleculeMesh( sideChainAndHydrogenAtoms, false );

		var sideChainAndHydrogenActualSpindle = new THREE.Vector3().addVectors(sideChainAndHydrogenPdbRead.positions[0],sideChainAndHydrogenPdbRead.positions[1]).normalize();
		var sideChainAndHydrogenActualLeft = sideChainAndHydrogenActualSpindle.clone().cross(sideChainAndHydrogenPdbRead.positions[0]).cross(sideChainAndHydrogenActualSpindle).normalize();
		var cBeta = amidePdbRead.positions[2].clone();
		var nextCAlpha = amidePdbRead.positions[amidePdbRead.positions.length-1].clone();
		var nextCAlphaAngleToCBetaSpindle = nextCAlpha.angleTo(cBeta)
	}

	let amides = [];
	let sideChainAndHydrogens = []
	let activeAmide = null;

	{
		let placementIndicatorMesh = new THREE.Mesh(amide.geometry.clone(), amide.material.clone())
		placementIndicatorMesh.add(nTerminus.clone())
		placementIndicatorMesh.material.transparent = true
		placementIndicatorMesh.material.opacity = 0.7
		proteinPainter.add(placementIndicatorMesh)
		placementIndicatorMesh.update = function()
		{
			this.scale.setScalar(getAngstrom() )
			this.visible = ( handControllers.indexOf(proteinPainter.parent) !== -1 && amides.length === 0 )
		}
		objectsToBeUpdated.push(placementIndicatorMesh)
	}

	function createActiveAmideAtPosition(position)
	{
		let newAmide = amide.clone()
		activeAmide = newAmide;
		amides.push(newAmide);

		newAmide.position.copy(position);
		assemblage.add(newAmide)

		return newAmide;
	}

	{
		var selectorFlap = new THREE.Mesh(new THREE.Geometry(),new THREE.MeshLambertMaterial({color:0x000000, side:THREE.DoubleSide}))
		selectorFlap.geometry.vertices.push(new THREE.Vector3(),new THREE.Vector3(0.02,0.5,0),new THREE.Vector3(-0.02,0.5,0))
		selectorFlap.geometry.faces.push(new THREE.Face3(0,1,2))
		scene.add(selectorFlap)
		var pointInHand = new THREE.Vector3(0,0.36,0)
	}

	function planeAngle(origin,z,nonProjectedX,nonProjectedP)
	{
		//hopefully not collinear
		let n = z.clone().sub(origin).normalize()
		let plane = new THREE.Plane( n, 0 )
		let x = plane.projectPoint(nonProjectedX,new THREE.Vector3()).normalize()
		let y = n.clone().cross(x)

		let p = plane.projectPoint(nonProjectedP,new THREE.Vector3())
		let p2D = new THREE.Vector2(p.dot(x), p.dot(y))
		return p2D.angle()
	}

	let activeSideChainAndHydrogen = null;

	// let illustrative = new THREE.Mesh(new THREE.BoxGeometry(getAngstrom(),getAngstrom(),getAngstrom()))
	// assemblage.add(illustrative)

	let amidePlaneIndicator = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1))
	assemblage.add(amidePlaneIndicator)

	proteinPainter.whileHeld = function(handPositionInAssemblage)
	{
		amidePlaneIndicator.position.copy(handPositionInAssemblage)

		if( Math.abs(assemblage.scale.x - 0.026) > 0.005 )
		{
			let centerInAssemblageSpace = visiBox.getCenterInAssemblageSpace()
			let centerInWorld = assemblage.localToWorld( centerInAssemblageSpace.clone() )

			assemblage.scale.setScalar( assemblage.scale.x + (0.026-assemblage.scale.x) * 0.1 )
			assemblage.updateMatrixWorld()
			let centerMovementDueToScale = assemblage.localToWorld(centerInAssemblageSpace.clone())
			assemblage.position.sub(centerMovementDueToScale).add(centerInWorld)

			handPositionInAssemblage.copy(this.parent.position)
			assemblage.updateMatrixWorld()
			assemblage.worldToLocal(handPositionInAssemblage)
		}

		if( !this.parent.button1 )
		{
			//we're going to find the closest atom, we need its nitrogen and its cBeta
			//draw plane for that amide
			//highlight
			// let worldPosition = assemblage.localToWorld(handPositionInAssemblage.clone())
			// let closestCAlpha = getClosestAtomToWorldPosition(worldPosition, function(atom)
			// {
			// 	return atom.name === " CA "
			// })
		}
		else
		{
			let hand = proteinPainter.parent

			if( amides.length === 0 )
			{
				let newAmide = createActiveAmideAtPosition(handPositionInAssemblage)
				newAmide.add(nTerminus.clone())
			}

			let prevCAlphaAcrossAmide = nextCAlpha.clone().applyQuaternion(activeAmide.quaternion).normalize()
			let prevCAlphaToHand = handPositionInAssemblage.clone().sub(activeAmide.position)
			let lengthOnAmide = prevCAlphaToHand.dot(prevCAlphaAcrossAmide)

			//they ought to disappear and reappear at the same distance so you can put one in then change your mind back and forth
			if( lengthOnAmide > amideDiagonalLength * 0.75 
				&& amides.length < 2 )
			{
				let newAmidePosition = nextCAlpha.clone();
				activeAmide.updateMatrixWorld();
				activeAmide.localToWorld(newAmidePosition)
				assemblage.worldToLocal(newAmidePosition)

				let newAmide = createActiveAmideAtPosition(newAmidePosition)

				let newSideChainAndHydrogen = sideChainAndHydrogen.clone();
				newSideChainAndHydrogen.position.copy(activeAmide.position)
				assemblage.add(newSideChainAndHydrogen);

				activeSideChainAndHydrogen = newSideChainAndHydrogen;
				sideChainAndHydrogens.push(activeSideChainAndHydrogen)
			}

			// if( lengthOnAmide < -amideDiagonalLength / 2 )
			// {
			// 	let indexOfAmideToChangeTo = amides.indexOf(activeAmide)-1
			// 	if( indexOfAmideToChangeTo > -1 )
			// 	{
			// 		activeAmide = amides[indexOfAmideToChangeTo]
			// 		if( indexOfAmideToChangeTo === 0 )
			// 		{
			// 			activeSideChainAndHydrogen = null
			// 		}
			// 		else
			// 		{
			// 			activeSideChainAndHydrogen = sideChainAndHydrogens[indexOfAmideToChangeTo-1]
			// 		}

			// 		removeAndRecursivelyDispose(amides.pop())
			// 		removeAndRecursivelyDispose(sideChainAndHydrogens.pop())
			// 	}
			// }

			if(activeSideChainAndHydrogen)
			{
				let prevNitrogen = cBeta.clone().negate().applyQuaternion(amides[amides.indexOf(activeAmide)-1].quaternion)
				{
					let activeAmideToNextCAlpha = prevCAlphaToHand.clone().setLength(nextCAlpha.length())

					let cBetaDist = cBeta.length()
					let nDist = cBeta.length() //not exactly
					let cBetaToNextCAlphaDist = cBeta.distanceTo(nextCAlpha)
					let prevNitrogenToCBetaDistance = Math.sqrt( sq(cBetaDist) + sq(nDist) - (2 * nDist * cBetaDist * Math.cos(TETRAHEDRAL_ANGLE ) ) )
					
					let possibleCBetas = tetrahedronTops(
						new THREE.Vector3(),
						activeAmideToNextCAlpha,
						prevNitrogen,
						cBetaDist,cBetaToNextCAlphaDist,prevNitrogenToCBetaDistance)

					let newCBeta = null

					if(possibleCBetas === false)
					{
						selectorFlap.visible = false

						let axis = prevNitrogen.clone().cross(prevCAlphaToHand).normalize()
						
						activeAmideToNextCAlpha.copy(prevNitrogen).setLength(nextCAlpha.length())
						let directionToSway = prevCAlphaToHand.angleTo(prevNitrogen) > TETRAHEDRAL_ANGLE ? 1:-1
						activeAmideToNextCAlpha.applyAxisAngle(axis, TETRAHEDRAL_ANGLE + directionToSway * cBeta.angleTo(nextCAlpha) )

						newCBeta = prevNitrogen.clone()
						newCBeta.applyAxisAngle(axis, TETRAHEDRAL_ANGLE )
					}
					else
					{
						selectorFlap.geometry.vertices[0].copy(activeAmide.getWorldPosition(new THREE.Vector3()))
						let handToWorldActiveAmide = selectorFlap.geometry.vertices[0].clone().sub(hand.position)

						//plan: we're going to make the plane and change this to that formalism
						//then use that to get the options too
						//could get the point in between

						//takes place in hand space
						{
							hand.updateMatrixWorld()
							let handToWorldPointInHand = hand.localToWorld(pointInHand.clone()).sub(hand.position)
							let handPlane = new THREE.Plane(handToWorldActiveAmide.clone().normalize(),0)
							var pointInHandSquashedToPlane = handPlane.projectPoint(handToWorldPointInHand.clone(), new THREE.Vector3())

							let possibleCBetasOnPlane = [new THREE.Vector3(),new THREE.Vector3()]
							let angles = Array(2)
							for(let i = 0; i < 2; i++)
							{
								let possibleCBetaWorld = possibleCBetas[i].clone().add(activeAmide.position)
								assemblage.localToWorld(possibleCBetaWorld)
								possibleCBetaWorld.sub(hand.position)
								handPlane.projectPoint(possibleCBetaWorld, possibleCBetasOnPlane[i] )

								angles[i] = possibleCBetasOnPlane[i].angleTo(pointInHandSquashedToPlane)
							}
							let angleBetweenPossibilities = possibleCBetasOnPlane[0].angleTo(possibleCBetasOnPlane[1])

							let closerIndex = angles[0] < angles[1] ? 0:1
							let angularLimitExceeded = angles[1-closerIndex] > angleBetweenPossibilities
							if( angularLimitExceeded )
							{
								let len = pointInHandSquashedToPlane.length()
								pointInHandSquashedToPlane.copy( possibleCBetasOnPlane[ closerIndex ] )
								pointInHandSquashedToPlane.setLength( len )
							}
							newCBeta = possibleCBetas[ closerIndex ]
						}

						let worldPointInHandSquashedToPlane = pointInHandSquashedToPlane.clone().add(hand.position)

						pointInHand.copy(worldPointInHandSquashedToPlane)
						hand.worldToLocal( pointInHand )

						selectorFlap.geometry.vertices[1].copy(worldPointInHandSquashedToPlane).sub(selectorFlap.geometry.vertices[0])
						selectorFlap.geometry.vertices[2].copy(worldPointInHandSquashedToPlane).sub(selectorFlap.geometry.vertices[0])

						selectorFlap.geometry.vertices[2].projectOnVector(handToWorldActiveAmide)

						let lengthScaling = getAngstrom() * cBeta.length() * 3 / selectorFlap.geometry.vertices[2].length()
						selectorFlap.geometry.vertices[1].multiplyScalar(lengthScaling)
						selectorFlap.geometry.vertices[2].multiplyScalar(lengthScaling)
						selectorFlap.geometry.vertices[1].add(selectorFlap.geometry.vertices[0])
						selectorFlap.geometry.vertices[2].add(selectorFlap.geometry.vertices[0])

						selectorFlap.geometry.verticesNeedUpdate = true

						//could have selectorflap connect hand to nextCAlpha when not inside the donut

						//if you've only just come in, could reposition 
						selectorFlap.visible = true
					}

					{
						let newCBetaAxis = newCBeta.clone().normalize()
						activeAmide.quaternion.setFromUnitVectors(cBeta.clone().normalize(),newCBetaAxis)

						let localNextCAlpha = activeAmideToNextCAlpha.clone().applyQuaternion(activeAmide.quaternion.clone().inverse())

						let orthogonalCurrentCAlpha = nextCAlpha.clone().projectOnPlane(cBeta).normalize()
						let orthogonalNextCAlpha = localNextCAlpha.projectOnPlane(cBeta).normalize()
						let secondQuat = new THREE.Quaternion().setFromUnitVectors(orthogonalCurrentCAlpha,orthogonalNextCAlpha)
						activeAmide.quaternion.multiply(secondQuat)
					}
				}

				//repelling
				{
					let cBetaDirection = cBeta.clone().applyQuaternion(activeAmide.quaternion).normalize()

					let intendedSpindle = prevNitrogen.clone().normalize().lerp(cBetaDirection,0.5).normalize().negate()
					activeSideChainAndHydrogen.quaternion.setFromUnitVectors( sideChainAndHydrogenActualSpindle,intendedSpindle )

					// let intendedLeft = cBetaDirection.clone().cross(intendedSpindle).normalize();
					// let leftInCurrentSpace = sideChainAndHydrogenActualLeft.clone().applyQuaternion(activeSideChainAndHydrogen.quaternion);
					// activeSideChainAndHydrogen.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors( leftInCurrentSpace, intendedLeft ) );
				}
			}
		}
		
		if(this.parent.button1Old && !this.parent.button1)
		{
			castOffNewChain();
		}
	}

	function castOffNewChain()
	{
		if( !activeAmide )
		{
			return;
		}

		let newCTerminus = cTerminus.clone();
		newCTerminus.quaternion.copy(activeAmide.quaternion)
		newCTerminus.position.copy(activeAmide.position)
		while( activeAmide.children.length )
		{
			newCTerminus.add(activeAmide.children[0]);
		}

		assemblage.add(newCTerminus);
		assemblage.remove(activeAmide);
		removeAndRecursivelyDispose(amides.pop())
		if( sideChainAndHydrogens.length > 0 )
		{
			removeAndRecursivelyDispose(sideChainAndHydrogens.pop())
		}

		//make the thing a chain in its own right
		for(let i = 0; i < amides.length; i++)
		{
			//siiiiigh, the atoms do need to be moved by rigid mover
		}

		activeAmide = null;
		amides = [];
		activeSideChainAndHydrogen = null;
		sideChainAndHydrogens = []
	}

	proteinPainter.onLetGo = function()
	{
		this.rotation.x = 0
		castOffNewChain()
	}

	return proteinPainter;
}

// Sending it off to coot
// many cAlphas need deleting - sidechain AND both amide planes
// take all the atoms in the originals, "clone" them for each copy
// take their positions, convert them from local to assemblage space
// 	If it's a new chain, have to make that, then residues start at 0
// 	Otherwise,
// 	add_new_chain does exist
// 	You make this thing, you send it off to coot, coot probably refines it, then you get it back and delete.