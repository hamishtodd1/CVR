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

	{
		let desktop = new THREE.Mesh(new THREE.BoxGeometry(20,20,20))
		objectsToBeUpdated.push(desktop)
		desktop.update = function()
		{

		}
	}

	let indicators = new THREE.Points(new THREE.Geometry(), new THREE.PointsMaterial({size:0.0009, color:0x00FF00}))

	function loadControllerModel(i)
	{
		new THREE.OBJLoader().load( "data/external_controller01_" + (i===LEFT_CONTROLLER_INDEX?"left":"right") + ".obj",
			function ( object ) 
			{
				handControllers[  i ].controllerModel.geometry = object.children[0].geometry;

				// handControllers[  i ].controllerModel.geometry.applyMatrix( new THREE.Matrix4().makeRotationAxis(xVector,0.7) );
				// handControllers[  i ].controllerModel.geometry.applyMatrix( new THREE.Matrix4().makeTranslation(
				// 	0.008 * ( i == LEFT_CONTROLLER_INDEX?-1:1),
				// 	0.041,
				// 	-0.03) );

				if(i === LEFT_CONTROLLER_INDEX)
				{
					let m = new THREE.Matrix4()

					let frontNormalWhenFacingDown = new THREE.Vector3(-0.17258007901794128,0.6269252001255843,0.7597242327145142)
					let downwardsAccordingToHandControllerWhenHandActuallyDown = new THREE.Vector3(-0.16627037816428825,-0.004547117284049884,0.9860697201043145)
					log(frontNormalWhenFacingDown.clone().cross(downwardsAccordingToHandControllerWhenHandActuallyDown))
					let q = new THREE.Quaternion().setFromUnitVectors( 
						frontNormalWhenFacingDown,
						downwardsAccordingToHandControllerWhenHandActuallyDown
						)
					log(q)
					m.makeRotationFromQuaternion(q)

					// (0.1282512291156533,0.983220893058035,0.12972427413557286)
					// (-0.12045631511973585,0.9926273901478321,-0.013458843786827573)

					handControllers[ i ].controllerModel.geometry.applyMatrix( m );

					let p = handControllers[  i ].controllerModel.geometry.attributes.position.array
					let offset = 6792
					for(let j = offset; j < offset+360;  j+=6)
					{
						indicators.geometry.vertices.push(new THREE.Vector3( p[j*3+0], p[j*3+1], p[j*3+2]))
						// log(p[j*3+0], p[j*3+1], p[j*3+2])
					}
					handControllers[i].add(indicators)

					let plane = new THREE.Plane().setFromCoplanarPoints(indicators.geometry.vertices[0],indicators.geometry.vertices[25],indicators.geometry.vertices[50])
					var helper = new THREE.Mesh( new THREE.PlaneGeometry(0.5,0.5), new THREE.MeshBasicMaterial({color:0xFF0000,transparent:true,opacity:0.6,side:THREE.DoubleSide}) );
					helper.quaternion.setFromUnitVectors(zVector,plane.normal)
					helper.position.copy(zVector).multiplyScalar(-plane.constant).applyQuaternion(helper.quaternion)
					handControllers[i].add( helper );

					let previousEigenvector = new THREE.Vector4()

					helper.update = function()
					{
						if(handControllers[RIGHT_CONTROLLER_INDEX].button1)
						{
							handControllers[ i ].controllerModel.rotateOnAxis(frontNormalWhenFacingDown,0.01)
						}
						if(handControllers[RIGHT_CONTROLLER_INDEX].button2)
						{
							handControllers[ i ].controllerModel.rotateOnAxis(frontNormalWhenFacingDown,-0.01)
						}


						// console.log(1)
						// let oldMatrix = new THREE.Matrix4().makeRotationFromQuaternion(handControllers[i].oldQuaternion)
						// oldMatrix.setPosition(handControllers[i].oldPosition)
						// let diffMatrix = new THREE.Matrix4().getInverse(oldMatrix,function(){console.error("no inversion for you")})
						// diffMatrix.multiply( handControllers[i].matrix )

						// // console.log(2)

						// let jmatM = Jmat.Matrix(4,4,diffMatrix.elements)
						// let eigenvectors = Jmat.Matrix.eig(jmatM,0).v.e
						// for(let i = 0; i < eigenvectors.length; i++)
						// {
						// 	if( Math.abs(eigenvectors[i][0].im) < 0.001 &&
						// 		Math.abs(eigenvectors[i][1].im) < 0.001 &&
						// 		Math.abs(eigenvectors[i][2].im) < 0.001 &&
						// 		Math.abs(eigenvectors[i][3].im) < 0.001 )
						// 	{
						// 		// log(eigenvectors[i].toString()) //pretty suspicious if it's not homogeneous. Scalar multiple?
						// 		let currentEigenvector = new THREE.Vector4(
						// 			Math.abs(eigenvectors[i][0])<0.001 ? 0 : eigenvectors[i][0],
						// 			Math.abs(eigenvectors[i][1])<0.001 ? 0 : eigenvectors[i][1],
						// 			Math.abs(eigenvectors[i][2])<0.001 ? 0 : eigenvectors[i][2],
						// 			Math.abs(eigenvectors[i][3])<0.001 ? 0 : eigenvectors[i][3] )
						// 		currentEigenvector.multiplyScalar(1/currentEigenvector.w)
						// 		log(currentEigenvector.distanceTo(previousEigenvector).toFixed(4))
						// 		previousEigenvector.copy(currentEigenvector)
						// 	}
						// }
						// console.log(3)
						// log(handControllers[i].matrix.elements.toString())
						// log( plane.normal.clone().toArray().toString() )
						// log( new THREE.Vector3(0,-1,0).applyQuaternion(handControllers[i].quaternion.clone().inverse()).toArray().toString() )
					}
					objectsToBeUpdated.push(helper)
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