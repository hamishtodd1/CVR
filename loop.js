//wrappers assuming natural parent is scene
function establishAttachment(child, intendedParent)
{
	if(child.parent !== intendedParent)
	{
		if(child.parent !== scene)
		{
			THREE.SceneUtils.detach( child, child.parent, scene );
		}

		THREE.SceneUtils.attach( child, scene, intendedParent );

		if(intendedParent === child.ordinaryParent && child.onLetGo)
		{
			child.onLetGo();
		}
		if(intendedParent !== child.ordinaryParent && child.onGrab)
		{
			child.onGrab();
		}
	}
}

function loop( maps, models, controllers, visiBox )
{
	frameDelta = ourClock.getDelta();
	frameCount++;
	
	updateVrInput();
	updatePanel();
	
	for(var i = 0; i < controllers.length; i++)
	{
		if( controllers[i].grippingTop )
		{
			if( controllers[i].children.length === 2)
			{
				var distanceOfClosestObject = Infinity;
				selectedHoldable = null;
				for(var j = 0; j < holdables.length; j++ )
				{
					if( controllers[i].overlappingHoldable(holdables[j]) )
					{
						selectedHoldable = holdables[j];
						break;
					}
				}
				if(selectedHoldable)
				{
					establishAttachment(selectedHoldable, controllers[i]);
				}
			}
		}
		else
		{
			for(var j = 0; j < holdables.length; j++ )
			{
				if( holdables[j].parent === controllers[i])
				{
					establishAttachment( holdables[j], holdables[j].ordinaryParent );
				}
			}
		}
	}
	
	var bothAttachedController = RIGHT_CONTROLLER_INDEX;

	if( controllers[0].grippingSide && controllers[1].grippingSide )
	{
		var handSeparationDifferential = controllers[0].position.distanceTo( 
			controllers[1].position ) / 
			controllers[0].oldPosition.distanceTo( controllers[1].oldPosition );
		
		// visiBox.position.multiplyScalar( 1 / visiBox.scale.x ); 
		// visiBox.scale.multiplyScalar( handSeparationDifferential );
		// visiBox.position.multiplyScalar(visiBox.scale.x);
		
		assemblage.position.multiplyScalar( 1 / assemblage.scale.x ); 
		assemblage.scale.multiplyScalar( handSeparationDifferential );
		assemblage.position.multiplyScalar(assemblage.scale.x);

		// establishAttachment(visiBox, controllers[bothAttachedController]);
		establishAttachment(assemblage, controllers[bothAttachedController]);
		// establishAttachment(visiBox, scene);
		// establishAttachment(assemblage, scene);
	}
	else if( controllers[bothAttachedController].grippingSide && !controllers[1-bothAttachedController].grippingSide )
	{
		// establishAttachment(visiBox, controllers[bothAttachedController]);
		establishAttachment(assemblage, controllers[bothAttachedController]);
	}
	else if( controllers[1-bothAttachedController].grippingSide && !controllers[bothAttachedController].grippingSide )
	{
		establishAttachment(assemblage, controllers[1-bothAttachedController]);
		// establishAttachment(visiBox, scene);
	}
	else
	{
		// establishAttachment(visiBox, scene);
		establishAttachment(assemblage, scene);
	}

	for( var i = 0; i < objectsToBeUpdated.length; i++)
	{
		objectsToBeUpdated[i].update();
	}
	
	// for(var i = 0; i < maps.length; i++)
	// {
	// 	for(var j = 0; j < maps[i].children.length; j++)
	// 	{
	// 		maps[i].children[j].material.linewidth = 0.2 / assemblage.position.distanceTo(camera.position);
	// 		maps[i].children[j].material.needsUpdate = true;
	// 	}
	// }

	socket.update();
}