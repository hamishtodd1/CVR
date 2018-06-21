'use strict';
/*
TODO before newbattle, July 1st
	Can load a map, can load a molecule
	Fix the atom deletion problems
	You want a "reset server" button before you make them interact again
	Do the whole coot tutorial, and the EM one too
		Painter works as "add terminal residue"
		Refinement
			Grabbing two ends of a chain defines it as refinement area
			Force restraints
		Mutate / everything else sitting there in script
		Spectation, or at least "Save"
		Transfer the damn map. Need to be able to open them too...
	Release
		Little video of environment distances for drug discoverers - 4zzn
		Extended video showing all features for "beta"
		Send to Oculus
	Urgh, irreg
	Try on chrome canary

	Expenses
	Sweden travel
	7Osme pass
	Poland travel
	Get stuff from Diego
	
TODO at some point
	Place atom at pointer
		Should replace ligand builder, "add oxt to residue"
		Water, calcium, magnesium, Sodium, chlorine, bromine, SO4, PO4
	Anisotropic atoms? There may be some interesting stuff here
	"Skeletonization"?
	Everything in "Measures"
	Ramachandran diagrams, hard spheres
	probe dots
	Octree selection
	Test monomer tool
	"Carbon alpha mode", often used when zoomed out: graphics_to_ca_representation, get_bonds_representation
	easy: "hand distances"
	Get monomer with web speech
	Selection of rotamers
	"Add alt conformer"
	Non-vr head movement sensetivity demo
	Get that structure Paul suggested
	"undo"
		Just coot undo, then get the result? Full refresh
		Button on controller reserved
		Flash or something
	bug with some residues highlighting many residues?
	NMR data should totally be in there, a set of springs
	Ligands and stuff carry their "theoretical" density with them. Couldn't have that shit in normal coot, too much overlapping!
	ambient occlusion maps for all?
	Copy and paste 3D blocks of atoms
	Desktop view? Urgh
	NCS! It is a complex-to-look-at 3D thing! Crystallography only tho https://www.youtube.com/watch?v=7QbPvVA-wRQ

Games to get maybe
	UI interest
		redout / dirt, might have more ui stuff?	
		Vanishing realms
		sublevel zero
		Elite dangerous?
		hover junkers
		Form

	Fun
		Superhypercube
		thumper
		form
		violent stuff
			superhot		
			Sairento
			Fallout 4

	Both
		Lone echo

Maya
	Admin
	reddit/bluecollarwomen
	http://www.nts.org.uk/wildlifesurvey/
	http://www.wildlifeinformation.co.uk/about_volunteering.php
*/


(function init()
{
	// if(!WEBVR.checkAvailability())
	// {
	// 	console.error("No webvr!")
	// 	return;
	// }

	var renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.localClippingEnabled = true; //necessary if it's done in a shader you write?
	renderer.sortObjects = false;
	document.body.appendChild( renderer.domElement );

	{
		// renderer.vr.enabled = true;
		// var vrButton = WEBVR.createButton( renderer );
		// document.body.appendChild( vrButton );
	}
	var ourVrEffect = new THREE.VREffect( renderer );
	var loopCallString = getStandardFunctionCallString(loop);
	function render()
	{
		eval(loopCallString);
		ourVrEffect.requestAnimationFrame( function()
		{
			//a reasonable indicator is ourVREffect.isPresenting
			ourVrEffect.render( scene, camera );

			var pauseLength = 0
			setTimeout(render,pauseLength);
		} );
	}
	initVrInputSystem(renderer,ourVrEffect)

	var maps = [];
	var atoms = null; //because fixed length
	
	var visiBox = initVisiBox();
	assemblage.position.copy(visiBox.position)
	assemblage.scale.setScalar( 0.028 ); //0.045, 0.028 is nice, 0.01 fits on screen
	camera.position.y = assemblage.position.y; //affects until you go into VR
	scene.add(assemblage);
	
	window.addEventListener( 'resize', function(){ //doesn't work if in VR
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}, false );
	
	var fakePanel = initSurroundings(renderer,true);
	initScaleStick();
	// initMenus();
	// initSpecatorRepresentation();
	
	function initPartTwo(modelDataString)
	{
		// makeModelFromCootString( modelDataString, visiBox.planes );
		// initStats(visiBox.position);

		var thingsToSpaceOut = [];

		var visiblePlace = visiBox.position.clone()
		// assemblage.worldToLocal(visiblePlace)
		thingsToSpaceOut.push(
			//coot specific
			// initMutator(),
			// initAtomDeleter(),
			// initResidueDeleter(),
			// initEnvironmentDistance(),
			// initAutoRotamer(),
			// initRefiner(),

			// initPointer(),
			// initAtomLabeller(),
			// initRigidBodyMover(),
			// initProteinPainter(),
			// initNucleicAcidPainter()
		);
		// initMonomerReceiver()

		//maybe these things could be on a desk? Easier to pick up?

		var toolSpacing = 0.15;
		for(var i = 0; i < thingsToSpaceOut.length; i++)
		{
			thingsToSpaceOut[i].position.set( toolSpacing * (-thingsToSpaceOut.length/2+i),-0.4,-0.16);
		}
	}

	initSocket();
	initModelCreationSystem(visiBox.planes);
	initMapCreationSystem(visiBox)

	socket.commandReactions["model"] = function(msg)
	{
		//does it need to be in a string? environment distances didn't need to be
		if(msg.modelDataString)
		{
			initPartTwo(msg.modelDataString)
		}
		else
		{
			new THREE.FileLoader().load( "data/tutorialGbr.txt",
				function( modelDataString )
				{
					initPartTwo(modelDataString)
				}
			);
		}
	}
	socket.commandReactions["map"] = function(msg)
	{
		//TODO get the default isolevel from coot
		// var newMap = Map( msg["dataString"], false, visiBox );
		// maps.push(newMap);
		// assemblage.add(newMap)
	}
	socket.commandReactions["mapFilename"] = function(msg)
	{
		// var req = new XMLHttpRequest();
		// req.open('GET', msg.mapFilename, true);
		// req.responseType = 'arraybuffer';
		// req.onreadystatechange = function()
		// {
		// 	if (req.readyState === 4)
		// 	{
		// 		Map( req.response, false);
		// 	}
		// };
		// req.send(null);
	}
	socket.onopen = function()
	{
		//hmm there was "animate" above, do you need this?
		render();
	}
})();