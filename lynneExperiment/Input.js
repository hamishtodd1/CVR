var inputObject = { 
	//"private variables"
	modelStates: Array(),
	
	userString: "",
	proteinRequested: 0,
	
	clientX: 0,
	clientY: 0,
	
	controllerStates: [ //or hey you could send them the matrix, numnuts
	    { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
		{ position: new THREE.Vector3(), quaternion: new THREE.Quaternion() } ],

	cameraState: {position: new THREE.Vector3(), quaternion: new THREE.Quaternion()}
};

inputObject.updateFromAsynchronousInput = function(Controllers ) //the purpose of this is to update everything
{	
	if(VRMODE) //including google cardboard TODO
	{
		/* OurVRControls is external. TODO replace it so you understand it. Later.
		 * Is camera position updated asynchronously? :X surely this rift asynchronous business means that?
		 */
		OurVRControls.update();
		
		Controllers[0].updateMatrix();
		Controllers[1].updateMatrix();
		var formerPositions = Array(Controllers[0].position.clone(), Controllers[1].position.clone());
		var formerQuaternions = Array(Controllers[0].quaternion.clone(), Controllers[1].quaternion.clone());
		
		//"Controllers" are updated synchronously and are the data you use
		var gamepads = navigator.getGamepads();
	    
	    //pushing the thumbstick in is 0, the two buttons are 3 and 4
		for(var k = 0; k < 2 && k < gamepads.length; ++k)
		{	
			var affectedControllerIndex = 666;
			if (gamepads[k] && gamepads[k].id === "OpenVR Gamepad") //because some are undefined
				affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
			
			if (gamepads[k] && gamepads[k].id === "Oculus Touch (Right)") //because some are undefined
				affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
			if (gamepads[k] && gamepads[k].id === "Oculus Touch (Left)")
				affectedControllerIndex = LEFT_CONTROLLER_INDEX;
			if (gamepads[k] && gamepads[k].id === "OpenVR Gamepad" )
			{
				if(gamepads[k].index )
					affectedControllerIndex = RIGHT_CONTROLLER_INDEX;
				else
					affectedControllerIndex = LEFT_CONTROLLER_INDEX;
			}
			
			if(affectedControllerIndex === 666)
				continue;
			
			if(gamepads[k].pose.position && gamepads[k].pose.orientation)
			{
				Controllers[affectedControllerIndex].position.x = gamepads[k].pose.position[0];
				Controllers[affectedControllerIndex].position.y = gamepads[k].pose.position[1];
				Controllers[affectedControllerIndex].position.z = gamepads[k].pose.position[2];
				Controllers[affectedControllerIndex].quaternion.x = gamepads[k].pose.orientation[0];
				Controllers[affectedControllerIndex].quaternion.y = gamepads[k].pose.orientation[1];
				Controllers[affectedControllerIndex].quaternion.z = gamepads[k].pose.orientation[2];
				Controllers[affectedControllerIndex].quaternion.w = gamepads[k].pose.orientation[3];
			}
			
			for(var i = 0; i < gamepads[k].buttons.length; i++)
			{
				if( gamepads[k].buttons[i].pressed)
				{
					Controllers[affectedControllerIndex].Gripping = 1;
					break;
				}
				if(i === gamepads[k].buttons.length-1)
					Controllers[affectedControllerIndex].Gripping = 0;
			}
		}
		
		if( gamepads[0] )
			ramachandran.genus = gamepads[0].buttons[1].value;
	}
}

socket.on('screenIndicator', function(spectatorScreenCornerCoords)
{
	for(var i = 0; i < 4; i++)
	{
		Camera.children[0].geometry.vertices[i].set(
			spectatorScreenCornerCoords[i*3+0],
			spectatorScreenCornerCoords[i*3+1],
			spectatorScreenCornerCoords[i*3+2]
			);
	}
	Camera.children[0].geometry.verticesNeedUpdate = true;
});


inputObject.updatemouseposition = function(event)
{
	event.preventDefault();
	
	if(delta_t === 0) return; //so we get no errors before beginning
	
	this.clientX = event.clientX;
	this.clientY = event.clientY;
	
	var vector = new THREE.Vector3(
		  ( event.clientX / window.innerWidth ) * 2 - 1,
	    - ( event.clientY / window.innerHeight) * 2 + 1,
	    0.5 );
	vector.unproject( Camera );
	var dir = vector.sub( Camera.position ).normalize();
	var distance = - Camera.position.z / dir.z;
	var mousePositionInSpace = Camera.position.clone();
	mousePositionInSpace.add( dir.multiplyScalar( distance ) );
	
	//...and you COULD do something with this thing, which is the mouse position in some plane, but not now
}
document.addEventListener( 'mousemove', inputObject.updatemouseposition, false );