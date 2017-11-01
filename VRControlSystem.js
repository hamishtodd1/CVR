function initVRInputSystem(controllers)
{
	var VRInputSystem = {};
	
	var cameraRepositioner = new THREE.VRControls( camera );
	
	VRInputSystem.startGettingInput = function()
	{
		if(cameraRepositioner.vrInputs.length < 1)
			console.error("no vr input? Check steamVR or Oculus to make sure it's working correctly")
			
		cameraRepositioner.vrInputs[0].requestPresent([{ source: renderer.domElement }])
		
		scene.add( controllers[ 0 ] );
		scene.add( controllers[ 1 ] );
	}
	
	var riftControllerKeys = {
			thumbstickButton:0,
			grippingTop: 1,
			grippingSide:2,
			button1: 3,
			button2: 4
	}
	
	var controllerMaterial = new THREE.MeshLambertMaterial({color:0x444444});
	for(var i = 0; i < 2; i++)
	{
		controllers[ i ] = new THREE.Object3D();
		for( var propt in riftControllerKeys )
		{
			controllers[ i ][propt] = false;
		}
		console.log(controllers[i])
		controllers[ i ].controllerModel = new THREE.Mesh( new THREE.Geometry(), controllerMaterial.clone() );
		controllers[ i ].add( controllers[ i ].controllerModel );
	}
	new THREE.OBJLoader().load( "data/external_controller01_left.obj",
		function ( object ) 
		{	
			var controllerModelGeometry = object.children[0].geometry;
		
			controllerModelGeometry.applyMatrix( new THREE.Matrix4().makeRotationAxis(xAxis,0.5) );
			controllerModelGeometry.applyMatrix( new THREE.Matrix4().makeTranslation(0.002,0.036,-0.039) );
//			controllerModelGeometry.applyMatrix( new THREE.Matrix4().makeScale(0.76,0.76,0.76) );
			
			controllers[  LEFT_CONTROLLER_INDEX ].controllerModel.geometry = controllerModelGeometry;
			controllers[1-LEFT_CONTROLLER_INDEX ].controllerModel.geometry = controllerModelGeometry.clone();
			controllers[1-LEFT_CONTROLLER_INDEX ].controllerModel.geometry.applyMatrix( new THREE.Matrix4().makeScale(-1,1,1) );
		},
		function ( xhr ) {}, function ( xhr ) { console.error( "couldn't load OBJ" ); } );
	
	VRInputSystem.update = function(socket)
	{
		cameraRepositioner.update(); //positions the head

		var gamepads = navigator.getGamepads();
		for(var k = 0; k < 2 && k < gamepads.length; ++k)
		{
			var affectedControllerIndex = 666;
			if (gamepads[k] && gamepads[k].id === "Oculus Touch (Right)")
				affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
			if (gamepads[k] && gamepads[k].id === "Oculus Touch (Left)")
				affectedControllerIndex = LEFT_CONTROLLER_INDEX;
			if( affectedControllerIndex === 666 )
				continue;
			
			controllers[affectedControllerIndex].position.fromArray( gamepads[k].pose.position );
			controllers[affectedControllerIndex].quaternion.fromArray( gamepads[k].pose.orientation );
			controllers[affectedControllerIndex].updateMatrixWorld();
			
			controllers[affectedControllerIndex].grippingSide = gamepads[k].buttons[riftControllerKeys.grippingSide].pressed;
			controllers[affectedControllerIndex].grippingTop = gamepads[k].buttons[riftControllerKeys.grippingTop].pressed;
			
			controllers[affectedControllerIndex].button1 = gamepads[k].buttons[riftControllerKeys.button1].pressed;
			
//			if( affectedControllerIndex === RIGHT_CONTROLLER_INDEX )
//			{
//				ourVREffect.eyeSeparationMultiplier = gamepads[k].buttons[riftTriggerButton].value;
//			}
		}
	}
	
	return VRInputSystem;
}