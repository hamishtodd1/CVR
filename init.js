/*
Your thoughts about video processing might be silly. Likely there will be an api in future, an api for

UI for AR will be huge. In principle some simple app doing something that a thousand apps already do could make a lot of money

TODO
	You ought to have deleter too
	Get it on web and email to folks at conference
	Refinement (make Paul happy)
		force restraints
	Highlighting working better
	Protein painter can start from current chain
	Ramachandran for painter (but then you need sequence)
	Selection of rotamers

TODO to make it independent of coot
	Loaded from a webpage (ask Ivan)
	Socket not needed
	Undo ;_;
	Correct PDB export
		You are "just" modifying the positions of existing atoms, and...
		adding a new chain
	
TODO during PhD
	Everything else sitting there in script
	If you want those metrics you probably have to get them from coot
	Mutate
	Coot tutorial including EM tutorial
		Change map color
		Unmodelled blobs
		"Density fit analysis"
		Merge
			Urgh that's a ballache, have to make sure it works perfectly with coot
		Fit loop
		Refmac
		Waters
		Symmetry atoms
	"undo"
		Just coot undo, then get the result? Full refresh
		Button on controller reserved
		Flash or something
		Hydrogen hiding really should be automatic
	Get map from coot
	Save
	Complex-to-look-at 3D things
		probe dots
		Alt conformers; opacity?
		Manually aligning tomograms?
		Anisotropic atoms? There may be some interesting stuff here
		NCS; Crystallography only tho https://www.youtube.com/watch?v=7QbPvVA-wRQ
		Those little webbings on Coot's amide planes
	Fix the atom deletion problems
	Everything in "panel demo"
	Octree selection
	easy: "hand distances"
	Non-vr head movement sensetivity demo
	"Carbon alpha mode" (/skeletonize?), often used when zoomed out: graphics_to_ca_representation, get_bonds_representation
	NMR data should totally be in there, a set of springs
	Ligands and stuff carry their "theoretical" density with them. Couldn't have that shit in normal coot, too much overlapping!
	ambient occlusion maps for all?
	Copy and paste 3D blocks of atoms
	"Take screenshot"
	Place atom at pointer
		Should replace ligand builder, "add oxt to residue"
		Water, calcium, magnesium, Sodium, chlorine, bromine, SO4, PO4

Beyond
	Back and forth
	IMOD, an EM software with manual manipulation, might also benefit from VRification
	Radio

Bugs/checks
	Sometimes you start it and you're below the floor
	Sometimes you start it and the hands don't work
	bug with some residues highlighting many residues?
	Firefox: sometimes it just doesn't start. setAnimationLoop is set, but loop is not called
	"onletgo" things

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
		Hotdogs, horseshoes and hand grenades
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

	initSocket();
	socket.commandReactions["you aren't connected to coot"] = function()
	{
		// fakeCootConnectedInit()
		nonCootConnectedInit()
	}
	socket.commandReactions["model"] = function(msg)
	{
		makeModelFromCootString( msg.modelDataString );
	}
	function base64ToArrayBuffer(base64String) 
	{
		var binary_string = atob(base64String);
		var len = binary_string.length;
		var bytes = new Uint8Array( len );
		for (var i = 0; i < len; i++)
		{
			bytes[i] = binary_string.charCodeAt(i);
		}
		return bytes.buffer;
	}
	socket.commandReactions["map"] = function(msg)
	{
		let myArrayBuffer = base64ToArrayBuffer( msg["dataString"] )
		let newMap = Map( myArrayBuffer, false );
	}
	socket.commandReactions["mapFilename"] = function(msg)
	{
		loadMap(msg.mapFilename)
		// let newMap = Map( msg["dataString"], false );
	}

	initPanel();
	initMiscPanelButtons();

	initPdbLoader()
	
	initVisiBox();
	assemblage.position.z = -0.9
	assemblage.scale.setScalar( 0.04 ); //0.04 means no visibox wasted, 0.028 is nice, 0.01 fits on screen
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
	initModelCreationSystem();
	initMapCreationSystem()
	initStats();
	initHands()
	initDisplayManager()

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

	socket.onopen = function()
	{
		initFileNavigator()

		// //maybe better if they were all cubes? Atoms are spheres.
		// //coot specific
		// // initRefiner()
		// initAutoRotamer()

		// initEnvironmentDistances()

		// initRefiner()
		
		initRigidSphereMover()
		initRigidChainMover()
		initProteinPainter()

		// initAtomLabeller()
		initMutator()
		// initAtomDeleter()
		// initResidueDeleter()
		// initNewAtomRoster()

		// initRamachandran()

		socket.send(JSON.stringify({command:"loadPolarAndAzimuthals"}))

		let loopCallString = getStandardFunctionCallString(loop);
		renderer.setAnimationLoop( function()
		{
			eval(loopCallString);
			renderer.render( scene, camera );
		} )
	}
}