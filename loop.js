//we assume natural parent is scene
function ensureAttachment(child, parent)
{
	if(child.parent !== parent)
	{
		THREE.SceneUtils.attach( child, scene, parent );
	}
}

function ensureDetachment(child, parent)
{
	if(child.parent === parent)
	{
		THREE.SceneUtils.detach( child, parent, scene );
	}
}

function loop( socket, controllers, vrInputSystem, visiBox, thingsToBeUpdated, holdables )
{
	frameDelta = ourClock.getDelta();
	
	vrInputSystem.update( socket );
	
	for(var i = 0; i < controllers.length; i++)
	{
		if(Math.abs( controllers[i].thumbStickAxes[1] ) > 0.001)
		{
			// modelAndMap.scale.setScalar( modelAndMap.scale.x * (1+controllers[i].thumbStickAxes[1] / 100) );
			// var minScale = 0.0000001;
			// if( modelAndMap.scale.x < minScale )
			// 	modelAndMap.scale.setScalar( minScale )

			modelAndMap.map.contour(modelAndMap.map.isolevel + 0.1 * controllers[i].thumbStickAxes[1] );
		}

		controllers[i].controllerModel.pointer.visible = (controllers[i].children.length === 1 && controllers[i].button1)
		
		if( controllers[i].grippingTop )
		{
			if( controllers[i].children.length === 1)
			{
				var distanceOfClosestObject = Infinity;
				selectedHoldable = null;
				for(var holdable in holdables )
				{
					if( controllers[i].overlappingHoldable(holdables[holdable]) )
					{
						selectedHoldable = holdables[holdable];
						break;
					}
				}
				if(selectedHoldable)
				{
					THREE.SceneUtils.detach( selectedHoldable, selectedHoldable.parent, scene );
					THREE.SceneUtils.attach( selectedHoldable, scene, controllers[i] );
				}
				// else
				// {
				// 	for(var i = 0, il = modelAndMap.model.atoms.length; i < il; i++)
				// 	{

				// 	}
				// }
			}
		}
		else
		{
			for(var holdable in holdables )
			{
				if( holdables[holdable].parent === controllers[i])
				{
					THREE.SceneUtils.detach( holdables[holdable], controllers[i], scene );
					THREE.SceneUtils.attach( holdables[holdable], scene, holdables[ holdable ].ordinaryParent );
				}
			}
		}
	}
	
	var bothAttachedController = RIGHT_CONTROLLER_INDEX;

	if( controllers[RIGHT_CONTROLLER_INDEX].grippingSide && controllers[LEFT_CONTROLLER_INDEX].grippingSide )
	{
		ensureDetachment(visiBox, controllers[1-bothAttachedController]);
		
		ensureAttachment(visiBox, controllers[bothAttachedController]);
		ensureAttachment(modelAndMap, controllers[bothAttachedController]);
		
		var handSeparationDifferential = controllers[0].position.distanceTo( controllers[1].position ) / 
			controllers[0].oldPosition.distanceTo( controllers[1].oldPosition );
		
		visiBox.position.multiplyScalar( 1 / visiBox.scale.x ); 
		visiBox.scale.multiplyScalar( handSeparationDifferential );
		visiBox.position.multiplyScalar(visiBox.scale.x);
		
		modelAndMap.position.multiplyScalar( 1 / modelAndMap.scale.x ); 
		modelAndMap.scale.multiplyScalar( handSeparationDifferential );
		modelAndMap.position.multiplyScalar(modelAndMap.scale.x);

		//also that scaling line is visible and not otherwise
	}
	else
	{
		if( controllers[bothAttachedController].grippingSide )
		{
			ensureAttachment(visiBox, controllers[bothAttachedController]);
			ensureAttachment(modelAndMap, controllers[bothAttachedController]);
		}
		else
		{
			ensureDetachment(visiBox, controllers[bothAttachedController]);
			ensureDetachment(modelAndMap, controllers[bothAttachedController]);
		}
		
		if( controllers[1-bothAttachedController].grippingSide )
		{
			ensureAttachment(visiBox, controllers[1-bothAttachedController]);
		}
		else
		{
			ensureDetachment(visiBox, controllers[1-bothAttachedController]);
		}
	}
	
	for( var thing in thingsToBeUpdated)
	{
		if( thingsToBeUpdated[thing].length !== undefined)
		{
			for(var i = 0, il = thingsToBeUpdated[thing].length; i < il; i++)
				thingsToBeUpdated[thing][i].update();
		}
		else
			thingsToBeUpdated[thing].update();
	}
	
	if( modelAndMap.map )
	{
		modelAndMap.map.material.linewidth = 0.2 / modelAndMap.position.distanceTo(camera.position);
		modelAndMap.map.material.needsUpdate = true;
	}
}