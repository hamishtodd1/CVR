function desktopLoop(socket, controllers, VRInputSystem, models, maps) {
	checkForNewGlobals();
	
	delta_t = ourclock.getDelta();
	
	VRInputSystem.update( socket);
	
	for( var j = 0; j < models.length; j++)
	{
		if( models[j].pointInBoundingSphere( controllers[0].position ) ||
			models[j].pointInBoundingSphere( controllers[1].position ) )
			models[j].material.emissive.r = 0.5;
		else
			models[j].material.emissive.r = 0;
	}
	
	for(var i = 0; i < controllers.length; i++)
	{
		if( controllers[i].gripping )
		{
			if( controllers[i].children.length < 2 )
			{
				for( var j = 0; j < models.length + maps.length; j++)
				{
					var holdable = j < models.length ? models[j] : maps[j-models.length];
					if( holdable.pointInBoundingSphere( controllers[i].position ) && holdable.parent === scene )
					{
						THREE.SceneUtils.attach( holdable, scene, controllers[i] );
						break;
					}	
				}
			}
		}
		else
		{
			for(var j = 1; j < controllers[i].children.length; j++)
			{
				THREE.SceneUtils.detach(controllers[i].children[j], controllers[i], scene );
			}
		}
	}
	
	for(var i = 0; i < models.length; i++)
	{
		if( models[i].parent !== scene )
			continue;
		
		for( var j = 0; j < maps.length; j++)
		{
			if( models[i].position.distanceTo(maps[j].position) < 0.1 && models[i].quaternion.distanceTo(maps[j].quaternion) < TAU / 16 )
			{
				models[i].position.copy( maps[j].position );
				models[i].quaternion.copy( maps[j].quaternion );
			}
		}
	}
	
	socket.send("loopDone");
	
	ourVREffect.requestAnimationFrame( function(){
		ourVREffect.render( scene, camera );
		desktopLoop(socket, controllers, VRInputSystem, models, maps);
	} );
}

function checkForNewGlobals()
{
	if( typeof numGlobalVariables === 'undefined')
	{
		numGlobalVariables = Object.keys(window).length + 1;
	}
	else if( numGlobalVariables > Object.keys(window).length)
	{
		console.log("new global variable(s): ")
		for(var i = numGlobalVariables; i < Object.keys(window).length; i++ )
		{
			if( Object.keys(window)[i] !== location && //these ones are ok
				Object.keys(window)[i] !== name &&
				Object.keys(window)[i] !== window &&
				Object.keys(window)[i] !== self &&
				Object.keys(window)[i] !== document )
				console.log( Object.keys(window)[i] );
		}
		numGlobalVariables = Object.keys(window).length + 1;
	}	
}