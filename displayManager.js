function initDisplayManager()
{
	let displayManagerMenu = MenuOnPanel([{string:"Display manager"}])

	addMapDisplayManager = function(map)
	{
		let newMenu = MenuOnPanel([
			{string:"		Map"},
			{string:"				Whole visible", 	switchObject:	map, 				switchProperty:"visible"},
			{string:"				Unit cell visible", switchObject:	map.unitCellMesh, 	switchProperty:"visible"},
			{string:"				Difference map"},

			{string:"				Chickenwire",buttonFunction:function()
			{
				for(let i = 0; i < map.children.length; i++)
				{
					if( map.children[i] !== map.unitCellMesh)
					{
						map.children[i].back.visible = !map.children[i].back.visible
						// map.children[i].transparent.visible = !map.children[i].transparent.visible
					}
				}
			}},

			// {string:"    Object3d",	object3d: testObject3d },//object3d could be a graph or rama
			// {string:"    Button", 	buttonFunction:	function(){handControllers[0].controllerModel.material.color.setRGB(Math.random(),Math.random(),Math.random());console.log("example menu item clicked")}},
		])

		newMenu.setPolarAndAzimuthal(displayManagerMenu.polar,displayManagerMenu.azimuthal-TAU*0.028)
	}

	addModelDisplayManager = function(model)
	{
		let newMenu = MenuOnPanel([
			{string:"	Model"},
			{string:"	Whole visible", 	switchObject:	model, 				switchProperty:"visible"},
			])

		newMenu.setPolarAndAzimuthal(displayManagerMenu.polar,displayManagerMenu.azimuthal-TAU*0.04)
	}

		// "Display manager", //master switches needed for all
		// "	Map",
		// "		Delete",
		// "		isDiffmap",
		// "		Active for refinement",
		// "		Color",// color wheel
		// "		Contour level scrolls",
		// "		Opacity",
		// "		Block size (puke warning)", //sliders
		// "		Sample rate",
		// "		Chickenwire",
		// "	Molecule",
		// "		Show symmetry atoms",
		// "		Which one is affected by undo",
		// "		Which one gets atoms and chains added to it",
		// "		Carbon color",// color wheel
		// "		Display methods",
		// "			Bond radius",
		// "			atom radiuse",
		// "			cAlpha only",
		// "			Waters visible",
		// "			Color by",
		// "				B factors / occupancy / other metric",
		// "				Chain",
		// "				Atom (default)",
		// "				amino acid (i.e. rainbow)"
}