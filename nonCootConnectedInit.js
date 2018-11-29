function nonCootConnectedInit()
{
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
			makeModelFromCootString( modelDataString);
		}
	);
}