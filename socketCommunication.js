function initSocket( renderRequirementsObject, cursor, models, maps)
{
	if ( !("WebSocket" in window) )
	{
		alert("Your browser does not support web sockets");
		return;
	}

	var socket = new WebSocket("ws://" + window.location.href.substring(7) + "ws");
	if(!socket)
	{
		console.log("invalid socket");
		return;
	}
	socket.onmessage = function(msg)
	{
		var messageContents = (msg.data).split(",");
		
		if( messageContents[0] === "mousePosition")
		{
			cursor.oldWorldPosition.copy(cursor.getWorldPosition());
			
			cursor.position.z = parseFloat( messageContents[2] ) - 1;
			var maxZ = 2; //maybe this should be about that clip plane thing
			cursor.position.z *= FOCALPOINT_DISTANCE * 2;
			
			cameraFrustum = (new THREE.Frustum()).setFromMatrix(camera.projectionMatrix);
			
			var frustumWidthAtZ = Renderer.domElement.width / Renderer.domElement.height * 2 * Math.tan( camera.fov / 360 * TAU / 2 ) * -cursor.position.z;
			if(isMobileOrTablet)
				frustumWidthAtZ /= 2; //coz there's two
			cursor.position.x = (parseFloat( messageContents[1] ) - 0.5) * frustumWidthAtZ;
		}
		else if( messageContents[0] === "lmb" )
		{
			if( parseInt( messageContents[1] ) )
				cursor.grabbing = true;
			else
				cursor.grabbing = false;
		}
		else if( messageContents[0] === "F5" )
		{
			if( parseInt( messageContents[1] ) )
				window.location.reload(true);
		}
		//this works fine but we can't record it!
		//siiiiigh, it would introduce complexity for the user anyway
//		else if( messageContents[0] === "o" && parseInt( messageContents[1] ) )
//		{
//			ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8] -= 0.01;
//			ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] += 0.01;
//			console.log(ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8])
//			console.log(ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8])
//		}
//		else if( messageContents[0] === "l" && parseInt( messageContents[1] ) )
//		{
//			ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8] += 0.01;
//			ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] -= 0.01;
//			console.log(ourStereoEffect.stereoCamera.cameraL.projectionMatrix.elements[8])
//			console.log(ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8])
//		}
		else
		{
			console.log("received unrecognized message header: ", messageContents[0] )
		}
	}
	socket.onclose = function()
	{
		console.log("The connection has been closed.");
	}
	socket.onopen = function( )
	{
		if( renderRequirementsObject.initialized )
			mainLoop( socket, cursor, models, maps );
	}
	
	return socket;
}