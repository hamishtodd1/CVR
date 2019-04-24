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
							loadPdbIntoAssemblage(filename)
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