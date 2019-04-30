/*
	TODO (probably, might need to think more)
		When you want to lay down a new one, read the atoms near your hand.
		The new, first, residue still gets put in the same place, but we move the assemblage into the right orientation

	How to integrate this shit?

	Should be able to grab any residue. It breaks off

	Grab a terminal residue and you start working out of that
	Overlap a residue, and it moves the last Calpha you put down such that it can connect nicely to the calpha of what you've touched


	Speedometer tau indication
	

	Take some supercomputer algorithms from 1980 and because moore's law they are consumer hardware today
	Game design: writing algorithms that have to run in realtime on consumer hardware
	HPC: writing algorithms that you can just about get to run on clusters
	
	Visualize the ramachandran in place.
	Tau is set to 110, but if Lynne's data is to be believed it can do 105 and 115 too
	There are only two degrees of freedom, phi and psi
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
	let proteinPainter = Tool(0x00FF00)

	//different segments. Do not screw around lightly, their positions are expected to be where they currently are
	{
		var amidePdbRead = {
			elements:["C","O","C","N","H","C"],
			positions:[
				new THREE.Vector3(0.0,		0.0,0.0),
				new THREE.Vector3(HS3*2,	0.0,0.0),
				new THREE.Vector3(HS3,		0.5,0.0),
				new THREE.Vector3(HS3,		1.5,0.0),
				new THREE.Vector3(0.0,		2.0,0.0),
				new THREE.Vector3(HS3*2,	2.0,0.0),
			]
		}

		var nTerminusPdbRead = {
			elements:["N","H","H",
				"C","H",
				"C","H","H","H"],
			positions:[
				new THREE.Vector3(0.0,	-0.5, -HS3),
				new THREE.Vector3(HS3,	-0.75,-HS3*1.5),
				new THREE.Vector3(-HS3,	-0.75,-HS3*1.5),

				new THREE.Vector3(0.0,	0.0,	0.0),
				new THREE.Vector3(-HS3,	0.5, 	0.0),

				new THREE.Vector3(0.0,	-0.5,	HS3),
				new THREE.Vector3(HS3,	-1.0,	HS3),
				new THREE.Vector3(-HS3,	-1.0,	HS3),
				new THREE.Vector3(0.0,	0.0,	HS3*2.0),
			]
		}
		var cTerminusPdbRead = {
			elements:["C","O","C","O","H"],
			positions:[
				new THREE.Vector3(0.0,	0.0,0.0),
				new THREE.Vector3(HS3*2,0.0,0.0),
				new THREE.Vector3(HS3,	0.5,0.0),
				new THREE.Vector3(HS3,	1.5,0.0),
				new THREE.Vector3(HS3,	2.5,0.0),
			]
		}

		var sideChainAndHydrogenPdbRead = {
			elements:[
				"H","C","H","H","H","C"],
			positions:[
				new THREE.Vector3(-HS3,	0.5, 	0.0),
				new THREE.Vector3(0.0,	-0.5,	HS3),
				new THREE.Vector3(HS3,	-1.0,	HS3),
				new THREE.Vector3(-HS3,	-1.0,	HS3),
				new THREE.Vector3(0.0,	0.0,	HS3*2.0),
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
		var bondData = [[[[],[],1,0,2],[[],[],1,2,3]],[],[[[],[],1,1,2]],[[[],[],1,3,4],[[],[],1,3,5]],[],[],[],[],[],[]];
		changeBondBetweenAtomsToDouble(bondData, 1,2);
		var amide = makeMoleculeMesh( amideAtoms, false,bondData );
		var amideDiagonalLength = amide.atoms[ amide.atoms.length - 1 ].position.length();

		var cTerminusAtoms = [];
		for(var i = 0; i < cTerminusPdbRead.elements.length; i++)
		{
			cTerminusAtoms.push( new Atom( cTerminusPdbRead.elements[i], cTerminusPdbRead.positions[i].clone() ) );
		}
		var bondData = [[[[],[],1,0,2],[[],[],1,2,3]],[],[[[],[],1,1,2],[[],[],1,3,4]],[],[],[],[],[],[],[]];
		changeBondBetweenAtomsToDouble(bondData, 1,2);
		var cTerminus = makeMoleculeMesh( cTerminusAtoms, false, bondData );	 	

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
	}

	var amides = [];
	var activeAmide = null;

	function createActiveAmideAtPosition(position)
	{
		var newAmide = amide.clone()
		activeAmide = newAmide;
		amides.push(newAmide);

		newAmide.position.copy(position);
		assemblage.add(newAmide)

		return newAmide;
	}

	var activeSideChainAndHydrogen = null;

	proteinPainter.whileHeld = function(positionInAssemblage)
	{
		if( this.parent.button1 )
		{
			if( amides.length === 0 )
			{
				//TODO you might be wanting to continue the chain

				var newAmide = createActiveAmideAtPosition(positionInAssemblage)
				newAmide.add(nTerminus.clone())
			}

			if( positionInAssemblage.distanceTo(activeAmide.position) > amideDiagonalLength )
			{
				var newAmidePosition = nextCAlpha.clone();
				activeAmide.updateMatrixWorld();
				activeAmide.localToWorld(newAmidePosition)
				assemblage.worldToLocal(newAmidePosition)

				var newAmide = createActiveAmideAtPosition(newAmidePosition)

				var newSideChainAndHydrogen = sideChainAndHydrogen.clone();
				newSideChainAndHydrogen.position.copy(activeAmide.position)
				assemblage.add(newSideChainAndHydrogen);

				activeSideChainAndHydrogen = newSideChainAndHydrogen;
			}

			var vectorToFollow = positionInAssemblage.clone().sub(activeAmide.position);

			// var nitrogenDirection = cBeta.clone().negate().applyQuaternion(amides[amides.indexOf(activeAmide)-1].quaternion).normalize()
			// var tau = vectorToFollow.angleTo(nitrogenDirection);
			// if( vectorToFollow.angleTo(nitrogenDirection) < TAU / 4 )
			// {
			// 	//retract?
			// }

			if(vectorToFollow.length() > 0.7)
			{
				vectorToFollow.normalize()

				var currentNextCAlpha = nextCAlpha.clone().applyQuaternion(activeAmide.quaternion).normalize()
				activeAmide.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors( currentNextCAlpha,vectorToFollow ));

				var circlePlaneBasis = [
					new THREE.Quaternion().setFromAxisAngle(vectorToFollow,TAU/4),
					new THREE.Quaternion().setFromAxisAngle(vectorToFollow,-TAU/4) ];
				//the dot product of the above is 0, so good. But if you look at them, it's just one coord is the negative. Whatever!
				var finalQuaternion =
					circlePlaneBasis[0].clone().multiplyScalar( this.parent.deltaQuaternion.dot( circlePlaneBasis[0] ) ).add(
					circlePlaneBasis[1].clone().multiplyScalar( this.parent.deltaQuaternion.dot( circlePlaneBasis[1] ) ) ).normalize()
				activeAmide.quaternion.multiply(finalQuaternion);
				activeAmide.quaternion.multiply(finalQuaternion);

				//alternative: just take the angle, apply that angle. Surely daft, what if hand is at a right angle?


				//get hand's rotation around that axis?
				//rotations around a certain axis = rays in the quaternions = circle = all the quaternions whose dot product with two specific quaternions is 0.
				//take the quaternion that gets the previous hand state to the current (is that something you know about? Alan Kay "your brain computes diffs, not absolutes")
				//Project them onto that ray
				//get the plane that defines the circle, project point onto plane, then onto circle

				//the problem is: because your fingers are feeling nothing, they have no axis against which to stabilize/use
				//the appeal of this solution is: there is some philosophical sense in which this is the "closest" rotation to what's specified
			}
			if(activeSideChainAndHydrogen)
			{
				var nitrogenDirection = cBeta.clone().negate().applyQuaternion(amides[amides.indexOf(activeAmide)-1].quaternion).normalize()
				var cBetaDirection = cBeta.clone().applyQuaternion(activeAmide.quaternion).normalize()

				var intendedSpindle = nitrogenDirection.clone().lerp(cBetaDirection,0.5).normalize().negate();
				var intendedLeft = cBetaDirection.clone().cross(intendedSpindle).normalize();

				activeSideChainAndHydrogen.quaternion.setFromUnitVectors( sideChainAndHydrogenActualSpindle,intendedSpindle )
				var leftInCurrentSpace = sideChainAndHydrogenActualLeft.clone().applyQuaternion(activeSideChainAndHydrogen.quaternion);
				activeSideChainAndHydrogen.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors( leftInCurrentSpace, intendedLeft ) );
			}
		}
		
		if(this.parent.button1Old && !this.parent.button1)
		{
			this.onLetGo();
		}
	}
	proteinPainter.onLetGo = function()
	{
		if( !activeAmide )
		{
			return;
		}

		var newCTerminus = cTerminus.clone();
		newCTerminus.quaternion.copy(activeAmide.quaternion)
		newCTerminus.position.copy(activeAmide.position)

		assemblage.add(newCTerminus);
		assemblage.remove(activeAmide);
		for(var i = 0; i < activeAmide.children.length; i++)
		{
			newCTerminus.add(activeAmide.children[i]);
		}

		activeAmide = null;
		amides = [];
		activeSideChainAndHydrogen = null;

		// Sending it off to coot
		// many cAlphas need deleting - sidechain AND both amide planes
		// take all the atoms in the originals, "clone" them for each copy
		// take their positions, convert them from local to assemblage space
		// 	If it's a new chain, have to make that, then residues start at 0
		// 	Otherwise,
		// 	add_new_chain does exist
		// 	You make this thing, you send it off to coot, coot probably refines it, then you get it back and delete.
	}

	return proteinPainter;
}