//Left and right on stick = contour, up and down is for currently selected menu?

function initVrInputSystem(controllers, renderer,ourVrEffect)
{
	var cameraRepositioner = new THREE.VRControls( camera );

	document.addEventListener( 'keydown', function( event )
	{
		if(event.keyCode === 69 && ( navigator.getVRDisplays !== undefined || navigator.getVRDevices !== undefined ) )
		{
			event.preventDefault();
			if(cameraRepositioner.vrInputs.length < 1)
			{
				console.error("no vr input? Check steamVR or Oculus to make sure it's working correctly")
			}
				
			cameraRepositioner.vrInputs[0].requestPresent([{ source: renderer.domElement }])
			
			ourVrEffect.setFullScreen( true );
		}
	}, false ); 
	
	var vrInputSystem = {};

	var riftControllerKeys = {
		thumbstickButton:0,
		grippingTop: 1,
		grippingSide:2,
		button1: 3,
		button2: 4
	}
	var viveControllerKeys = {
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
				controllers[  i ].controllerModel.geometry.applyMatrix( new THREE.Matrix4().makeRotationAxis(xVector,TAU/8) );
				controllers[  i ].controllerModel.geometry.applyMatrix( new THREE.Matrix4().makeTranslation(
					0.008 * ( i == LEFT_CONTROLLER_INDEX?-1:1),
					0.041,
					-0.03) );
				controllers[  i ].controllerModel.geometry.computeBoundingSphere();
			},
			function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } );
	}
	
	var controllerMaterial = new THREE.MeshLambertMaterial({color:0x444444});
	var laserRadius = 0.001;
	for(var i = 0; i < 2; i++)
	{
		controllers[ i ] = new THREE.Object3D();
		scene.add( controllers[ i ] );

		{
			controllers[ i ].laser = new THREE.Mesh(
				new THREE.CylinderBufferGeometryUncentered( laserRadius, 2), 
				new THREE.MeshBasicMaterial({color:0xFF0000, /*transparent:true,opacity:0.4*/}) 
			);
			controllers[ i ].laser.rotation.x = -TAU/4
			controllers[ i ].laser.visible = false;
			controllers[ i ].add(controllers[ i ].laser);
			var raycaster = new THREE.Raycaster();
			controllers[ i ].intersectLaserWithObject = function(object3D)
			{
				this.laser.updateMatrixWorld();
				var origin = new THREE.Vector3(0,0,0);
				this.laser.localToWorld(origin)
				var direction = new THREE.Vector3(0,1,0);
				this.laser.localToWorld(direction)
				direction.sub(origin).normalize();

				raycaster.set(origin,direction);
				return raycaster.intersectObject(object3D);
			}
		}

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

	vrInputSystem.update = function()
	{
		if(cameraRepositioner)
		{
			cameraRepositioner.update();
		}

		var gamepads = navigator.getGamepads();
		
		//If controllers aren't getting input even from XX-vr-controllers,
		//Try restarting computer. Urgh. Just browser isn't enough. Maybe oculus app?
		for(var k = 0; k < gamepads.length; ++k)
		{
			if(!gamepads[k])
			{
				continue;
			}
			var affectedControllerIndex = -1;
			var keys = null;
			if (gamepads[k].id === "OpenVR Gamepad" )
			{
				if(gamepads[k].index )
				{
					affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
				}
				else
				{
					affectedControllerIndex = LEFT_CONTROLLER_INDEX;
				}
				keys = viveControllerKeys;
			}
			else if (gamepads[k].id === "Oculus Touch (Right)")
			{
				affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
				keys = riftControllerKeys;
			}
			else if (gamepads[k].id === "Oculus Touch (Left)")
			{
				affectedControllerIndex = LEFT_CONTROLLER_INDEX;
				keys = riftControllerKeys;
			}
			else
			{
				continue;
			}
			
			// Thumbstick could also be used for light intensity?
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

			//gamepads[k].buttons[riftControllerKeys.grippingTop].value;

			// controllers[ affectedControllerIndex ].controllerModel.material.color.r = controllers[ affectedControllerIndex ].button1?1:0;
			// controllers[ affectedControllerIndex ].controllerModel.material.color.g = controllers[ affectedControllerIndex ].button2?1:0;
		}
	}
	
	return vrInputSystem;
}