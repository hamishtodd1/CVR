function fakeCootConnectedInit()
{
	loadMap("tutorial.map")

	new THREE.FileLoader().load( "modelsAndMaps/tutorialGetBondsRepresentation.txt",
		function( modelDataString )
		{
			makeModelFromCootString( modelDataString);
		}
	);
}

function loadMap(filename, isolevel)
{
	//not just fileloader?
	let req = new XMLHttpRequest();
	req.open('GET', 'modelsAndMaps/' + filename, true);
	req.responseType = 'arraybuffer';
	req.onreadystatechange = function()
	{
		if (req.readyState === 4)
		{
			Map( req.response, isolevel );
		}
	};
	req.send(null);
}

function nonCootConnectedInit()
{
	new THREE.FileLoader().load( "modelsAndMaps/" + "drugIsInteresting.pdb", putPdbStringIntoAssemblage );
	loadMap("drugIsInteresting.map")

	// loadMap("jp.map",3.4)
	// assemblage.position.set(-0.6326659774326654,0.8330610470434914,-1.7592)
	// assemblage.scale.setScalar(0.028)
	// assemblage.quaternion.set(0.20453074142494626,0.7848390257791691,0.5651683410241131,-0.15092920).normalize()
	
	// loadMap("challenge.map")
}