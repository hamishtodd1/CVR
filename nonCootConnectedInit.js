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
	loadPdbIntoAssemblage("drugIsInteresting.pdb")
	loadMap("drugIsInteresting.map")

	// loadMap("kyle.map")
	// new THREE.FileLoader().load( "modelsAndMaps/kyleGbr.txt",
	// 	function( modelDataString )
	// 	{
	// 		makeModelFromCootString( modelDataString);
	// 	}
	// );

	// loadMap("jp.map",3.4)
	// assemblage.position.set(-0.6326659774326654,0.8330610470434914,-1.7592)
	// assemblage.scale.setScalar(0.028)
	// assemblage.quaternion.set(0.20453074142494626,0.7848390257791691,0.5651683410241131,-0.15092920).normalize()

	//TODO until there's files in there, don't initialize and just have a sign

	let dragTextBoxSign = makeTextSign("drop to read file")
	dragTextBoxSign.scale.multiplyScalar(0.01)
	dragTextBoxSign.position.z = -0.1
	dragTextBoxSign.visible = false
	camera.add(dragTextBoxSign)

	let pdbString = ""

	MenuOnPanel([{string:"Export PDB", buttonFunction:function()
	{
		exportPdb()
	}}])
	
	renderer.domElement.addEventListener('dragenter', function(e)
	{
		e.preventDefault();
		dragTextBoxSign.visible = true
	}, false)
	renderer.domElement.addEventListener('dragleave', function(e)
	{
		e.preventDefault();
		dragTextBoxSign.visible = false
	}, false)
	renderer.domElement.addEventListener('dragover', function(e)
	{
		e.preventDefault();
		//if you don't have this then drop will do funny stuff
	}, false)
	renderer.domElement.addEventListener('drop', function(e)
	{
		e.preventDefault();
		dragTextBoxSign.visible = false
		
		let file = e.dataTransfer.files[0]
		// loadFakeMap(filename)
		// console.log(file)

		const reader = new FileReader();

		if ( /\.(pdb|ent)$/.test(file.name) )
		{
			reader.onload = function (evt)
			{
				pdbString = evt.target.result

				let atomsAndBonds = parsePdb( pdbString );
				let geometryAtoms = createModel( atomsAndBonds ).geometryAtoms

				let atoms = atomArrayFromElementsAndCoords( geometryAtoms.elements, geometryAtoms.attributes.position.array)
				let model = makeMoleculeMesh( atoms, true );

				putModelInAssemblage(model)
			};
			reader.readAsText(file);
		}
		else if (/\.(map|ccp4|mrc|dsn6|omap)$/.test(file.name))
		{
			const map_format = /\.(dsn6|omap)$/.test(file.name) ? 'dsn6' : 'ccp4';
			reader.onloadend = function (evt) {
				if (evt.target.readyState == 2)
				{
					Map( evt.target.result )
				}
			};
			reader.readAsArrayBuffer(file);
		}
		else
		{
			console.error("unknown file extension")
		}
	}, false)
}