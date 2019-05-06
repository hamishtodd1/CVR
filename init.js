/*
// Jeremy England thing
// Heart/other 3D reaction diffusion view-source:https://pmneila.github.io/jsexp/grayscott/
	// "orientation field" is something you can do very nicely and simply with VR and is of relevance to Ivan
	// lower dimensional analogy is moving hand around 2D
		It starts out all neutral orientation
		So you draw some lines (or points) and those do get set in stone
		Every point becomes a weighted average of the value at those curves nearest to it
	Bunch of transparent copies of the controller mesh probably. instancing!
// Diffusive tensor imaging
// Want to do some biology while still here. Some VR lecture. But also something, you know, with puzzles
// No, RD is nice because it is continuous and 2D. So best would be the extrusion thing

Your thoughts about video processing might be silly. Likely there will be an api in future, an api for

TODO
	Highlighting working better
		Thereby to get chain selector being not terrible
		Maybe even pivoting on chain selector?
	chain continuing
	ramachandran
	Would be nice to fix crap about being up or down =/
	Deleter
	Get it on web

TODO to make it independent of coot
	Loaded from a webpage (ask Ivan)
	Socket not needed
	Undo ;_; Not hard for protein painter at least
	Correct PDB export
		You are "just" modifying the positions of existing atoms, and...
		adding a new chain
	
Ideals
	Copy and paste 3D blocks of atoms
	Complex-to-look-at 3D things
		probe dots
		Alt conformers; opacity?
		Manually aligning tomograms?
		Anisotropic atoms? There may be some interesting stuff here
		NCS; Crystallography only tho https://www.youtube.com/watch?v=7QbPvVA-wRQ
		Those little webbings on Coot's amide planes
		Ligands and stuff carry their "theoretical" density with them. Couldn't have that shit in normal coot, too much overlapping!
	Place atom at pointer
		Should replace ligand builder, "add oxt to residue"
		Water, calcium, magnesium, Sodium, chlorine, bromine, SO4, PO4
	Metrics (have to come from coot)
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
	check on atom deletion
	Everything in "panel demo"
	Octree selection
	easy: "hand distances"
	Non-vr head movement sensetivity demo
	"Carbon alpha mode" (/skeletonize?), often used when zoomed out: graphics_to_ca_representation, get_bonds_representation
	NMR data should totally be in there, a set of springs
	ambient occlusion maps for all?
	"Take screenshot"

Beyond
	Back and forth
	IMOD, an EM software with manual manipulation, might also benefit from VRification
	Radio
	Optimise getting map from coot

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
	
	Humane extermination?
	Who counts the badgers? Conducts the surveys for the government?
	RSPCA inspector. Possibly too traumatic
	Police dog handler
	Lab animal caretaker

	Park naturalist
	Rehabilitator?

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
		log("todo, deleters assume no connection")
		let myArrayBuffer = base64ToArrayBuffer( msg["dataString"] )
		let newMap = Map( myArrayBuffer );
	}
	socket.commandReactions["mapFilename"] = function(msg)
	{
		loadMap(msg.mapFilename)
		// let newMap = Map( msg["dataString"], false );
	}

	initPanel();
	initMiscPanelButtons();

	initPdbLoader()
	
	initSurroundings();
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
		HACKY_HAND_ADDITION_REMOVE.sub(camera.position)
		renderer.vr.setPositionAsOrigin( camera.position )
	}
	// console.log(renderer.vr)
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

		//maybe better if they were all cubes? Atoms are spheres.
		//coot specific
		// initRefiner()
		// initAutoRotamer()
		// initEnvironmentDistances()
		
		initRigidSphereMover()
		// initRigidChainMover()
		initProteinPainter()

		initAtomLabeller()
		// initMutator()
		initAtomDeleter()
		initResidueDeleter()
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