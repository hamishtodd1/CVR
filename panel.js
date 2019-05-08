/*
	TODO
		reproduce current graph
		display manager
		Put another cursor on it... the mouse...
		You only click the things if you can see em

	Maybe you should have dotted lines on the surface that are a voronoi or whatever for the menus
	And if you click inside the dotted lines, that's clicking that menu item

	Just keep cursors within a slightly truncated area

	Shortcut system
		the balls stay on the panel (do that)
		Notch off the corners so there are eight corners for it to get caught on, eight shortcuts

	Hey maybe its radius should be the radius that whatever headset you've got is focussed at?

	Could have it follow your head. Paradoxically, would create too much distracting movement.
	Words should be small. You read them a couple times and then you know where they are
	You probably want to be able to dial up and down the name sizes
	You probably still want things to be grouped... at least before the user moves them

	want it to be adjustable really, have some more little balls
	Yo look into minification
	Probably all these boxes will have equal width. Ehhhh...
	should be that things move each other out of the way. No, normal monitor rules.
	Alternative idea... they're all extruded in this ellipsoidy way, like a bunch of pipes pointed directly at you
	Might be good to smooth the movement on the panel
	
	This is not necessarily what we want, but is the obvious idea
	Would prefer to manipulate things on the things themselves
	some equivalent of "right click"? But it's terribly hard to get that on a surface
	
	No, a physical tool that you touch on the thing you want to hide
		When you grab it all hidden things appear
*/

function initMiscPanelButtons()
{
	//save
	Save = function()
	{
		//need to choose an imol
		let randomlyChosenImol = models[0].atoms[0].imol
		socket.send({
			imol:randomlyChosenImol
		})
	}
	addSingleFunctionToPanel(Save)

	MenuOnPanel( [ {
		string: new Date().toLocaleTimeString(),
		additionalUpdate: function()
		{
			if( frameCount % 30 === 0 )
			{
				this.material.setText( new Date().toLocaleTimeString() )
			}
		}
	} ], 1.92, 5.383 )
}

function initPanel()
{
	function anglesToPanel(polar, azimuthal)
	{
		let vec = new THREE.Vector3(0,0,-1);
		vec.applyAxisAngle(xVector, azimuthal)
		vec.applyAxisAngle(yVector, -polar)

		return vec
	}
	
	let aroundness = 3.99;
	let downness = 0.9;
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

	let quadsWide = 2,quadsTall = 2;
	panel = new THREE.Mesh( new THREE.PlaneGeometry(aroundness,downness,32,16),
		new THREE.MeshPhongMaterial({
			color:0x666666,
			// shininess:100,
			// specular:0xFFFFFF,
			flatShading:true,
			// transparent:true,
			// opacity:0.01
		})
	);
	for(let i = 0; i < panel.geometry.vertices.length; i++)
	{
		panel.geometry.vertices[i].y -= downness / 2;
		panel.geometry.vertices[i].copy( anglesToPanel(panel.geometry.vertices[i].x,panel.geometry.vertices[i].y,0) )
	}
	// panel.scale.set(0.84,1.24,0.64)
	panel.scale.setScalar(0.84)
	scene.add(panel)

	let collisionPanel = new THREE.Mesh(
		new THREE.SphereGeometry(1, 64,64),
		new THREE.MeshBasicMaterial({ side:THREE.DoubleSide }) );
	collisionPanel.material.visible = false;
	collisionPanel.scale.copy( panel.scale )
	scene.add( collisionPanel );

	let cursorGeometry = new THREE.EfficientSphereGeometry(0.023);
	let cursorMaterial = new THREE.MeshPhongMaterial({color:0xffd700,shininess:100});
	let cursors = Array(2)
	let interpolatingIndex = 0
	for(let i = 0; i < 2; i++)
	{
		cursors[i] = new THREE.Mesh(cursorGeometry,cursorMaterial)
		cursors[i].polar = 0;
		cursors[i].azimuthal = 0;
		handControllers[i].cursor = cursors[i]
		panel.add(cursors[i])

		cursors[i].interpolatingAzimuthals = Array(7)
		cursors[i].interpolatingPolars = Array( cursors[i].interpolatingAzimuthals.length )
		for(let j = 0; j < cursors[i].interpolatingAzimuthals.length; j++)
		{
			cursors[i].interpolatingAzimuthals[j] = 0
			cursors[i].interpolatingPolars[j] = 0
		}
	}	

	updatePanel = function()
	{
		/*
			Having your cursor exactly on the geometry, which is an approximation, is having your cake and eating it
			Unless you have a signed distance field

			The laser should end at the cursor
		*/

		for(let i = 0; i < handControllers.length; i++)
		{
			let intersections = handControllers[i].intersectLaserWithObject(collisionPanel)
			if( intersections.length )
			{
				let intersection = intersections[0].point
				intersection.divide(panel.scale)

				let fromBelowWithZToLeft = new THREE.Vector2(-intersection.z,intersection.x)
				cursors[i].interpolatingPolars[interpolatingIndex] = fromBelowWithZToLeft.angle();
				cursors[i].interpolatingPolars[interpolatingIndex] = polarClipToAllowedArea( cursors[i].interpolatingPolars[interpolatingIndex] );

				let flattenedOnZPlane = intersection.clone().setComponent(1,0).normalize()
				let fromSideWithYUpwards = new THREE.Vector2(intersection.dot(flattenedOnZPlane),intersection.y)
				cursors[i].interpolatingAzimuthals[interpolatingIndex] = fromSideWithYUpwards.angle()
				cursors[i].interpolatingAzimuthals[interpolatingIndex] = azimuthalClipToAllowedArea( cursors[i].interpolatingAzimuthals[interpolatingIndex] );

				cursors[i].azimuthal = 0
				cursors[i].polar = 0
				for(let j = 0; j < cursors[i].interpolatingAzimuthals.length; j++)
				{
					cursors[i].azimuthal += cursors[i].interpolatingAzimuthals[j] / cursors[i].interpolatingAzimuthals.length
					cursors[i].polar += cursors[i].interpolatingPolars[j] / cursors[i].interpolatingAzimuthals.length
				}

				if(i===1)
				{
					interpolatingIndex++
					if( interpolatingIndex >= cursors[i].interpolatingAzimuthals.length )
					{
						interpolatingIndex = 0
					}
				}

				cursors[i].position.copy( anglesToPanel(cursors[i].polar,cursors[i].azimuthal) )
				handControllers[i].laser.scale.y = handControllers[i].position.distanceTo( cursors[i].position.clone().applyMatrix4(panel.matrix) )
			}

			//a bad idea
			// if( handControllers[i].position.length() > panel.scale.x )
			// {
			// 	panel.scale.setScalar( handControllers[i].position.length() )
			// 	collisionPanel.scale.copy( panel.scale )
			// }
		}
	}

	let onColor = new THREE.Color(0x00FF00)
	let offColor = new THREE.Color(0xFF0000);
	let defaultColor = new THREE.Color(0xFFFFFF);
	let highlightedColor = cursorMaterial.color

	let menus = []; //not really menus are they
	let object3dScaleWhenInMenuInLineHeight = 15

	let menuGapSizeInLineHeights = 2
	function getObject3dBoundingBox(object3d)
	{
		let sourceGeometry = object3d.geometry == undefined ? object3d.children[0].geometry : object3d.geometry
		sourceGeometry.computeBoundingBox()
		return sourceGeometry.boundingBox
	}
	function uniformlyScaleObject3dToMenuGapSize(object3d)
	{
		let object3dHeight = (getObject3dBoundingBox(object3d).getSize(new THREE.Vector3())).y
		object3d.scale.setScalar(menuGapSizeInLineHeights/object3dHeight)
	}

	// var audio = new Audio("data/piano/A0-1-48.wav");
	// audio.play();
	MenuOnPanel = function(thingsInMenu,polar,azimuthal)
	{
		let lineAngularHeight = 0.034;

		let textMeshes = Array(thingsInMenu.length);
		let widestSignWidth = 0;
		let totalElementsHeight = 0;
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
			if(textMeshes[i].object3d)
			{
				totalElementsHeight += menuGapSizeInLineHeights
				uniformlyScaleObject3dToMenuGapSize(textMeshes[i].object3d)				
			}
		}
		// if(textMeshes.length>1 && textMeshes[1].switchObject !== undefined)console.log("yo")

		//"menu space", scaled by lineAngularHeight
		let menu = null
		{
			let outlineThickness = 0.2;
			menu = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry(widestSignWidth+outlineThickness*2,totalElementsHeight+outlineThickness*2), new THREE.MeshBasicMaterial({color:0x262626}));
			menu.textMeshes = textMeshes
			menus.push(menu)
			menu.matrixAutoUpdate = false;
			menu.parentController = null;
			collisionPanel.add(menu)

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
					if( textMeshes[i-1].object3d !== undefined)
					{
						textMeshes[i].position.y -= menuGapSizeInLineHeights
					}
				}

				if( textMeshes[i].object3d )
				{
					menu.add(textMeshes[i].object3d)

					textMeshes[i].object3dOrdinaryPosition = textMeshes[i].position.clone()
					textMeshes[i].object3dOrdinaryPosition.y -= menuGapSizeInLineHeights * 0.5
					textMeshes[i].object3dOrdinaryPosition.x = widestSignWidth / 2

					let bBox = getObject3dBoundingBox(textMeshes[i].object3d)
					if( bBox.min.length() < 0.01)
					{
						let offset = bBox.getSize(new THREE.Vector3()).multiplyScalar(0.5)
						offset.multiply(textMeshes[i].object3d.scale)
						if(textMeshes[i].object3d.geometry == undefined ) //hacky
						{
							offset.multiply(textMeshes[i].object3d.children[0].scale)
						}
						offset.z = 0
						textMeshes[i].object3dOrdinaryPosition.sub(offset)
						textMeshes[i].object3dOrdinaryPosition.z = 0.001
					}

					textMeshes[i].object3d.position.copy(textMeshes[i].object3dOrdinaryPosition)

					textMeshes[i].object3dFrame = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry(1,1), new THREE.MeshBasicMaterial({color:0x3F3D3F}))
					textMeshes[i].object3dFrame.scale.set(widestSignWidth,menuGapSizeInLineHeights,1)
					textMeshes[i].object3dFrame.position.copy(textMeshes[i].position)
					textMeshes[i].object3dFrame.position.y -= menuGapSizeInLineHeights
					menu.add(textMeshes[i].object3dFrame)
				}

				if( textMeshes[i].switchObject )
				{
					textMeshes[i].material.color.copy( textMeshes[i].switchObject[textMeshes[i].switchProperty] ? onColor : offColor)
				}
			}

			let horizontalFiller = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry(widestSignWidth,textMeshes[0].position.y), new THREE.MeshBasicMaterial({color:0x3F3F3F}));
			horizontalFiller.position.set( outlineThickness,outlineThickness,textMeshes[0].position.z / 2 )
			menu.add( horizontalFiller )
		}

		if(polar === undefined && azimuthal === undefined)
		{
			menu.azimuthal = TAU;
			let horizontalSpacing = 0.5;
			menu.polar = menus.length === 1 ? -aroundness / 2 : menus[menus.length-2].polar + horizontalSpacing
			while(menu.polar > aroundness / 2 )
			{
				menu.polar -= aroundness
				menu.azimuthal -= lineAngularHeight * 4
			}
		}
		else
		{
			menu.azimuthal = azimuthal
			menu.polar = polar
		}

		let planeAngularHeight = menu.geometry.vertices[1].y * lineAngularHeight;

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

				for(var j = 0; j < handControllers.length; j++)
				{
					if( textMeshes[i].buttonFunction || textMeshes[i].switchObject )
					{
						if( handControllers[j].intersectLaserWithObject( textMeshes[i] ).length !== 0 )
						{
							textMeshes[i].material.color.copy( highlightedColor )
							if( handControllers[j].grippingTop && !handControllers[j].grippingTopOld )
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

					if( textMeshes[i].object3d )
					{
						let justPickedUp = false

						if( handControllers[j].intersectLaserWithObject( textMeshes[i] ).length !== 0 ||
							handControllers[j].intersectLaserWithObject( textMeshes[i].object3dFrame ).length !== 0 )
						{
							if( handControllers[j].grippingTop && !handControllers[j].grippingTopOld )
							{
								textMeshes[i].material.color.copy( highlightedColor )

								menu.remove(textMeshes[i].object3d)
								handControllers[j].add(textMeshes[i].object3d) 

								if(textMeshes[i].object3d.onPickUp !== undefined)
								{
									textMeshes[i].object3d.onPickUp()
								}

								textMeshes[i].object3d.position.set(0,0,0)
								textMeshes[i].object3d.scale.setScalar(1)

								justPickedUp = true
							}
						}

						if( !justPickedUp && handControllers[j].grippingTop && !handControllers[j].grippingTopOld && 
							textMeshes[i].object3d.parent === handControllers[j] )
						{
							handControllers[j].remove(textMeshes[i].object3d)
							menu.add(textMeshes[i].object3d)

							if(textMeshes[i].object3d.onLetGo !== undefined)
							{
								textMeshes[i].object3d.onLetGo()
							}

							textMeshes[i].object3d.position.copy(textMeshes[i].object3dOrdinaryPosition)
							uniformlyScaleObject3dToMenuGapSize(textMeshes[i].object3d)
						}
					}
				}
			}

			if(!menu.parentController )
			{
				for(var i = 0; i < handControllers.length; i++)
				{
					if( handControllers[i].button2 && !handControllers[i].button2Old ) //or alternatively, get grabbed if handControllers not grabbing anything. i.e. this goes in panelUpdate. Look in todo!
					{
						if( handControllers[i].intersectLaserWithObject( this ).length !== 0 )
						{
							menu.parentController = handControllers[i]
						}
					}
				}
			}

			if(menu.parentController)
			{
				menu.polar = menu.parentController.cursor.polar;
				menu.azimuthal = menu.parentController.cursor.azimuthal;

				{
					let polarAndAzimuthals = Array(menus.length * 2)
					for(let i = 0; i < menus.length; i++)
					{
						polarAndAzimuthals[i*2+0] = menus[i].polar
						polarAndAzimuthals[i*2+1] = menus[i].azimuthal
					}

					let msg = {}
					msg.command = "savePolarAndAzimuthals"
					msg.polarAndAzimuthals = polarAndAzimuthals
					socket.send(JSON.stringify(msg))
				}

				updateMatrix()

				if( !menu.parentController.button2)
				{
					menu.parentController = null;
				}
			}
		}

		function updateMatrix()
		{
			menu.azimuthal = azimuthalClipToAllowedArea( menu.azimuthal );
			menu.azimuthal = azimuthalClipToAllowedArea( menu.azimuthal + planeAngularHeight ) - planeAngularHeight;
			let planeAngularWidth  = menu.geometry.vertices[1].x * lineAngularHeight;
			menu.polar = polarClipToAllowedArea( menu.polar );
			menu.polar = polarClipToAllowedArea( menu.polar + planeAngularWidth ) - planeAngularWidth;

			let bl = anglesToPanel(menu.polar, menu.azimuthal).multiplyScalar(0.996)
			let tl = anglesToPanel(menu.polar, menu.azimuthal + planeAngularHeight).multiplyScalar(0.996)
			let br = anglesToPanel(menu.polar + planeAngularWidth, menu.azimuthal).multiplyScalar(0.996)
			
			let bottom = br.clone().sub(bl)
			let side = tl.clone().sub(bl)
			let basisZ = new THREE.Vector3().crossVectors(bottom,side)
			let basisX = bottom.clone().multiplyScalar(1 / menu.geometry.vertices[1].x)
			let basisY = side.clone().multiplyScalar(1 / menu.geometry.vertices[1].y)
			if( basisX.length() < basisY.length() )
			{
				basisY.setLength(basisX.length())
				basisZ.setLength(basisX.length())
			}
			else
			{
				basisX.setLength(basisY.length())
				basisZ.setLength(basisY.length())
			}
			menu.matrix.makeBasis(basisX,basisY,basisZ)
			menu.matrix.setPosition(bl);
		}
		updateMatrix()
		menu.setPolarAndAzimuthal = function(newPolar,newAzimuthal)
		{
			this.polar = newPolar
			this.azimuthal = newAzimuthal
			updateMatrix()
		}

		return menu
	}

	addSingleFunctionToPanel = function(f,polar, azimuthal)
	{
		let processedFunctionName = f.name;
		for(var i = 0; i < processedFunctionName.length; i++)
		{
			if( processedFunctionName[i] === processedFunctionName[i].toUpperCase() )
			{
				processedFunctionName = processedFunctionName.slice(0,i) + " " + processedFunctionName.slice(i,processedFunctionName.length)
				i++;
			}
		}
		processedFunctionName = processedFunctionName[0].toUpperCase() + processedFunctionName.slice(1,processedFunctionName.length)

		MenuOnPanel([{string:processedFunctionName, buttonFunction:f}],polar, azimuthal)
	}

	Tool = function(colorOrMesh)
	{
		let tool = new THREE.Object3D();
		
		let mesh = null
		if( typeof colorOrMesh !== "number" )
		{
			mesh = colorOrMesh
		}
		else
		{
			mesh = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(0.05), new THREE.MeshLambertMaterial({ transparent:true, color:colorOrMesh, opacity: 0.7}));
		}
		tool.add( mesh );
		mesh.geometry.computeBoundingSphere();
		tool.boundingSphere = mesh.geometry.boundingSphere;

		objectsToBeUpdated.push(tool);
		tool.update = function()
		{
			if(handControllers.indexOf(tool.parent) !== -1)
			{
				var positionInAssemblage = tool.getWorldPosition(new THREE.Vector3());
				assemblage.updateMatrixWorld();
				assemblage.worldToLocal(positionInAssemblage);

				tool.whileHeld(positionInAssemblage)
			}
		}

		let fakeError = new Error()
		if(fakeError.stack)
		{
			var chromeStyleSplit = (fakeError.stack.split("at init"))
			if(chromeStyleSplit.length > 1)
			{
				var name = chromeStyleSplit[1].split("(file")[0]
			}
			else
			{
				var name = (fakeError.stack.split("\ninit"))[1].split("@")[0]
			}
		}

		MenuOnPanel([{string:name, object3d: tool }])

		return tool
	}

	// let testObject3d = new THREE.Mesh(new THREE.SphereGeometry(0.07))
	// testObject3d.onClick = function()
	// {
	// 	console.log("clicked")
	// }
	// testObject3d.geometry.computeBoundingBox()
	// MenuOnPanel([
	// 	{string:"Example menu"},
	// 	{string:"    Switch", 	switchObject:	assemblage, switchProperty:"visible"},
	// 	{string:"    Object3d",	object3d: testObject3d },//object3d could be a graph or rama
	// 	{string:"    Button", 	buttonFunction:	function(){handControllers[0].controllerModel.material.color.setRGB(Math.random(),Math.random(),Math.random());console.log("example menu item clicked")}},
	// ],6.34,6.24)

	socket.commandReactions.polarAndAzimuthals = function(msg)
	{
		let polarAndAzimuthals = eval(msg.polarAndAzimuthals)
		for(let i = 0; i < polarAndAzimuthals.length/2 && i < menus.length; i++)
		{
			menus[i].setPolarAndAzimuthal(
				polarAndAzimuthals[i*2+0],
				polarAndAzimuthals[i*2+1]
				)
		}

		return true
	}

	if( 0 )
	{
		let fakeStrings = [
			"Refinement options",
			"	Use Torsion restraints ",		//(default off)
			"	Use planar peptide restraints",	//(default on)
			"	Use trans peptide restraints",	//(default on)
			"	Ramachandran restraints",		//(default off)
			"	Alpha helix restraints",		//(default off)
			"	beta strand restraints",		//(default off)
			"	Refinement weight",				//?
			"Other modelling tools",
			"	cis <-> trans", //possibly unnecessary because VR
			"	base pair",
			"	skeletonize map",
			"	sharpen map",
			"Find",
			"	Waters",
			"	Secondary structure",
			"	Ligands",
			"Group work features",
			"	Round table",// for if there are multiple people - makes it so all your heads are at reasonable angle",
			"	Synchronize view",
			"Superpose",
			"	LSQ", 
			"	SSSM",
			"Sequence view",
			"	Reverse direction",
			"	alignment vs pir",
			"	Ask paul what people tend to use it for",
			"	Want scrollable list of all atoms and residues",
			"Merge molecules",
			"export map",
			"pukkers",
			"Control bindings",
			"Refmac",
			"Undo/redo?", //And others that might be on the controller if you had a rift
			"Graphics quality",
			"Play tutorial video",
			"Hydrogen visible",
			"check synchronization of coot and CVR molecule", //for us

			//Haven't been through "Ligand" or "Extensions". Various things in "validate"
			//list of the buttons on your controller, you drag things in to make them do stuff
		];

		let bunch = [];
		for(let i = 0; i < fakeStrings.length; i++)
		{
			bunch.push({string:fakeStrings[i]})

			if( i === fakeStrings.length-1 || fakeStrings[i+1][0] !== "	")
			{
				MenuOnPanel(bunch)
				bunch.length = 0;
			}
		}
	}
}