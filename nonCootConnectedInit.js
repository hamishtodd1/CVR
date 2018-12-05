function nonCootConnectedInit()
{
	loadFakeMap("tutorial.map")

	new THREE.FileLoader().load( "modelsAndMaps/tutorialGetBondsRepresentation.txt",
		function( modelDataString )
		{
			makeModelFromCootString( modelDataString);
		}
	);
}

function loadFakeMap(filename)
{
	//not just fileloader?
	let req = new XMLHttpRequest();
	req.open('GET', 'modelsAndMaps/' + filename, true);
	req.responseType = 'arraybuffer';
	req.onreadystatechange = function()
	{
		if (req.readyState === 4)
		{
			Map( req.response );
		}
	};
	req.send(null);
}