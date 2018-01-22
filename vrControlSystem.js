function initVrInputSystem(controllers, launcher,renderer,ourVrEffect)
{
	var vrInputSystem = {};

	var cameraRepositioner = new THREE.VRControls( camera );
	var cameraAddendum = new THREE.Vector3(); //doesn't work, very weird
	
	vrInputSystem.startGettingInput = function()
	{
		if(cameraRepositioner.vrInputs.length < 1)
		{
			console.error("no vr input? Check steamVR or Oculus to make sure it's working correctly")
		}
			
		cameraRepositioner.vrInputs[0].requestPresent([{ source: renderer.domElement }]);
		
		scene.add( controllers[ 0 ] );
		scene.add( controllers[ 1 ] );
	}

	document.addEventListener( 'keydown', function(event)
	{
		if(event.keyCode === 190 && ( navigator.getVRDisplays !== undefined || navigator.getVRDevices !== undefined ) )
		{
			event.preventDefault();
			vrInputSystem.startGettingInput();
			ourVrEffect.setFullScreen( true );
		}
	}, false );
	
	var riftControllerKeys = {
			thumbstickButton:0,
			grippingTop: 1,
			grippingSide:2,
			button1: 3,
			button2: 4
	}
	
	function overlappingHoldable(holdable)
	{
		var ourPosition = this.controllerModel.geometry.boundingSphere.center.clone();
		this.localToWorld( ourPosition );
		
		var holdablePosition = holdable.boundingSphere.center.clone();
		holdable.localToWorld( holdablePosition );
		
		var ourScale = this.matrixWorld.getMaxScaleOnAxis();
		var holdableScale = holdable.matrixWorld.getMaxScaleOnAxis();
		
		if( ourPosition.distanceTo(holdablePosition) < holdable.boundingSphere.radius * holdableScale + this.controllerModel.geometry.boundingSphere.radius * ourScale )
		{
			return true;
		}
		else
		{
			return false;
		}
	}
		
	function loadControllerModel(i)
	{
		new THREE.OBJLoader().load( "data/external_controller01_" + (i===LEFT_CONTROLLER_INDEX?"left":"right") + ".obj",
			function ( object ) 
			{
				controllers[  i ].controllerModel.geometry = object.children[0].geometry;
				controllers[  i ].controllerModel.geometry.applyMatrix( new THREE.Matrix4().makeRotationAxis(xAxis,TAU/8) );
				controllers[  i ].controllerModel.geometry.applyMatrix( new THREE.Matrix4().makeTranslation(
					0.008 * ( i == LEFT_CONTROLLER_INDEX?-1:1),
					0.041,
					-0.03) );
				controllers[  i ].controllerModel.geometry.computeBoundingSphere();
				
				launcher["controllerModel"+i.toString()+"Loaded"] = true;
				launcher.attemptLaunch();
			},
			function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } );
	}
	
	var controllerMaterial = new THREE.MeshLambertMaterial({color:0x444444});
	for(var i = 0; i < 2; i++)
	{
		controllers[ i ] = new THREE.Object3D();
		for( var propt in riftControllerKeys )
		{
			controllers[ i ][propt] = false;
			controllers[ i ][propt+"Old"] = false;
		}
		controllers[ i ].thumbStickAxes = [0,0];

		controllers[ i ].controllerModel = new THREE.Mesh( new THREE.Geometry(), controllerMaterial.clone() );
		controllers[ i ].add( controllers[ i ].controllerModel );

		controllers[ i ].oldPosition = controllers[ i ].position.clone();
		controllers[ i ].oldQuaternion = controllers[ i ].quaternion.clone();
		
		controllers[ i ].overlappingHoldable = overlappingHoldable;
		
		loadControllerModel(i);
	}

	vrInputSystem.update = function(socket)
	{
		cameraRepositioner.update(); //positions the head
		// camera.position.add(cameraAddendum);
		
		var gamepads = navigator.getGamepads();
		for(var k = 0; k < 2 && k < gamepads.length; ++k)
		{
			var affectedControllerIndex = -1;
			if (gamepads[k] && gamepads[k].id === "Oculus Touch (Right)")
			{
				affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
			}
			if (gamepads[k] && gamepads[k].id === "Oculus Touch (Left)")
			{
				affectedControllerIndex = LEFT_CONTROLLER_INDEX;
			}
			// if (gamepads[k] && gamepads[k].id === "OpenVR Gamepad" )
			// {
			// 	if(gamepads[k].index )
			// 	{
			// 		affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
			// 	}
			// 	else
			// 	{
			// 		affectedControllerIndex = LEFT_CONTROLLER_INDEX;
			// 	}
			// }
			if( affectedControllerIndex === -1 )
				continue;
			
			controllers[affectedControllerIndex].thumbStickAxes[0] = gamepads[k].axes[0];
			controllers[affectedControllerIndex].thumbStickAxes[1] = gamepads[k].axes[1];
			
			controllers[affectedControllerIndex].oldPosition.copy(controllers[ affectedControllerIndex ].position);
			controllers[affectedControllerIndex].oldQuaternion.copy(controllers[ affectedControllerIndex ].quaternion);
			
			controllers[affectedControllerIndex].position.fromArray( gamepads[k].pose.position );
			controllers[affectedControllerIndex].quaternion.fromArray( gamepads[k].pose.orientation );
			controllers[affectedControllerIndex].updateMatrixWorld();

			for( var propt in riftControllerKeys )
			{
				controllers[ affectedControllerIndex ][propt+"Old"] = controllers[ affectedControllerIndex ][propt];
				controllers[ affectedControllerIndex ][propt] = gamepads[k].buttons[riftControllerKeys[propt]].pressed;
			}

			if( gamepads[k].buttons[riftControllerKeys.thumbstickButton].pressed )
			{
				cameraAddendum.add(camera.position.clone().negate())
			}
			
//			if( affectedControllerIndex === RIGHT_CONTROLLER_INDEX )
//			{
//				eyeSeparation = gamepads[k].buttons[riftControllerKeys.grippingTop].value;
//			}
		}

		// controllers[0].position.add(cameraAddendum);
		// controllers[1].position.add(cameraAddendum);
	}
	
	return vrInputSystem;
}