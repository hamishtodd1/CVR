/*
 * It starts out on your belt
 * Take it off, but leave it in midair, it stays
 * Put it in proximity to your belt and look away from it and it'll go there
 * 
 * If you look down, all your tools return to your belt
 */

/* Other tools
 * Rotating sidechains causes snap to 180
 * 
 * In real life: say you're picking things off a bush. If you want to get a few things you pinch, if you want a lot then you scoop. It's a natural action of your hand
 * Ok here: Sphere is both hands
 * Regularizer is pinch
 * 
 * Maybe the general way to do it is "let people just manipulate the atoms and then when they look away, correct them"
 * 
 * Undo is a button on the controller that makes a sign flash up
 */

/*
 * do-180-degree-side-chain-flip imol chain id resno inscode altconf [function]
Where:
• imol is an integer number
• chain id is a string
• resno is an integer number
• inscode is a string
• altconf is a string
 */

//Residue deleter?
function initSidechainFlipper( )
{
	sidechainFlipper = new THREE.Object3D();
	sidechainFlipper.ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(1), new THREE.MeshLambertMaterial({transparent:true,color:0xFF00FF, opacity: 0.3}));
	sidechainFlipper.add( sidechainFlipper.ball );
	sidechainFlipper.ball.scale.setScalar(0.05); //the radius
	
	sidechainFlipper.highlightedAtoms = [];
	
	sidechainFlipper.update = function()
	{
		if(!modelAndMap.model /*|| this.parent === scene*/)
			return;
		
		var ourPosition = this.getWorldPosition();
		modelAndMap.model.updateMatrixWorld();
		modelAndMap.model.worldToLocal(ourPosition);
		
		var ourRadiusSq = sq( sidechainFlipper.ball.scale.x / getAngstrom() );
		
		var highlightColor = new THREE.Color(1,1,1);
		
		/*
		 * TODO optimize
		 * Divide up atoms, at least into residues, possibly into cubes
		 * 
		 * could also generalize
		 */
		for(var i = 0, il = modelAndMap.model.atoms.length; i < il; i++)
		{
			if( modelAndMap.model.atoms[i].position.distanceToSquared( ourPosition ) < ourRadiusSq )
			{
				modelAndMap.model.geometry.colorAtom(i, highlightColor);
				this.highlightedAtoms.push(i);
			}
		}
		for(var i = 0; i < this.highlightedAtoms.length; i++)
		{
			if( modelAndMap.model.atoms[ this.highlightedAtoms[i] ].position.distanceToSquared( ourPosition ) >= ourRadiusSq )
			{
				modelAndMap.model.geometry.colorAtom( this.highlightedAtoms[i] );
				this.highlightedAtoms.splice(i,1);
				i--;
			}
		}
		
		modelAndMap.model.geometry.attributes.color.needsUpdate = true;
	}
	
	cursor.add(sidechainFlipper)	
}

/* need these things
 * 
 * Well the fun thing for peptide flipper would be grabbing it and moving it =/ it fits into that scheme
 * 
 *imol is an integer number
• chain id is a string
• resno is an integer number
• inscode is a string
• altconf
 */
function initPepFlipper()
{
	pepFlipper = new THREE.Object3D();
	pepFlipper.ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(1), new THREE.MeshLambertMaterial({transparent:true,color:0x00FF00, opacity: 0.3}));
	pepFlipper.add(pepFlipper.ball);
	pepFlipper.ball.scale.setScalar(0.05); //the radius
	
	pepFlipper.highlightedAtoms = [];
	
//	pepFlipper.userPressingBu
	
	pepFlipper.update = function()
	{
		if(!modelAndMap.model /*|| this.parent === scene*/)
			return;
		
		//Should be able to vary radius by grabbing with both hands and pulling
		
		var ourPosition = this.getWorldPosition();
		modelAndMap.model.updateMatrixWorld();
		modelAndMap.model.worldToLocal(ourPosition);
		
		var ourRadiusSq = sq( pepFlipper.ball.scale.x / getAngstrom() );
		
		var highlightColor = new THREE.Color(1,1,1);
		
		/*
		 * TODO optimize
		 * Divide up atoms, at least into residues, possibly into cubes
		 * 
		 * could also generalize
		 */
		for(var i = 0, il = modelAndMap.model.atoms.length; i < il; i++)
		{
			if( modelAndMap.model.atoms[i].position.distanceToSquared( ourPosition ) < ourRadiusSq )
			{
				modelAndMap.model.geometry.colorAtom(i, highlightColor);
				this.highlightedAtoms.push(i);
			}
		}
		for(var i = 0; i < this.highlightedAtoms.length; i++)
		{
			if( modelAndMap.model.atoms[ this.highlightedAtoms[i] ].position.distanceToSquared( ourPosition ) >= ourRadiusSq )
			{
				modelAndMap.model.geometry.colorAtom( this.highlightedAtoms[i] );
				this.highlightedAtoms.splice(i,1);
				i--;
			}
		}
		
		modelAndMap.model.geometry.attributes.color.needsUpdate = true;
	}
	
	cursor.add(pepFlipper)
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
function initMutator()
{
	mutator = new THREE.Object3D();
	
	var handleRadius = 0.02;
	var handleTubeRadius = handleRadius / 3;
	var chunkOut = 0;//TAU / 4;
	mutator.handle = new THREE.Mesh(new THREE.TorusGeometry(handleRadius, handleTubeRadius, 7, 31, TAU - chunkOut), new THREE.MeshBasicMaterial({transparent:true,color:0xFF0000}));
	mutator.handle.rotation.y = TAU / 4;
	mutator.handle.rotation.z = chunkOut / 2;
	mutator.add(mutator.handle);

	var labelMaterial = new THREE.MeshLambertMaterial( { color: 0x156289 });
	var aaNames = ["leucine","alanine","serine","glycine","valine","glutamic acid","arginine","threonine", //most common
	               "asparagine","aspartic acid","cysteine","glutamine","histidine","isoleucine","lysine","methionine", "phenylalanine","proline","tryptophan","tyrosine"];
	var aaAbbreviations = ["LEU","ALA","SER","GLY","VAL","GLU","ARG","THR",
	               "ASN","ASP","CYS","GLN","HIS","ILE","LYS","MET", "PHE","PRO","TRP","TYR"];
	mutator.AAs = Array(aaNames.length);
	var ourPDBLoader = new THREE.PDBLoader();
	var plaque = new THREE.Mesh( new THREE.CircleBufferGeometry(4,32), new THREE.MeshBasicMaterial({color:0xF0F000, transparent: true, opacity:0.5}) );
	var innerCircleRadius = 0.1;
	var textWidth = innerCircleRadius / 3;
	function singleLoop(aaIndex, position)
	{
		ourPDBLoader.load( "data/AAs/" + aaNames[aaIndex] + ".txt",
			function ( geometryAtoms ) {
				mutator.AAs[aaIndex] = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial( {vertexColors:THREE.VertexColors} ) );
				mutator.AAs[aaIndex].atoms = Array(geometryAtoms.elements.length);
			 	for(var i = 0; i < mutator.AAs[aaIndex].atoms.length; i++)
			 		mutator.AAs[aaIndex].atoms[i] = new Atom( geometryAtoms.elements[i], "", new THREE.Vector3().fromArray(geometryAtoms.attributes.position.array,3*i) );

			 	makeMoleculeMesh( mutator.AAs[aaIndex].geometry, mutator.AAs[aaIndex].atoms );
			 	
			 	mutator.AAs[aaIndex].position.copy(position)
			 	mutator.AAs[aaIndex].scale.setScalar(getAngstrom());
				mutator.add( mutator.AAs[aaIndex] );
				
				var textureLoader = new THREE.TextureLoader();
				textureLoader.crossOrigin = true;
				textureLoader.load(
					"data/AAs/" + aaNames[aaIndex] + ".png",
					function(texture) {
						var nameMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( textWidth, textWidth * (texture.image.naturalHeight/texture.image.naturalWidth) ), new THREE.MeshBasicMaterial({ map: texture }) );
						nameMesh.position.copy(mutator.AAs[aaIndex].position)
						nameMesh.position.y -= 0.01;
						nameMesh.position.z = 0.01;
						mutator.add(nameMesh)
					},
					function ( xhr ) {}, function ( xhr ) {console.log( 'texture loading error' );}
				);
				
				mutator.AAs[aaIndex].add( plaque.clone() );
			},
			function ( xhr ) {}, //progression function
			function ( xhr ) { console.error( "couldn't load PDB (maybe something about .txt): ", aaNames[aaIndex]  ); }
		);
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
			position.y = innerCircleRadius * 1.9;
			position.applyAxisAngle( zAxis, (i-numInLayer1) / (il-numInLayer1) * TAU );
		}
		
		singleLoop(i,position);
	}
	
//	mutator.potentialResidues = 
	
	mutator.update = function()
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
		
		if(this.residueSelected)
		for(var i = 0, il = this.potentialResidues.length; i < il; i++)
		{
			
		}
		
		
		if(0)
		{
//			socket.send("mutate|" + residueNumber.toString() + "," + residue-number chain-id mol mol-for-map residue-type )
		}
	}
	
	scene.add(mutator);
}