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

function loop( visiBox )
{
	frameDelta = ourClock.getDelta();
	frameCount++;

	readHandInput();
	updatePanel();
	
	for(var i = 0; i < handControllers.length; i++)
	{
		if( handControllers[i].grippingTop )
		{
			if( handControllers[i].children.length === 2)
			{
				var distanceOfClosestObject = Infinity;
				selectedHoldable = null;
				for(var j = 0; j < holdables.length; j++ )
				{
					if( handControllers[i].overlappingHoldable(holdables[j]) )
					{
						selectedHoldable = holdables[j];
						break;
					}
				}
				if(selectedHoldable)
				{
					establishAttachment(selectedHoldable, handControllers[i]);
				}
			}
		}
		else
		{
			for(var j = 0; j < holdables.length; j++ )
			{
				if( holdables[j].parent === handControllers[i])
				{
					establishAttachment( holdables[j], holdables[j].ordinaryParent );
				}
			}
		}
	}
	
	var bothAttachedController = RIGHT_CONTROLLER_INDEX;

	if( handControllers[0].grippingSide && handControllers[1].grippingSide )
	{
		var handSeparationDifferential = 
			handControllers[0].position.distanceTo( handControllers[1].position ) / 
			handControllers[0].oldPosition.distanceTo( handControllers[1].oldPosition );
		
		// visiBox.position.multiplyScalar( 1 / visiBox.scale.x ); 
		// visiBox.scale.multiplyScalar( handSeparationDifferential );
		// visiBox.position.multiplyScalar(visiBox.scale.x);
		
		assemblage.position.multiplyScalar( 1 / assemblage.scale.x ); 
		assemblage.scale.multiplyScalar( handSeparationDifferential );
		assemblage.position.multiplyScalar(assemblage.scale.x);

		// establishAttachment(visiBox, handControllers[bothAttachedController]);
		establishAttachment(assemblage, handControllers[bothAttachedController]);
		// establishAttachment(visiBox, scene);
		// establishAttachment(assemblage, scene);
	}
	else if( handControllers[bothAttachedController].grippingSide && !handControllers[1-bothAttachedController].grippingSide )
	{
		// establishAttachment(visiBox, handControllers[bothAttachedController]);
		establishAttachment(assemblage, handControllers[bothAttachedController]);
	}
	else if( handControllers[1-bothAttachedController].grippingSide && !handControllers[bothAttachedController].grippingSide )
	{
		establishAttachment(assemblage, handControllers[1-bothAttachedController]);
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