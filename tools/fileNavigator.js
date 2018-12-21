function initFileNavigator()
{
	let requestMsg = {command:"pdbAndMapFilenames"}
	socket.send(JSON.stringify(requestMsg))

	socket.commandReactions["pdbAndMapFilenames"] = function(msg)
	{
		let menuEntries = [{string:"modelsAndMaps"}]

		for(let i = 0; i < msg.filenames.length; i++)
		{
			let filename = msg.filenames[i]
			let fileType = filename.substr(filename.length-3,3)
			if(fileType === "pdb" || fileType === "map")
			{
				menuEntries.push({
					string: "		" + filename,
					buttonFunction:function()
					{
						if(fileType === "pdb")
						{
							//hacky, you should be loading it into coot
							new THREE.PDBLoader().load( "modelsAndMaps/" + filename, function ( carbonAlphas, geometryAtoms )
							{
								let atoms = atomArrayFromElementsAndCoords(geometryAtoms.elements,geometryAtoms.attributes.position.array)
								let model = makeMoleculeMesh( atoms, true );
								putModelInAssemblage(model)
							})
						}
						else
						{
							loadFakeMap(filename)
						}
					}
				})
			}
		}

		MenuOnPanel(menuEntries,1.74,5.58)
	}
}