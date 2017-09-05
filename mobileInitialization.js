/*
 * Note: you have to be in image transferring mode
 * 
 * TODO should be such that angstrom = 1;
 * 
 * 
 */

function mobileInitialize()
{
	//initializing cursor
	{
		var coneHeight = 0.1;
		var coneRadius = coneHeight * 0.4;
		var cursorGeometry = new THREE.ConeGeometry(coneRadius, coneHeight,31);
		cursorGeometry.computeFaceNormals();
		cursorGeometry.computeVertexNormals();
		cursorGeometry.merge( new THREE.CylinderGeometry(coneRadius / 4, coneRadius / 4, coneHeight / 2, 31 ), (new THREE.Matrix4()).makeTranslation(0, -coneHeight/2, 0) );
		cursorGeometry.applyMatrix( (new THREE.Matrix4()).makeTranslation(0, -coneHeight / 2, 0) );
		cursorGeometry.applyMatrix( (new THREE.Matrix4()).makeRotationZ(TAU/8) );
		var cursor = new THREE.Mesh(
				cursorGeometry, 
				new THREE.MeshPhongMaterial({color:0x888888, side: THREE.DoubleSide })
		);
		
		cursor.grabbing = false;
		
		cursor.followers = [];
		cursor.oldWorldPosition = new THREE.Vector3();
		//if bugs appear that can be addressed with synchronous updating, you will probably notice them!
	}
	
	{
		camera.add(cursor);
		scene.add( new THREE.PointLight( 0xFFFFFF, 1, FOCALPOINT_DISTANCE ) );
		
		ourOrientationControls = new THREE.DeviceOrientationControls(camera);
		
		ourStereoEffect = new THREE.StereoEffect( renderer );
		ourStereoEffect.stereoCamera.eyeSep = 0.02; //very small, gotten through guessing.
		
		//this is for the fairphone in the daydream, and would need to be changed with eyeSep
//		ourStereoEffect.stereoCamera.cameraR.projectionMatrix.elements[8] = 0.442;
	}
	
	if( !isMobileOrTablet )
	{
		document.addEventListener( 'keydown', function(event)
			{
				var turningSpeed = 0.05;

				if(event.keyCode === 87)
					camera.rotation.x += turningSpeed;
				if(event.keyCode === 83)
					camera.rotation.x -= turningSpeed;
				
				if(event.keyCode === 65)
					camera.rotation.y += turningSpeed;
				if(event.keyCode === 68)
					camera.rotation.y -= turningSpeed;
				
				if(event.keyCode === 81)
					camera.rotation.z += turningSpeed;
				if(event.keyCode === 69)
					camera.rotation.z -= turningSpeed;
				
			}, false );
	}
	else
	{
		document.addEventListener( 'mousedown', function(event)
			{			
				if( THREEx.FullScreen.activated() )
					return;
				
				THREEx.FullScreen.request(renderer.domElement);
			}, false );
	}

	window.addEventListener( 'resize', function(event)
	{
		renderer.setSize( window.innerWidth, window.innerHeight );
		ourStereoEffect.setSize( window.innerWidth, window.innerHeight );

		camera.aspect = renderer.domElement.width / renderer.domElement.height;
		camera.updateProjectionMatrix();
	}, false );
	
	makeStandardScene(false);

	var models = Array();
	var maps = Array();
//	initModelsAndMaps(models,maps);
	
	//testing. Try with shader one day
	{
//		var testObject = new THREE.Object3D();
//		scene.add(testObject)
//		var numSpheres = 20000; 
//		//if you only submitted the changed parts to the graphics card...
//		//how about sets of atoms? Amino acids isn't enough
//		//the shader idea is not ridiculous.
//		var templateSphereGeometry = new THREE.EfficientSphereGeometry(0.05 * 4 * angstrom);
//		var templateMaterial = new THREE.MeshPhongMaterial( {vertexColors: THREE.FaceColors} )
//		
//		var amalgmGeometry = new THREE.Geometry();
//		var numSphereVertices = templateSphereGeometry.vertices.length;
//		var numSphereFaces = templateSphereGeometry.faces.length;
//		amalgmGeometry.vertices = Array( numSphereVertices * numSpheres);
//		amalgmGeometry.faces = Array( numSphereFaces * numSpheres );
//		var firstVertexIndex = 0;
//		var firstFaceIndex = 0;
//		for(var i = 0; i < numSpheres; i++)
//		{
//			var X = Math.random() * 10;
//			
//			for(var j = 0; j < numSphereVertices; j++)
//			{
//				amalgmGeometry.vertices[firstVertexIndex+j] = templateSphereGeometry.vertices[j].clone();
//				amalgmGeometry.vertices[firstVertexIndex+j].x += X;
//			}
//			for(var j = 0; j < numSphereFaces; j++)
//			{
//				amalgmGeometry.faces[firstFaceIndex + j] = templateSphereGeometry.faces[j].clone();
//				amalgmGeometry.faces[firstFaceIndex + j].a += numSphereVertices * i;
//				amalgmGeometry.faces[firstFaceIndex + j].b += numSphereVertices * i;
//				amalgmGeometry.faces[firstFaceIndex + j].c += numSphereVertices * i;
//			}
//			
//			if(!i%30000)
//				console.log(i)
//			
//			firstVertexIndex += numSphereVertices;
//			firstFaceIndex += numSphereFaces;
//		}
//		testObject.add(new THREE.Mesh(amalgmGeometry, templateMaterial))
//		testObject.position.z = -FOCALPOINT_DISTANCE / 4;
	}
		
		
	//socket crap
	{
		socket = initSocket(maps);
		socket.messageResponses["mousePosition"] = function(messageContents)
		{
			cursor.oldWorldPosition.copy(cursor.getWorldPosition());
			
			cursor.position.z = parseFloat( messageContents[2] ) - 1;
			var maxZ = 2; //maybe this should be about that clip plane thing
			cursor.position.z *= FOCALPOINT_DISTANCE * 2;
			
			cameraFrustum = (new THREE.Frustum()).setFromMatrix(camera.projectionMatrix);
			
			var frustumWidthAtZ = renderer.domElement.width / renderer.domElement.height * 2 * Math.tan( camera.fov / 360 * TAU / 2 ) * -cursor.position.z;
			if(isMobileOrTablet)
				frustumWidthAtZ /= 2; //coz there's two
			cursor.position.x = (parseFloat( messageContents[1] ) - 0.5) * frustumWidthAtZ;
		}
		
		socket.messageResponses["lmb"] = function(messageContents)
		{
			if( parseInt( messageContents[1] ) )
				cursor.grabbing = true;
			else
				cursor.grabbing = false;
		}
		
		socket.messageResponses["This is the server"] = function(messageContents)
		{}
		
		//A solution to narrow screens. Works fine but we can't record it!
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
		
		socket.onopen = function( )
		{
			mobileLoop( socket, cursor, models, maps );
		}
	}
}