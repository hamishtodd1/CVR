//wrappers assuming natural parent is scene
function ensureAttachment(child, intendedParent)
{
	if(child.parent !== intendedParent)
	{
		if(child.parent !== scene)
		{
			THREE.SceneUtils.detach( child, child.parent, scene );
		}

		THREE.SceneUtils.attach( child, scene, intendedParent );
	}
}

//either you're attached to a controller or to your ordinary parent, it's binary
//so no ensureDetachment, just ensureAttachment(child, child.ordinaryParent)

function loop( socket, maps, models, controllers, vrInputSystem, visiBox, thingsToBeUpdated, holdables )
{
	frameDelta = ourClock.getDelta();
	
	vrInputSystem.update( socket );
	
	for(var i = 0; i < controllers.length; i++)
	{
		if(Math.abs( controllers[i].thumbStickAxes[1] ) > 0.001 )
		{
			for(var j = 0; j < maps.length; j++)
			{
				maps[j].addToIsolevel( 0.1 * controllers[i].thumbStickAxes[1] )
			}
		}
		
		if( controllers[i].grippingTop )
		{
			if( controllers[i].children.length === 1)
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
					ensureAttachment(selectedHoldable, controllers[i]);
				}
			}
		}
		else
		{
			for(var j = 0; j < holdables.length; j++ )
			{
				if( holdables[j].parent === controllers[i])
				{
					ensureAttachment( holdables[j], holdables[j].ordinaryParent );
				}
			}
		}
	}
	
	var bothAttachedController = RIGHT_CONTROLLER_INDEX;

	if( controllers[0].grippingSide && controllers[1].grippingSide )
	{
		ensureAttachment(visiBox, controllers[bothAttachedController]);
		ensureAttachment(assemblage, controllers[bothAttachedController]);
		
		var handSeparationDifferential = controllers[0].position.distanceTo( controllers[1].position ) / 
			controllers[0].oldPosition.distanceTo( controllers[1].oldPosition );
		
		visiBox.position.multiplyScalar( 1 / visiBox.scale.x ); 
		visiBox.scale.multiplyScalar( handSeparationDifferential );
		visiBox.position.multiplyScalar(visiBox.scale.x);
		
		assemblage.position.multiplyScalar( 1 / assemblage.scale.x ); 
		assemblage.scale.multiplyScalar( handSeparationDifferential );
		assemblage.position.multiplyScalar(assemblage.scale.x);
	}
	else if( controllers[bothAttachedController].grippingSide && !controllers[1-bothAttachedController].grippingSide )
	{
		ensureAttachment(visiBox, controllers[bothAttachedController]);
		ensureAttachment(assemblage, controllers[bothAttachedController]);
	}
	else if( controllers[1-bothAttachedController].grippingSide && !controllers[bothAttachedController].grippingSide )
	{
		ensureAttachment(visiBox, controllers[1-bothAttachedController]);
		ensureAttachment(assemblage, scene);
	}
	else
	{
		ensureAttachment(visiBox, scene);
		ensureAttachment(assemblage, scene);
	}
	
	for( var i = 0; i < thingsToBeUpdated.length; i++)
	{
		if( thingsToBeUpdated[i].length !== undefined )
		{
			for(var j = 0, jl = thingsToBeUpdated[i].length; j < jl; j++)
			{
				thingsToBeUpdated[i][j].update();
			}
		}
		else
		{
			thingsToBeUpdated[i].update();
		}
	}
	for( var thing in thingsToBeUpdated)
	{
		if(typeof thing == "number")
		console.log("get rid of thingsToBeUpdated.", thing)
	}
	
	for(var i = 0; i < maps.length; i++)
	{
		for(var j = 0; j < maps[i].children.length; j++)
		{
			maps[i].children[j].material.linewidth = 0.2 / assemblage.position.distanceTo(camera.position);
			maps[i].children[j].material.needsUpdate = true;
		}
	}

	socket.checkOnExpectedCommands();
}