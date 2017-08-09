function desktopLoop(socket, controllers, models, maps) {
	checkForNewGlobals();
	
	delta_t = ourclock.getDelta();
	
	getControllerInput(controllers);
	
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
	
	updateModelsAndMaps( models, maps );
	
	socket.send("loopDone");
	ourVREffect.requestAnimationFrame( function(){
		ourVREffect.render( scene, camera );
		desktopLoop(socket, controllers, models, maps);
	} );
}

function checkForNewGlobals()
{
	if( numGlobalVariables !== Object.keys(window).length )
	{
		if( numGlobalVariables ) //not the first setting
		{
			console.log("new global variables: ")
			for(var i = numGlobalVariables; i < Object.keys(window).length; i++ )
			{
				if( Object.keys(window)[i] !== location &&
					Object.keys(window)[i] !== name &&
					Object.keys(window)[i] !== window &&
					Object.keys(window)[i] !== self &&
					Object.keys(window)[i] !== document )
					console.log( Object.keys(window)[i] ); //location, name,window, self, document are fine
			}
		}
		numGlobalVariables = Object.keys(window).length;
	}	
}

function getControllerInput(controllers)
{
	ourVRControls.update();
	camera.position.z -= FOCALPOINT_DISTANCE;

	var gamepads = navigator.getGamepads();
    var riftTriggerButton = 1;
    var riftGripButton = 2;
    //pushing the thumbstick in is 0, the two buttons are 3 and 4
	for(var k = 0; k < 2 && k < gamepads.length; ++k)
	{
		var affectedControllerIndex = 666;
		if (gamepads[k] && gamepads[k].id === "Oculus Touch (Right)")
			affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
		if (gamepads[k] && gamepads[k].id === "Oculus Touch (Left)")
			affectedControllerIndex = LEFT_CONTROLLER_INDEX;
		if( affectedControllerIndex === 666 )
			continue;
		
		controllers[affectedControllerIndex].position.x = gamepads[k].pose.position[0];
		controllers[affectedControllerIndex].position.y = gamepads[k].pose.position[1];
		controllers[affectedControllerIndex].position.z = gamepads[k].pose.position[2] - FOCALPOINT_DISTANCE;
		controllers[affectedControllerIndex].quaternion.x = gamepads[k].pose.orientation[0];
		controllers[affectedControllerIndex].quaternion.y = gamepads[k].pose.orientation[1];
		controllers[affectedControllerIndex].quaternion.z = gamepads[k].pose.orientation[2];
		controllers[affectedControllerIndex].quaternion.w = gamepads[k].pose.orientation[3];
		controllers[affectedControllerIndex].updateMatrixWorld();
		
		if( gamepads[k].buttons[riftGripButton].pressed)
			controllers[affectedControllerIndex].gripping = 1;
		else
			controllers[affectedControllerIndex].gripping = 0;
		
//		if(affectedControllerIndex === RIGHT_CONTROLLER_INDEX)
//			ourVREffect.eyeSeparationMultiplier = gamepads[k].buttons[riftTriggerButton].value;
		
		controllers[affectedControllerIndex].children[0].material.emissive.r = controllers[affectedControllerIndex].gripping;
	}
}

function getPoseMatrix (out, pose, isGamepad) {
	orientation = pose.orientation;
	position = pose.position;
	if (!orientation) { orientation = [0, 0, 0, 1]; }
	if (!position) {
		// If this is a gamepad without a pose set it out in front of us so
		// we can see it.
		position = isGamepad ? [0.1, -0.1, -0.5] : [0, 0, 0];
	}
	if (vrDisplay.stageParameters) {
		mat4.fromRotationTranslation(out, orientation, position);
		mat4.multiply(out, vrDisplay.stageParameters.sittingToStandingTransform, out);
	} else {
		vec3.add(standingPosition, position, [0, PLAYER_HEIGHT, 0]);
		mat4.fromRotationTranslation(out, orientation, standingPosition);
	}
}