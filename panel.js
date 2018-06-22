'use strict';
/*
	TODO
		reproduce current graph
		load tutorial model and data
		display manager

	could have it follow your head. Probably creates too much distracting movement.
	Words should be small. You read them a couple times and then you know where they are
	You probably want to be able to dial up and down the name sizes
	You probably still want things to be grouped... at least before the user moves them

	want it to be adjustable really, have some more little balls
	Yo look into minification
	Probably all these boxes will have equal width. Ehhhh...
	should be that things move each other out of the way. No, normal monitor rules.
	Alternative idea... they're all extruded in this ellipsoidy way, like a bunch of pipes pointed directly at you
	Might be good to smooth the movement on the panel

	Look at the origami software http://www.amandaghassaei.com/projects/origami_simulator/

	Buttons and switches to have
		merge molecules
		List of all atoms, all residues
		Put your tools on there
		Load tutorial model and data
		sequence view
		Group work features
			“round table” button for if there are multiple people - makes it so all your heads are at reasonable angle
			"Synchronize view"
		"Superpose"? LSQ, SSSM
		For you: "check synchronization of coot and CVR molecule"
		Save, load, export map
		Stats obv
		pukkers
		alignment vs pir
		Control bindings
		Stuff about sequence! Eg reverse direction
		Displays eg ramachandran for whatever you're currently changing. Like dials
		Get monomer, get map and molecule?
		Refmac
		Undo/redo? Help vive people!
		Graphics quality?
		Play tutorial video
		Hydrogen visible
		The time and date, your internet connection speed
		Refinement options
			Use Torsion restraints (default off)
			Use planar peptide restraints (default on)
			Use trans peptide restraints(default on)
			Ramachandran restraints(default off)
			Alpha helix restraints(default off)
			beta strand restraints(default off)
			Refinement "weight"?
		"Other modelling tools"
			cis <-> trans
			base pair
			skeletonize map
			sharpen map?
			Find
				Waters
				Secondary structure
				Ligands
		Haven't been through "Ligand" or "Extensions". Various things in "validate"
		list of the buttons on your controller, you drag things in to make them do stuff

		Display manager; master switches needed for all
			Visibility
			Delete
			Map
				isDiffmap
				Active for refinement
				Color (have a wheel)
				Contour level scrolls
				Opacity? Urgh fuck that
				Block size (WARNING MOTHER FUCKER!!!)
				Sample rate
				Chickenwire
				Show unit cell
			Molecule
				Show symmetry atoms
				Which one is affected by "undo"
				Which one gets atoms and chains added to it
				Carbon color
				Display methods
					Bond radius
					atom radiuse
					cAlpha only
					Waters visible
					Color by
						B factors / occupancy / other metric
						Chain
						Atom (default)
						amino acid (i.e. rainbow)
*/

/*
	This is not necessarily what we want, but is the obvious idea
	Would prefer to manipulate things on the things themselves
	some equivalent of "right click"? But it's terribly hard to get that on a surface
	
	No, a physical tool that you touch on the thing you want to hide
		When you grab it all hidden things appear
*/

var addMenuToPanel;
var updatePanelInput;

function initPanel()
{
	function anglesToPanel(polar, azimuthal)
	{
		var vec = new THREE.Vector3(0,0,-1);
		vec.applyAxisAngle(xVector, azimuthal)
		vec.applyAxisAngle(yVector, -polar)

		return vec
	}
	
	var aroundness = 4.1;
	var downness = 1.1;
	function polarClipToAllowedArea(polar)
	{
		if(polar < Math.PI)
		{
			if( polar > aroundness/2 ) 
			{
				polar = aroundness / 2;
			}
		}
		else 
		{
			if( polar < TAU - aroundness / 2 ) 
			{
				polar = TAU - aroundness / 2;
			}
		}
		return polar;
	}
	function azimuthalClipToAllowedArea(azimuthal)
	{
		if( azimuthal < Math.PI ) 
		{
			azimuthal += TAU
		}

		if( azimuthal > TAU )
		{
			azimuthal = TAU
		}
		if( azimuthal < TAU - downness ) 
		{
			azimuthal = TAU - downness;
		}
		return azimuthal;
	}

	var quadsWide = 2,quadsTall = 2;
	var panel = new THREE.Mesh( new THREE.PlaneGeometry(aroundness,downness,32,16),
		new THREE.MeshPhongMaterial({
			color:0x666666,
			// shininess:100,
			// specular:0xFFFFFF,
			flatShading:true,
		})
	);
	for(var i = 0; i < panel.geometry.vertices.length; i++)
	{
		panel.geometry.vertices[i].y -= downness / 2;
		panel.geometry.vertices[i].copy( anglesToPanel(panel.geometry.vertices[i].x,panel.geometry.vertices[i].y,0) )
	}
	panel.scale.set(0.84,1.24,0.64)
	panel.scale.setScalar(0.84)
	scene.add(panel)

	var collisionPanel = new THREE.Mesh( 
		new THREE.SphereGeometry(1, 64,64),
		new THREE.MeshBasicMaterial({ side:THREE.DoubleSide }) );
	collisionPanel.material.visible = false;
	collisionPanel.scale.copy( panel.scale )
	scene.add( collisionPanel );

	var cursorGeometry = new THREE.EfficientSphereGeometry(0.01);
	var cursorMaterial = new THREE.MeshPhongMaterial({color:0xffd700,shininess:100});
	var cursors = Array(2)
	for(var i = 0; i < 2; i++)
	{
		cursors[i] = new THREE.Mesh(cursorGeometry,cursorMaterial)
		cursors[i].polar = 0;
		cursors[i].azimuthal = 0;
		controllers[i].cursor = cursors[i]
		panel.add(cursors[i])
	}

	updatePanelInput = function()
	{
		/*
			Having your cursor exactly on the geometry, which is an approximation, is having your cake and eating it
			Unless you have a signed distance field

			The laser should end at the cursor
		*/

		for(var i = 0; i < controllers.length; i++)
		{
			var intersections = controllers[i].intersectLaserWithObject(collisionPanel) //we want it intersected with a perfect bloody sphere
			if( intersections.length )
			{
				var intersection = intersections[0].point
				intersection.divide(panel.scale)

				var fromBelowWithZToLeft = new THREE.Vector2(-intersection.z,intersection.x)
				cursors[i].polar = fromBelowWithZToLeft.angle();
				cursors[i].polar = polarClipToAllowedArea( cursors[i].polar );

				var flattenedOnZPlane = intersection.clone().setComponent(1,0).normalize()
				var fromSideWithYUpwards = new THREE.Vector2(intersection.dot(flattenedOnZPlane),intersection.y)
				cursors[i].azimuthal = fromSideWithYUpwards.angle()
				cursors[i].azimuthal = azimuthalClipToAllowedArea( cursors[i].azimuthal );

				cursors[i].position.copy( intersections[0].point )
				// cursors[i].position.copy( anglesToPanel(cursors[i].polar,cursors[i].azimuthal) )

				controllers[i].laser.scale.y = controllers[i].position.distanceTo( cursors[i].position.clone().applyMatrix4(panel.matrix) )
			}

			if( controllers[i].position.length() > panel.scale.x )
			{
				panel.scale.setScalar( controllers[i].position.length() )
			}
		}
	}

	var onColor = new THREE.Color(0x00FF00)
	var offColor = new THREE.Color(0xFF0000);
	var defaultColor = new THREE.Color(0xFFFFFF);
	var highlightedColor = cursorMaterial.color

	// var audio = new Audio("data/piano/A0-1-48.wav");
	// audio.play();
	addMenuToPanel = function(thingsInMenu)
	{
		var lineAngularHeight = 0.05;

		var textMeshes = Array(thingsInMenu.length);
		var widestSignWidth = -1;
		for(var i = 0; i < textMeshes.length; i++)
		{
			textMeshes[i] = makeTextSign( thingsInMenu[i].string, false, false, true)
			if( textMeshes[i].geometry.vertices[1].x > widestSignWidth)
			{
				widestSignWidth = textMeshes[i].geometry.vertices[1].x;
			}
		}

		//"menu space", scaled by lineAngularHeight
		{
			var height = thingsInMenu.length;
			var width = widestSignWidth
			var outlineThickness = 0.2;
			var menu = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry(width+outlineThickness*2,height+outlineThickness*2), new THREE.MeshBasicMaterial({color:0x000000}));
			
			for(var i = 0; i < textMeshes.length; i++)
			{
				if( thingsInMenu[i].switchObject )
				{
					textMeshes[i].material.color.copy( thingsInMenu[i].switchObject[thingsInMenu[i].switchProperty] ? onColor : offColor)
				}

				textMeshes[i].position.x = outlineThickness;
				textMeshes[i].position.y = thingsInMenu.length - i - 1 + outlineThickness;
				textMeshes[i].position.z = 0.0001;
				menu.add(textMeshes[i])
			}
		}

		menu.matrixAutoUpdate = false;
		menu.azimuthal = TAU;
		menu.polar = -TAU / 8 + panel.children.length * 0.2;
		while(menu.polar > TAU / 8)
		{
			menu.polar -= TAU / 4
			menu.azimuthal -= lineAngularHeight * 3
		}
		menu.parentController = null;
		collisionPanel.add(menu)

		var planeAngularHeight = menu.geometry.vertices[1].y * lineAngularHeight;
		var planeAngularWidth  = menu.geometry.vertices[1].x * lineAngularHeight;

		thingsToBeUpdated.push(menu)
		menu.update = function()
		{
			for(var i = 0; i < thingsInMenu.length; i++)
			{
				if( textMeshes[i].material.color.equals(highlightedColor) )
				{
					if( thingsInMenu[i].switchObject )
					{
						textMeshes[i].material.color.copy( thingsInMenu[i].switchObject[thingsInMenu[i].switchProperty] ? onColor : offColor)
					}
					else
					{
						textMeshes[i].material.color.copy( defaultColor )
					}
				}

				if( thingsInMenu[i].buttonFunction || thingsInMenu[i].switchObject )
				{
					for(var j = 0; j < controllers.length; j++)
					{
						if( controllers[j].intersectLaserWithObject( textMeshes[i] ).length !== 0 )
						{
							textMeshes[i].material.color.copy( highlightedColor )
							if( controllers[j].button1 && !controllers[j].button1Old )
							{
								if( thingsInMenu[i].buttonFunction )
								{
									thingsInMenu[i].buttonFunction()
								}
								if( thingsInMenu[i].switchObject )
								{
									thingsInMenu[i].switchObject[thingsInMenu[i].switchProperty] = !thingsInMenu[i].switchObject[thingsInMenu[i].switchProperty];
								}
							}
						}
					}
				}
			}

			if(!menu.parentController )
			{
				for(var i = 0; i < controllers.length; i++)
				{
					if( controllers[i].grippingTop && !controllers[i].grippingTopOld )
					{
						if( controllers[i].intersectLaserWithObject( this ).length !== 0 )
						{
							menu.parentController = controllers[i]
						}
					}
				}
			}
			else
			{
				menu.polar = menu.parentController.cursor.polar;
				menu.azimuthal = menu.parentController.cursor.azimuthal;

				if( !menu.parentController.grippingTop)
				{
					menu.parentController = null;
				}
			}

			menu.polar = polarClipToAllowedArea( menu.polar );
			menu.polar = polarClipToAllowedArea( menu.polar + planeAngularWidth ) - planeAngularWidth;
			menu.azimuthal = azimuthalClipToAllowedArea( menu.azimuthal );
			menu.azimuthal = azimuthalClipToAllowedArea( menu.azimuthal + planeAngularHeight ) - planeAngularHeight;

			var bl = anglesToPanel(menu.polar, menu.azimuthal).multiplyScalar(0.996)
			var tl = anglesToPanel(menu.polar, menu.azimuthal + planeAngularHeight).multiplyScalar(0.996)
			var br = anglesToPanel(menu.polar + planeAngularWidth, menu.azimuthal).multiplyScalar(0.996)
			
			var bottom = br.clone().sub(bl)
			var side = tl.clone().sub(bl)
			var basisZ = new THREE.Vector3().crossVectors(bottom,side).normalize()
			var basisX = bottom.clone().multiplyScalar(1 / menu.geometry.vertices[1].x)
			var basisY = side.clone().multiplyScalar(1 / menu.geometry.vertices[1].y)
			if( basisX.length() < basisY.length() )
			{
				basisY.setLength(basisX.length())
			}
			else
			{
				basisX.setLength(basisY.length())
			}
			menu.matrix.makeBasis(basisX,basisY,basisZ)
			menu.matrix.setPosition(bl);
		}
	}

	var thingsInMenu = [
		{string:"Example menu"},
		{string:"    Switch", switchObject:panel.material, switchProperty:"visible"},
		{string:"    Button", buttonFunction:function(){panel.material.color.setRGB(Math.random(),Math.random(),Math.random())}}
	];
	addMenuToPanel(thingsInMenu)
}