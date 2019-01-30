function initDisplayManager()
{
	let displayManagerMenu = MenuOnPanel([{string:"Display manager"}])

	addMapDisplayManager = function(map)
	{
		let newMenu = MenuOnPanel([
			{string:"		Map"},
			{string:"				Whole visible", 	switchObject:	map, 				switchProperty:"visible"},
			{string:"				Unit cell visible", switchObject:	map.unitCellMesh, 	switchProperty:"visible"},
			{string:"				Difference map", 	buttonFunction: map.toggleDiffMap },

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
			}}
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

	let unused = ["Display manager", //master switches needed for all
	"	Map",
	"		Delete",
	"		isDiffmap",
	"		Active for refinement",
	"		Active for contour scrolls",
	"		Color",// color wheel
	"		Block size (puke warning)", //sliders
	"		Sample rate",
	"	Molecule",
	"		Show symmetry atoms",
	"		Active for undo",
	"		Active for new atoms and chains",
	"		Carbon color",// color wheel
	"		Display methods",
	"			Bond radius",
	"			atom radiuse",
	"			cAlpha only",
	"			Hydrogens visible",
	"			Waters visible",
	"			Color by",
	"				B factors / occupancy / other metric",
	"				Chain",
	"				Atom (default)",
	"				amino acid (i.e. rainbow)"]
}