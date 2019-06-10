//could change the lasers so there's two each and they come at angles like TV antenna

function initHands()
{
	function overlappingHoldable(holdable)
	{
		if(holdable === assemblage)
		{
			return true
		}

		//TODO once a weird bug here where geometry was undefined
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
				handControllers[  i ].controllerModel.geometry = object.children[0].geometry;

				let m = new THREE.Matrix4()
				let q = new THREE.Quaternion( -0.3375292117664683,-0.044097048926644455,0.0016882363725985309,-0.9402800813258839 )

				if(i === LEFT_CONTROLLER_INDEX)
				{
					m.makeRotationFromQuaternion(q)
					m.setPosition(new THREE.Vector3(-0.012547648553172985,0.03709224605844833,-0.038470991285082676))
					handControllers[ i ].controllerModel.geometry.applyMatrix( m )
				}
				else
				{
					let qAxis = new THREE.Vector3(
						q.x / Math.sqrt(1-q.w*q.w),
						q.y / Math.sqrt(1-q.w*q.w),
						q.z / Math.sqrt(1-q.w*q.w))
					qAxis.x *= -1
					let otherQ = new THREE.Quaternion().setFromAxisAngle(qAxis,-2 * Math.acos(q.w))
					
					m.makeRotationFromQuaternion(otherQ)
					m.setPosition(new THREE.Vector3(0.012547648553172985,0.03709224605844833,-0.038470991285082676))
					handControllers[i].controllerModel.geometry.applyMatrix( m )
				}

				handControllers[  i ].controllerModel.geometry.computeBoundingSphere();
			},
			function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } );
	}
	
	var controllerMaterial = new THREE.MeshLambertMaterial({color:0x444444});
	var laserRadius = 0.001;
	var controllerKeys = {
		thumbstickButton:0,
		grippingTop: 1,
		grippingSide:2,
		button1: 3,
		button2: 4
	}
	for(var i = 0; i < 2; i++)
	{
		{
			handControllers[ i ].laser = new THREE.Mesh(
				new THREE.CylinderBufferGeometryUncentered( laserRadius, 1), 
				new THREE.MeshBasicMaterial({color:0xFF0000, transparent:true,opacity:0.14}) 
			);
			handControllers[ i ].laser.rotation.z = TAU/4 * (i?1:-1)
			handControllers[ i ].laser.rotation.x = -0.1
			handControllers[ i ].add(handControllers[ i ].laser);
			var raycaster = new THREE.Raycaster();
			handControllers[ i ].intersectLaserWithObject = function(object3D)
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

		for( var propt in controllerKeys )
		{
			handControllers[ i ][propt] = false;
			handControllers[ i ][propt+"Old"] = false;
		}
		handControllers[ i ].thumbStickAxes = [0,0];

		handControllers[ i ].controllerModel = new THREE.Mesh( new THREE.Geometry(), controllerMaterial.clone() );
		handControllers[ i ].add( handControllers[ i ].controllerModel );

		handControllers[ i ].oldPosition = handControllers[ i ].position.clone();
		handControllers[ i ].oldQuaternion = handControllers[ i ].quaternion.clone();
		handControllers[ i ].deltaQuaternion = handControllers[ i ].quaternion.clone();
		handControllers[ i ].deltaPosition = handControllers[ i ].position.clone();
		
		handControllers[ i ].overlappingHoldable = overlappingHoldable;

		scene.add( handControllers[ i ] );
		handControllers[ i ].position.y = -0.5 //out of way until getting input
		
		loadControllerModel(i);
	}

	readHandInput = function()
	{
		// var device = renderer.vr.getDevice()
		// if(device)
		// 	console.log(device.stageParameters.sittingToStandingTransform)

		var gamepads = navigator.getGamepads();
		// var standingMatrix = renderer.vr.getStandingMatrix()
		
		//If handControllers aren't getting input even from XX-vr-handControllers,
		//Try restarting computer. Urgh. Just browser isn't enough. Maybe oculus app?
		for(var k = 0; k < gamepads.length; ++k)
		{
			if(!gamepads[k] || gamepads[k].pose === null || gamepads[k].pose === undefined || gamepads[k].pose.position === null)
			{
				continue;
			}


			var affectedControllerIndex = -1;
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
			}
			else if (gamepads[k].id === "Oculus Touch (Right)")
			{
				affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
			}
			else if (gamepads[k].id === "Oculus Touch (Left)")
			{
				affectedControllerIndex = LEFT_CONTROLLER_INDEX;
			}
			else if (gamepads[k].id === "Spatial Controller (Spatial Interaction Source)")
			{
				if( gamepads[k].hand === "right" )
				{
					affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
				}
				else
				{
					affectedControllerIndex = LEFT_CONTROLLER_INDEX;
				}
			}
			else
			{
				continue;
			}

			var controller = handControllers[affectedControllerIndex]
			
			// Thumbstick could also be used for light intensity?
			controller.thumbStickAxes[0] = gamepads[k].axes[0];
			controller.thumbStickAxes[1] = gamepads[k].axes[1];
			
			controller.oldPosition.copy(handControllers[ affectedControllerIndex ].position);
			controller.oldQuaternion.copy(handControllers[ affectedControllerIndex ].quaternion);
			
			controller.position.fromArray( gamepads[k].pose.position );
			controller.position.add(HACKY_HAND_ADDITION_REMOVE)
			// controller.position.applyMatrix4( standingMatrix );
			controller.quaternion.fromArray( gamepads[k].pose.orientation );
			controller.updateMatrixWorld();

			controller.deltaPosition.copy(handControllers[ affectedControllerIndex ].position).sub(handControllers[ affectedControllerIndex ].oldPosition);
			controller.deltaQuaternion.copy(controller.oldQuaternion).inverse().multiply(controller.quaternion);

			for( var propt in controllerKeys )
			{
				handControllers[ affectedControllerIndex ][propt+"Old"] = handControllers[ affectedControllerIndex ][propt];
				handControllers[ affectedControllerIndex ][propt] = gamepads[k].buttons[controllerKeys[propt]].pressed;
			}
			handControllers[ affectedControllerIndex ]["grippingSide"] = gamepads[k].buttons[controllerKeys["grippingSide"]].value > 0.7;
			
			//gamepads[k].buttons[controllerKeys.grippingTop].value;

			// handControllers[ affectedControllerIndex ].controllerModel.material.color.r = handControllers[ affectedControllerIndex ].button1?1:0;
			// handControllers[ affectedControllerIndex ].controllerModel.material.color.g = handControllers[ affectedControllerIndex ].button2?1:0;
		}
	}
}