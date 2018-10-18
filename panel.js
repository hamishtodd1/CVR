/*
	TODO
		reproduce current graph
		display manager

	Could have it follow your head. Probably creates too much distracting movement.
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

	Put "recenter panel" buttons behind the panel
*/

/*
	This is not necessarily what we want, but is the obvious idea
	Would prefer to manipulate things on the things themselves
	some equivalent of "right click"? But it's terribly hard to get that on a surface
	
	No, a physical tool that you touch on the thing you want to hide
		When you grab it all hidden things appear
*/

function initPanelDemo()
{
	var thingsInMenu = [
		{string:"Example menu"},
		{string:"    Switch", switchObject:controllers[0].controllerModel, switchProperty:"visible"},
		{string:"    Button", buttonFunction:function(){controllers[0].controllerModel.material.color.setRGB(Math.random(),Math.random(),Math.random())}}
	];
	MenuOnPanel(thingsInMenu)

	MenuOnPanel([{
		string: new Date().toLocaleTimeString(),
		additionalUpdate: function()
		{
			if( frameCount % 30 === 0 )
			{
				this.material.setText( new Date().toLocaleTimeString() )
			}
		}
	}])

	addSingleFunctionToPanel = function(f)
	{
		var processedFunctionName = f.name;
		for(var i = 0; i < processedFunctionName.length; i++)
		{
			if( processedFunctionName[i] === processedFunctionName[i].toUpperCase() )
			{
				processedFunctionName = processedFunctionName.slice(0,i) + " " + processedFunctionName.slice(i,processedFunctionName.length)
				i++;
			}
		}
		processedFunctionName = processedFunctionName[0].toUpperCase() + processedFunctionName.slice(1,processedFunctionName.length)

		MenuOnPanel([{string:processedFunctionName, buttonFunction:f}])
	}

	var fakeStrings = [
		"merge molecules",
		// "List of all atoms, all residues?",
		// "Your tools, your metrics",
		// "Group work features",
		// "	Round table",// for if there are multiple people - makes it so all your heads are at reasonable angle",
		// "	Synchronize view",
		// "Superpose",
		// "	LSQ", 
		// "	SSSM",
		// "check synchronization of coot and CVR molecule", //for us
		// "Save, load, export map",
		// "pukkers",
		// "Sequence view",
		// "	Reverse direction",
		// "	alignment vs pir",
		// "	Ask paul what people tend to use it for",
		// "Control bindings",
		// "Refmac",
		// "Undo/redo? Help vive people!",
		// "Graphics quality",
		// "Play tutorial video",
		// "Hydrogen visible",
		// "Refinement options",
		// "	Use Torsion restraints ",		//(default off)
		// "	Use planar peptide restraints",	//(default on)
		// "	Use trans peptide restraints",	//(default on)
		// "	Ramachandran restraints",		//(default off)
		// "	Alpha helix restraints",		//(default off)
		// "	beta strand restraints",		//(default off)
		// "	Refinement weight",				//?
		// "Other modelling tools",
		// "	cis <-> trans",
		// "	base pair",
		// "	skeletonize map",
		// "	sharpen map?",
		// "	Find",
		// "		Waters",
		// "		Secondary structure",
		// "		Ligands",

		// //Haven't been through "Ligand" or "Extensions". Various things in "validate"
		// //list of the buttons on your controller, you drag things in to make them do stuff

		// "Display manager", //master switches needed for all
		// "	Visibility",
		// "	Delete",
		// "	Map",
		// "		isDiffmap",
		// "		Active for refinement",
		// "		Color",// (have a wheel)
		// "		Contour level scrolls",
		// "		Opacity",//Urgh fuck that
		// "		Block size", // WARNING GREEDY GUTS
		// "		Sample rate",
		// "		Chickenwire",
		// "		Show unit cell",
		// "	Molecule",
		// "		Show symmetry atoms",
		// "		Which one is affected by undo",
		// "		Which one gets atoms and chains added to it",
		// "		Carbon color",
		// "		Display methods",
		// "			Bond radius",
		// "			atom radiuse",
		// "			cAlpha only",
		// "			Waters visible",
		// "			Color by",
		// "				B factors / occupancy / other metric",
		// "				Chain",
		// "				Atom (default)",
		// "				amino acid (i.e. rainbow)",
	];

	var bunch = [];
	for(var i = 0; i < fakeStrings.length; i++)
	{
		bunch.push({string:fakeStrings[i]})

		if( i === fakeStrings.length-1 || fakeStrings[i+1][0] !== "	")
		{
			MenuOnPanel(bunch)
			bunch.length = 0;
		}
	}
}

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

	updatePanel = function()
	{
		/*
			Having your cursor exactly on the geometry, which is an approximation, is having your cake and eating it
			Unless you have a signed distance field

			The laser should end at the cursor
		*/

		for(var i = 0; i < controllers.length; i++)
		{
			var intersections = controllers[i].intersectLaserWithObject(collisionPanel)
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
				collisionPanel.scale.copy( panel.scale )
			}
		}
	}

	var onColor = new THREE.Color(0x00FF00)
	var offColor = new THREE.Color(0xFF0000);
	var defaultColor = new THREE.Color(0xFFFFFF);
	var highlightedColor = cursorMaterial.color

	var menus = []; //not really menus are they

	// var audio = new Audio("data/piano/A0-1-48.wav");
	// audio.play();
	MenuOnPanel = function(thingsInMenu)
	{
		var lineAngularHeight = 0.034;

		var textMeshes = Array(thingsInMenu.length);
		var widestSignWidth = 0;
		var totalElementsHeight = 0;
		for(var i = 0; i < textMeshes.length; i++)
		{
			textMeshes[i] = makeTextSign( thingsInMenu[i].string, false, false, true)
			for(var propt in thingsInMenu[i])
			{
				if(propt !== "string")
				{
					textMeshes[i][propt] = thingsInMenu[i][propt]
				}
			}

			if( textMeshes[i].geometry.vertices[1].x > widestSignWidth)
			{
				widestSignWidth = textMeshes[i].geometry.vertices[1].x;
			}

			totalElementsHeight++;
			if(textMeshes[i].rectangularObject3D)
			{
				totalElementsHeight += textMeshes[i].rectangularObject3D.geometry.vertices[0].y
			}
		}

		//"menu space", scaled by lineAngularHeight
		{
			var outlineThickness = 0.2;
			var menu = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry(widestSignWidth+outlineThickness*2,totalElementsHeight+outlineThickness*2), new THREE.MeshBasicMaterial({color:0x262626}));
			menus.push(menu)

			for(var i = 0; i < textMeshes.length; i++)
			{
				menu.add(textMeshes[i])
				if(i === 0)
				{
					textMeshes[i].position.z = 0.0001;
					textMeshes[i].position.x = outlineThickness;
					textMeshes[i].position.y = totalElementsHeight-1 + outlineThickness;
				}
				else
				{
					textMeshes[i].position.copy( textMeshes[i-1].position )
					textMeshes[i].position.y -= 1
				}

				if( textMeshes[i].rectangularObject3D )
				{
					menu.add(textMeshes[i].rectangularObject3D)
					textMeshes[i].rectangularObject3D.position.copy(textMeshes[i].position)
					textMeshes[i].rectangularObject3D.position.y -= 1
				}

				if( textMeshes[i].switchObject )
				{
					textMeshes[i].material.color.copy( textMeshes[i].switchObject[textMeshes[i].switchProperty] ? onColor : offColor)
				}
			}

			var menuBackground = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry(widestSignWidth,textMeshes.length), new THREE.MeshBasicMaterial({color:0x3F3F3F}));
			menuBackground.position.set( outlineThickness,outlineThickness,textMeshes[0].position.z / 2 )
			menu.add( menuBackground )
		}

		menu.matrixAutoUpdate = false;
		menu.azimuthal = TAU;
		var horizontalSpacing = 0.5;
		menu.polar = menus.length === 1 ? -aroundness / 2 : menus[menus.length-2].polar + horizontalSpacing
		while(menu.polar > aroundness / 2 )
		{
			menu.polar -= aroundness
			menu.azimuthal -= lineAngularHeight * 4
		}
		//want to use their polar width
		menu.parentController = null;
		collisionPanel.add(menu)

		var planeAngularHeight = menu.geometry.vertices[1].y * lineAngularHeight;

		objectsToBeUpdated.push(menu)
		menu.update = function()
		{
			for(var i = 0; i < textMeshes.length; i++)
			{
				if( textMeshes[i].additionalUpdate )
				{
					textMeshes[i].additionalUpdate();
				}

				if( textMeshes[i].material.color.equals(highlightedColor) )
				{
					if( textMeshes[i].switchObject )
					{
						textMeshes[i].material.color.copy( textMeshes[i].switchObject[textMeshes[i].switchProperty] ? onColor : offColor)
					}
					else
					{
						textMeshes[i].material.color.copy( defaultColor )
					}
				}

				if( textMeshes[i].buttonFunction || textMeshes[i].switchObject )
				{
					for(var j = 0; j < controllers.length; j++)
					{
						if( controllers[j].intersectLaserWithObject( textMeshes[i] ).length !== 0 )
						{
							textMeshes[i].material.color.copy( highlightedColor )
							if( controllers[j].button1 && !controllers[j].button1Old )
							{
								if( textMeshes[i].buttonFunction )
								{
									textMeshes[i].buttonFunction()
								}
								if( textMeshes[i].switchObject )
								{
									textMeshes[i].switchObject[textMeshes[i].switchProperty] = !textMeshes[i].switchObject[textMeshes[i].switchProperty];
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
					if( controllers[i].grippingTop && !controllers[i].grippingTopOld ) //or alternatively, get grabbed if controllers not grabbing anything. i.e. this goes in panelUpdate. Look in todo!
					{
						if( controllers[i].intersectLaserWithObject( this ).length !== 0 )
						{
							menu.parentController = controllers[i]
						}
					}
				}
			}

			if(menu.parentController)
			{
				menu.polar = menu.parentController.cursor.polar;
				menu.azimuthal = menu.parentController.cursor.azimuthal;

				updateMatrix()

				if( !menu.parentController.grippingTop)
				{
					menu.parentController = null;
				}
			}
		}

		function updateMatrix()
		{
			menu.azimuthal = azimuthalClipToAllowedArea( menu.azimuthal );
			menu.azimuthal = azimuthalClipToAllowedArea( menu.azimuthal + planeAngularHeight ) - planeAngularHeight;
			var planeAngularWidth  = menu.geometry.vertices[1].x * lineAngularHeight;
			menu.polar = polarClipToAllowedArea( menu.polar );
			menu.polar = polarClipToAllowedArea( menu.polar + planeAngularWidth ) - planeAngularWidth;

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
		updateMatrix()
	}

	initPanelDemo()
}