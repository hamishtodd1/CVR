/*
	Grab a terminal residue and you start working out of that
	Overlap a residue, and it moves the last Calpha you put down such that it can connect nicely to the calpha of what you've touched
	
	Visualize the ramachandran in place.
	Tau is set to 110, but if Lynne's data is to be believed it can do 105 and 115 too
	There are only two degrees of freedom, phi and psi
	"abstract over" the set of all molecules:
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

function initPainter()
{
	// new THREE.PlaneBufferGeometry(2,Math.sqrt(3))

	// TETRAHEDRAL_ANGLE;

	var painter = new THREE.Object3D();
	scene.add(painter)
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0x00FF00, opacity: 0.7}));
	painter.add( ball );
	ball.geometry.computeBoundingSphere();
	painter.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Painter" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	painter.add(label);

	var HS3 = Math.sqrt(3)/2
	var amidePlanePdbRead = {
		elements:["O","C","N","H","C"],
		positions:[
			new THREE.Vector3(HS3*2,	0.0,0.0),
			new THREE.Vector3(HS3,		0.5,0.0), //double bond!!!!
			new THREE.Vector3(HS3,		1.5,0.0),
			new THREE.Vector3(0.0,		2.0,0.0),
			new THREE.Vector3(HS3*2,	2.0,0.0),
		]
	}
	var nTerminusPdbRead = {
		elements:["C","N","H","H",
			"H","C","H","H","H"],
		positions:[
			new THREE.Vector3(0.0,	0.0,  0.0),
			new THREE.Vector3(0.0,	-0.5, -HS3),
			new THREE.Vector3(HS3,	-0.75,-HS3*1.5),
			new THREE.Vector3(-HS3,	-0.75,-HS3*1.5),

			new THREE.Vector3(-HS3,	0.5, 	0.0),
			new THREE.Vector3(0.0,	-0.5,	HS3),
			new THREE.Vector3(HS3,	-1.0,	HS3),
			new THREE.Vector3(-HS3,	-1.0,	HS3),
			new THREE.Vector3(0.0,	0.0,	HS3*2.0),
		]
	}
	var cTerminusPdbRead = {
		elements:["O","C","O","H"],
		positions:[
			new THREE.Vector3(HS3*2,0.0,0.0),
			new THREE.Vector3(HS3,	0.5,0.0), //double bond!!!!
			new THREE.Vector3(HS3,	1.5,0.0),
			new THREE.Vector3(HS3,	2.5,0.0),
		]
	}

	var sideChainAndHydrogenPdbRead = {
		elements:[
			"H","C","H","H","H"],
		positions:[
			new THREE.Vector3(-HS3,	0.5, 	0.0),
			new THREE.Vector3(0.0,	-0.5,	HS3),
			new THREE.Vector3(HS3,	-1.0,	HS3),
			new THREE.Vector3(-HS3,	-1.0,	HS3),
			new THREE.Vector3(0.0,	0.0,	HS3*2.0),
		]
	}

	var allOfThem = [ amidePlanePdbRead, nTerminusPdbRead, sideChainAndHydrogenPdbRead, cTerminusPdbRead ];
	for(var j = 0; j < allOfThem.length; j++)
	{
		for(var i = 0; i < allOfThem[j].positions.length; i++)
		{
			allOfThem[j].positions[i].y *= Math.sqrt(1.5)
			allOfThem[j].positions[i].multiplyScalar(1.8/Math.sqrt(1.5));
		}
	}

	var sideChainAndHydrogenActualSpindle = new THREE.Vector3().addVectors(sideChainAndHydrogenPdbRead.positions[0],sideChainAndHydrogenPdbRead.positions[1]).normalize();
	var sideChainAndHydrogenActualLeft = sideChainAndHydrogenActualSpindle.clone().cross(sideChainAndHydrogenPdbRead.positions[0]).cross(sideChainAndHydrogenActualSpindle).normalize();

	{
		var ourAtoms = [];

		//start
	 	for(var i = 0; i < nTerminusPdbRead.elements.length; i++)
	 	{
	 		ourAtoms.push(new Atom( nTerminusPdbRead.elements[i], nTerminusPdbRead.positions[i].clone() ) );
	 	}
	 	for(var i = 0; i < amidePlanePdbRead.elements.length; i++)
	 	{
	 		ourAtoms.push(new Atom( amidePlanePdbRead.elements[i], amidePlanePdbRead.positions[i].clone() ) );
	 	}

	 	var origin = new THREE.Vector3(Math.sqrt(3)*1.8/Math.sqrt(1.5),2*1.8,0)

	 	//extra residue
	 	// for(var i = 0; i < amidePlanePdbRead.elements.length; i++)
	 	// {
	 	// 	var atom = new Atom( amidePlanePdbRead.elements[i], amidePlanePdbRead.positions[i].clone() )
	 	// 	atom.position.add(origin)
	 	// 	ourAtoms.push( atom );
	 	// }

	 	//c-terminus
	 	for(var i = 0; i < cTerminusPdbRead.elements.length; i++)
	 	{
	 		var atom = new Atom( cTerminusPdbRead.elements[i], cTerminusPdbRead.positions[i].clone() )
	 		atom.position.add(origin)
	 		ourAtoms.push( atom );
	 	}

	 	//sidechain
	 	for(var i = 0; i < sideChainAndHydrogenPdbRead.elements.length; i++)
	 	{
	 		var atom = new Atom( sideChainAndHydrogenPdbRead.elements[i], sideChainAndHydrogenPdbRead.positions[i].clone() )

	 		var spindle = zVector.clone();
	 		var quaternion1 = new THREE.Quaternion().setFromUnitVectors( sideChainAndHydrogenActualSpindle, spindle );
	 		atom.position.applyQuaternion(quaternion1)

	 		var left = new THREE.Vector3( -HS3*1.8/Math.sqrt(1.5), 0.5*1.8, 0.0 ).normalize();
	 		var leftInCurrentSpace = sideChainAndHydrogenActualLeft.clone().applyQuaternion(quaternion1);
	 		var quaternion2 = new THREE.Quaternion().setFromUnitVectors( left, leftInCurrentSpace );
	 		atom.position.applyQuaternion(quaternion2)

	 		atom.position.add(origin)
	 		ourAtoms.push( atom );
	 	}
	}
 	
 	var bondData = [[[[],[],1,0,1],[[],[],1,1,0],[[],[],1,0,4],[[],[],1,4,0],[[],[],1,0,5],[[],[],1,5,0],[[],[],1,0,10],[[],[],1,10,0],[[],[],1,5,6],[[],[],1,6,5],[[],[],1,5,7],[[],[],1,7,5],[[],[],1,5,8],[[],[],1,8,5],[[],[],1,10,11],[[],[],1,11,10],[[],[],1,13,15],[[],[],1,15,13],[[],[],1,13,18],[[],[],1,18,13],[[],[],1,13,19],[[],[],1,19,13],[[],[],1,15,16],[[],[],1,16,15],[[],[],1,19,20],[[],[],1,20,19],[[],[],1,19,21],[[],[],1,21,19],[[],[],1,19,22],[[],[],1,22,19]],[],[[[],[],1,9,10],[[],[],1,10,9],[[],[],1,14,15],[[],[],1,15,14],[[],[],1,16,17],[[],[],1,17,16]],[[[],[],1,1,2],[[],[],1,2,1],[[],[],1,1,3],[[],[],1,3,1],[[],[],1,11,12],[[],[],1,12,11],[[],[],1,11,13],[[],[],1,13,11]],[],[],[],[],[],[]];
 	function changeBondToDouble(atomA, atomB)
 	{
 		for(var j = 0; j < bondData.length; j++)
 		{
 			for(var i = 0; i < bondData[j].length; i++)
 			{
 				if( (atomA === bondData[j][i][3] && atomB === bondData[j][i][4])
 				 || (atomB === bondData[j][i][3] && atomA === bondData[j][i][4]) )
 				{
 					bondData[j][i][2] = 2;
 				}
 			}
 		}
 	}
 	// for(var j = 0; j < bondData.length; j++)
 	// {
 	// 	for(var i = 0; i < bondData[j].length; i++)
 	// 	{
 	// 		if( ourAtoms[ bondData[j][i][3] ].element === 0 && ourAtoms[ bondData[j][i][4] ].element === 2 )
 	// 		{
 	// 			changeBondToDouble(bondData[j][i][3],bondData[j][i][4]);
 	// 		}
 	// 	}
 	// }
 	changeBondToDouble(bondData[2][1][3],bondData[2][1][4]);
 	changeBondToDouble(bondData[2][3][3],bondData[2][3][4]);

 	var paintedChain = makeMoleculeMesh( ourAtoms, false,bondData );
 	var worldPosition = new THREE.Vector3(0,0,-0.5)
 	paintedChain.position.copy(worldPosition)
 	paintedChain.position.z += 0.2
 	paintedChain.position.y -= 0.1
 	paintedChain.position.x -= 0.05
 	assemblage.updateMatrixWorld()
 	assemblage.worldToLocal(paintedChain.position)
 	assemblage.add(paintedChain);

 	thingsToBeUpdated.push(painter)
 	painter.ordinaryParent = scene
 	painter.update = function()
 	{
 		label.visible = this.parent === scene;

 		if(this.parent !== this.ordinaryParent)
 		{
 			if( this.parent.button1 )
 			{
 				if( !this.parent.button1Old )
 				{
 					//Make new amide
 						//but the n terminus and sidechain is attached
 				}

 				if( this.position.distanceTo(lastCarbonAlphaPosition) > something )
 				{
 					//Make new amide

 					//Make new sidechain
 						//Ideally recognize where you are in the sequence
 				}

 				//later: "retraction"

 				//the latest amide plane follows hand
 			}
 			
 			if(this.parent.button1Old && !this.parent.button1)
 			{
 				//switch last amide to c terminus

 				// Sending it off to coot
 				// 	If it's a new chain, have to make that, then residues start at 0
 				// 	Otherwise,
 				// 	add_new_chain does exist
 				// 	You make this thing, you send it off to coot, coot probably refines it, then you get it back and delete.
 			}
 		}
 	}

	return painter;
}