/*
Do the whole coot tutorial, and the EM one too
	Can load a map, can load a molecule
	Fix the atom deletion problems
	Refinement
		Grabbing two ends of a chain defines it as refinement area
		Force restraints
	Mutate / everything else sitting there in script
	Spectation, or at least "Save"

TODO for Dec 4th / CCP4
	Email Lovelace
	Selection of atoms going up the chain
	Display manager
	Add terminal residue
	Get map from coot
	Refinement
	Check autofit rotamer works
	Loaded from a webpage
	Stuff in "Measures"
	
TODO during PhD
	Everything in "panel demo"
	Octree selection
	"undo"
		Just coot undo, then get the result? Full refresh
		Button on controller reserved
		Flash or something
	Place atom at pointer
		Should replace ligand builder, "add oxt to residue"
		Water, calcium, magnesium, Sodium, chlorine, bromine, SO4, PO4
	Complex-to-look-at 3D things
		Alt conformers; opacity?
		Manually aligning tomograms?
		Anisotropic atoms? There may be some interesting stuff here
		NCS; Crystallography only tho https://www.youtube.com/watch?v=7QbPvVA-wRQ
		Those little webbings on Coot's amide planes
	easy: "hand distances"
	Non-vr head movement sensetivity demo
	probe dots
	Selection of rotamers
	"Carbon alpha mode"(/skeletonize?), often used when zoomed out: graphics_to_ca_representation, get_bonds_representation
	bug with some residues highlighting many residues?
	NMR data should totally be in there, a set of springs
	Ligands and stuff carry their "theoretical" density with them. Couldn't have that shit in normal coot, too much overlapping!
	ambient occlusion maps for all?
	Copy and paste 3D blocks of atoms
	"Take screenshot"

Beyond
	IMOD, an EM software with manual manipulation, might also benefit from VRification

Bugs
	Firefox: sometimes it just doesn't start. setAnimationLoop is set, but loop is not called

VR Games to get maybe
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


function init()
{
	// if(!WEBVR.checkAvailability())
	// {
	// 	console.error("No webvr!")
	// 	return;
	// }

	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.localClippingEnabled = true;
	renderer.sortObjects = false;
	document.body.appendChild( renderer.domElement );
	renderer.vr.enabled = true;

	let maps = [];
	let atoms = null; //because fixed length

	initPanel();
	
	let visiBox = initVisiBox();
	assemblage.position.copy(visiBox.position)
	assemblage.scale.setScalar( 0.028 ); //0.045, 0.028 is nice, 0.01 fits on screen
	scene.add(assemblage);
	
	let windowResize = function()
	{
	    renderer.setSize( window.innerWidth, window.innerHeight );
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	}
	window.addEventListener( 'resize', windowResize)
	
	initSurroundings();
	initScaleStick();
	// initKeyboardInput();
	// initMonomerReceiver()
	// initMenus();
	// initSpecatorRepresentation();
	initSocket();
	initModelCreationSystem(visiBox.planes);
	initMapCreationSystem(visiBox)
	// initStats(visiBox.position);
	initHandInput()

	let timePanel = MenuOnPanel( [ {
		string: new Date().toLocaleTimeString(),
		additionalUpdate: function()
		{
			if( frameCount % 30 === 0 )
			{
				this.material.setText( new Date().toLocaleTimeString() )
			}
		}
	} ], 1.764, 5.383 )

	setCurrentHeadPositionAsCenter = function()
	{
		renderer.vr.setPositionAsOrigin( camera.position )
	}
	addSingleFunctionToPanel(setCurrentHeadPositionAsCenter,6.05,5.38)
	setCurrentHeadPositionAsCenter() //wanna be accessible from behind the panel?

	let vrButton = WEBVR.createButton( renderer )
	document.body.appendChild( vrButton );
	document.addEventListener( 'keydown', function( event )
	{
		if(event.keyCode === 69 )
		{
			vrButton.onclick()
			window.removeEventListener('resize', windowResize)
		}
	}, false );

	function loadTutorialModelAndData()
	{
		//probably insufficient, do more here
		for(let i = assemblage.children.length-1; i >-1; i--)
		{
			assemblage.children[i].dispose()
		}

		//not just fileloader
		let req = new XMLHttpRequest();
		req.open('GET', 'modelsAndMaps/tutorial.map', true);
		req.responseType = 'arraybuffer';
		req.onreadystatechange = function()
		{
			if (req.readyState === 4)
			{
				Map( req.response, false);
			}
		};
		req.send(null);

		new THREE.FileLoader().load( "modelsAndMaps/tutorialGetBondsRepresentation.txt",
			function( modelDataString )
			{
				makeModelFromCootString( modelDataString, visiBox.planes );
			}
		);
	}
	addSingleFunctionToPanel(loadTutorialModelAndData, 4.23,5.38);
	socket.commandReactions["loadTutorialModelAndData"] = loadTutorialModelAndData

	socket.commandReactions["model"] = function(msg)
	{
		makeModelFromCootString( msg.modelDataString, visiBox.planes );
	}
	socket.commandReactions["map"] = function(msg)
	{
		//TODO get the default isolevel from coot
		// let newMap = Map( msg["dataString"], false, visiBox );
		// maps.push(newMap);
		// assemblage.add(newMap)
	}

	socket.onopen = function()
	{
		let thingsToSpaceOut = []; //can do better than that now

		initFileNavigator()

		let visiblePlace = visiBox.position.clone()
		// assemblage.worldToLocal(visiblePlace)
		thingsToSpaceOut.push(
			// //coot specific
			// // initAtomDeleter(),
			// // initResidueDeleter(),
			// // initEnvironmentDistance(),
			// initAutoRotamer(),
			// initRefiner(),

			// initPointer(),
			// initProbeDotter(),
			// // initAtomLabeller(),
			// initRigidBodyMover(),
			// initNucleicAcidPainter(),
			// initMutator()
			// initProteinPainter()
		);

		initNewAtomRoster()

		let toolSpacing = 0.15;
		for(let i = 0; i < thingsToSpaceOut.length; i++)
		{
			thingsToSpaceOut[i].position.set( toolSpacing * (-thingsToSpaceOut.length/2+i),-0.4,-0.16);
		}

		let loopCallString = getStandardFunctionCallString(loop);
		renderer.setAnimationLoop( function()
		{
			eval(loopCallString);
			renderer.render( scene, camera );
		} )
	}
}