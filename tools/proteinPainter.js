/*
	TODO (probably, might need to think more)
		When you want to lay down a new one, read the atoms near your hand.
			Should be able to grab any residue. It breaks off
			Grab a terminal residue and you start working out of that
			Overlap a residue, and it moves the last Calpha you put down such that it can connect nicely to the calpha of what you've touched
		The new, first, residue still gets put in the same place, but we move the assemblage into the right orientation
		rama
		Hand works a bit better
		Check you can rotate assemblage at same time
			if not, probably need to check update order
		no connectivity?
		Integrate
			needs to be able to be moved by rigid mover
			exported to pdb
		Tau dial?

	Might be significantly better with carbon atom points
	
	Rama
		"abstract over" the set of all rotamers:
			You get a circle of psi's of different colors given the current phi, abstracting over position of next Calpha
			You get a circle of phi's of different colors given the current psi, abstracting over position of next Calpha
			And if you hold an extra button, a teeny bit of tau, a little lever. Is this all that's ever needed?
			Like this is super interesting because it cooooould be protein design.
				Would you ever want to design it that way?
				Can you be compelled to make an alpha helix this way?
			Ramachandran data can also be used to detect when you want to "retract"
			Lampshade-like toroidal region

	Education
		together with the mutator, you can get anything
		Can have an interactive version of the diagram above this monitor
		Should be able to arbitrarily add atoms. In fact that should be how you make the sidechains
*/

function initProteinPainter()
{
	let rama = Ramachandran()
	objectsToBeUpdated.push(rama)
	scene.add(rama)
	rama.update = function()
	{
		if(amides.length >= 2)
		{
			// rama.position.copy(activeAmide.position)

			// let previousNitrogenLocation = cBeta.clone().negate().add(nextCAlpha)
			// let previousAmide = amides[ amides.indexOf(activeAmide) - 1 ]
			// previousNitrogenLocation.applyMatrix( previousAmide.matrix )
			// previousNitrogenLocation.sub(activeAmide.position)

			// let nextCBeta = cBeta.clone().applyQuaternion(activeAmide.quaternion)
			
			

			//when you put a new amide in, the rama moves
			let phi = 0
			let psi = 0
		}
		else
		{
			rama.visible = false
		}
	}

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
		var fakeAmide = amide.clone()
		fakeAmide.material = new THREE.MeshBasicMaterial()
		assemblage.add(fakeAmide)
		fakeAmide.material.vertexColors = 0

		// var dottedLine = new THREE.Mesh(
		// 	DottedLineGeometry(99,0.002),
		// 	new THREE.MeshLambertMaterial());
		// assemblage.add(dottedLine)
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

	proteinPainter.whileHeld = function(handPositionInAssemblage)
	{
		if( this.parent.button1 )
		{
			if( amides.length === 0 )
			{
				if( Math.abs(assemblage.scale.x - 0.026) > 0.01 )
				{
					console.log("may want it smaller/bigger")
				}

				//TODO you might be wanting to continue the chain
				// let closestAtom = getClosestAtom()
				//find the cAlpha
				// recursivelySearchBondPartners(atom,function(atom)
				// {
				// 	return atom.name === " CB "
				// })

				// function recursivelySearchBondPartners(atom,conditionalFunction)
				// {
				// 	for(let i = 0; i < atom.bondPartners.length; i++)
				// 	{
				// 		if( conditionalFunction(atom.bondPartners[i]) )
				// 		{
				// 			return atom.bondPartners[i]
				// 		}
				// 	}
				// }

				let newAmide = createActiveAmideAtPosition(handPositionInAssemblage)
				newAmide.add(nTerminus.clone())
			}

			let prevCAlphaAcrossAmide = nextCAlpha.clone().applyQuaternion(activeAmide.quaternion).normalize()
			let prevCAlphaToHand = handPositionInAssemblage.clone().sub(activeAmide.position)
			let lengthOnAmide = prevCAlphaToHand.dot(prevCAlphaAcrossAmide)

			if( lengthOnAmide > amideDiagonalLength * 0.75 ) // && amides.length < 2 )
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






			let toolQuaternionInAssemblage = proteinPainter.quaternion.clone().premultiply( proteinPainter.parent.quaternion )
			toolQuaternionInAssemblage.premultiply( assemblage.quaternion.getInverse() )
			if(assemblage.parent !== scene)
			{
				toolQuaternionInAssemblage.premultiply( assemblage.parent.quaternion.getInverse() )
			}
			activeAmide.quaternion.copy(toolQuaternionInAssemblage)

			// .setFromRotationMatrix

			if(activeSideChainAndHydrogen)
			{


				//it is IK, there can be 2 solutions, you need to look at what it's closest to
				//could get equation for nextCAlpha in terms of phi and psi.
				//divide space into cones. If you're over the donut
				//how to switch between
				if(dottedLine !== undefined)
				{
					dottedLine.position.copy(activeAmide.position)
					dottedLine.visible = (handControllers[0].grippingSide && handControllers[1].grippingSide);

					var direction = handControllers[1].position.clone().sub(handControllers[0].position).normalize();
					
					var newY = direction.clone().multiplyScalar(getAngstrom());
					redirectCylinder(dottedLine, handControllers[0].position, newY)
				}

				let prevNitrogenDirection = cBeta.clone().negate().applyQuaternion(amides[amides.indexOf(activeAmide)-1].quaternion).normalize()
				fakeAmide.position.copy(activeAmide.position)
				let axis = nextCAlpha.clone().cross(prevNitrogenDirection).normalize()
				let angleToCBetaSpindle = prevCAlphaToHand.angleTo(prevCAlphaAcrossAmide)
				if( angleToCBetaSpindle < nextCAlphaAngleToCBetaSpindle )
				{
					//"just" put the new carbon alpha where the hand is
					//then there are two options for carbon beta
					//choose the one with the closer quaternion... or the better rama?
					//main cool thing this could do in comparison with coot:	
					//coot you just give you what you asked for, whereas with this you can maybe see that different hypotheses are incompatible with rama data?
					//we're hoping it will be easy to switch between the two. Jesus this is hard
						//maybe have some silly hack taking rotation into account if it isn't
						//some kind of "momentum" may be needed, urgh

					let activeAmideToNextCAlpha = prevCAlphaToHand.clone().setLength(nextCAlpha.length())

					let prevNitrogen = prevNitrogenDirection.clone().add(activeAmide.position)
					let cBetaDist = cBeta.length()
					let nDist = cBeta.length() //not exactly
					let cBetaToNextCAlphaDist = cBeta.distanceTo(nextCAlpha)
					let prevNitrogenToCBetaDistance = Math.sqrt( sq(cBetaDist) + sq(nDist) + 2 * nDist * cBetaDist * Math.cos(TETRAHEDRAL_ANGLE ) )

					let possibleCBetas = tetrahedronTop(
						new THREE.Vector3(),
						activeAmideToNextCAlpha,
						prevNitrogenDirection,
						cBetaDist,cBetaToNextCAlphaDist,prevNitrogenToCBetaDistance)

					let dists = [0,0]
					for(let i = 0; i < 2; i++)
					{
						//untested
						// let phi = planeAngle(prevNitrogenDirection,zeroVector,prevCBeta,possibleCBetas[i])
						// let psi = planeAngle(prevNitrogenDirection,zeroVector,prevCBeta,possibleCBetas[i])
						// let ramaScore = 
						//note some phi are impossible

						let oldCBeta = cBeta.clone().applyQuaternion(activeAmide.quaternion)
						dists[i] = possibleCBetas[i].distanceTo(oldCBeta)
					}
					let newCBeta = possibleCBetas[dists[0]<dists[1]?0:1]

					activeAmide.quaternion.setFromUnitVectors(cBeta.clone().normalize(),newCBeta.clone().normalize())
					let partwayNextCAlpha = nextCAlpha.clone().applyQuaternion(activeAmide.quaternion)

					let psiQuaternion = new THREE.Quaternion().setFromAxisAngle(cBeta.clone().normalize(), psi)
					activeAmide.quaternion.multiply( psiQuaternion )
				}
				// else
				// {
				// 	let prevNitrogenDirection = cBeta.clone().negate().applyQuaternion(amides[amides.indexOf(activeAmide)-1].quaternion).normalize()

				// 	if( prevCAlphaToHand.angleTo(prevNitrogenDirection) < TETRAHEDRAL_ANGLE )
				// 	{
				// 		//angle needs to be increased
				// 	}

				// 	//only one solution, send in the direction of cBeta spindle
				// 	if( angleToCBetaSpindle > nextCAlphaAngleToCBetaSpindle )
				// 	{
						
				// 	}

				// 	let axis = nextCAlpha.clone().cross(prevNitrogenDirection).normalize()
				// 	if(  )
				// 	{

				// 	}
				// }





				let correctToTetrahedralAngle = false
				if(correctToTetrahedralAngle)
				{
					//not got an intuitive explanation for why this feels best, but wouldn't for that either
					//was thinking of doing it by saying what quaternion is the closest?

					let previousAmideNitrogen = cBeta.clone().negate().applyQuaternion(amides[amides.indexOf(activeAmide)-1].quaternion)
					previousAmideNitrogen.applyQuaternion( activeAmide.quaternion.clone().inverse() )

					let currentAngle = cBeta.angleTo(previousAmideNitrogen)
					let axis = previousAmideNitrogen.clone().cross(cBeta).normalize()
					let deltaQ = new THREE.Quaternion().setFromAxisAngle(axis,TETRAHEDRAL_ANGLE-currentAngle)
					activeAmide.quaternion.multiply( deltaQ )
				}

				//repelling
				let cBetaDirection = cBeta.clone().applyQuaternion(activeAmide.quaternion).normalize()

				let intendedSpindle = prevNitrogenDirection.clone().lerp(cBetaDirection,0.5).normalize().negate();
				let intendedLeft = cBetaDirection.clone().cross(intendedSpindle).normalize();

				activeSideChainAndHydrogen.quaternion.setFromUnitVectors( sideChainAndHydrogenActualSpindle,intendedSpindle )
				let leftInCurrentSpace = sideChainAndHydrogenActualLeft.clone().applyQuaternion(activeSideChainAndHydrogen.quaternion);
				activeSideChainAndHydrogen.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors( leftInCurrentSpace, intendedLeft ) );
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

		activeAmide = null;
		amides = [];
		activeSideChainAndHydrogen = null;
		sideChainAndHydrogens = []

		//then an auto-refine!

		// Sending it off to coot
		// many cAlphas need deleting - sidechain AND both amide planes
		// take all the atoms in the originals, "clone" them for each copy
		// take their positions, convert them from local to assemblage space
		// 	If it's a new chain, have to make that, then residues start at 0
		// 	Otherwise,
		// 	add_new_chain does exist
		// 	You make this thing, you send it off to coot, coot probably refines it, then you get it back and delete.
	}

	proteinPainter.onLetGo = function()
	{
		this.rotation.x = 0
		castOffNewChain()
	}

	return proteinPainter;
}