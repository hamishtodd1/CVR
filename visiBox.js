//Old notes:

//it's a truncated cone (perspective), and the front face is as close to you as is comfortable. You grab the back rim and resize
//Eh... if the lateral boundaries don't matter, probably you just need near and far!
//Handle could be what you see when you look up with your eyes(not your head), but you don't see it normally, that's distracting
//Spin the rim to make the front move away?
//Jesus stereoscopy, you'd need different things happenning in the renderers. Don't do this, a cone is fine
//Jesus... if people go far with this and it's a very thin slice, it is very much like a 2D screen
//Ideally you also have lamps around your hands
//hmm maybe your hands should be the planes, when you're not holding anything?
//it's a very simple shader to make it spherical

function initVisiBox(thingsToBeUpdated, holdables, initialScale)
{
	//should its edges only appear sometimes?
	visiBox = new THREE.Object3D();
	
	thingsToBeUpdated.visiBox = visiBox;
	
	visiBox.scale.setScalar(initialScale);
	visiBox.position.z = -FOCALPOINT_DISTANCE
	scene.add(visiBox);
	
	var ourSquareGeometry = new THREE.RingGeometry( 0.9 * Math.sqrt( 2 ) / 2, Math.sqrt( 2 ) / 2,4,1);
	ourSquareGeometry.applyMatrix( new THREE.Matrix4().makeRotationZ( TAU / 8 ) );
	visiBox.planes = [];
	var faces = Array(6);
	for(var i = 0; i < 6; i++)
	{
		faces[i] = new THREE.Mesh(ourSquareGeometry, new THREE.MeshLambertMaterial({color:0xFF0000,transparent:true, opacity:0.5, side:THREE.DoubleSide}) );
		visiBox.add( faces[i] );
		if( i === 1) faces[i].rotation.x = TAU/2;
		if( i === 2) faces[i].rotation.x = TAU/4;
		if( i === 3) faces[i].rotation.x = -TAU/4;
		if( i === 4) faces[i].rotation.y = TAU/4;
		if( i === 5) faces[i].rotation.y = -TAU/4;
		faces[i].position.set(0,0,0.5);
		faces[i].position.applyEuler( faces[i].rotation );
		
		visiBox.planes.push( new THREE.Plane() );
	}
	
	//there's an argument for doing this with sides rather than corners, but corners are easier to aim for and give more power?
	{
		visiBox.corners = Array(8);
		var cornerGeometry = new THREE.EfficientSphereBufferGeometry(1);
		cornerGeometry.computeBoundingSphere();
		var cornerMaterial = new THREE.MeshLambertMaterial({color: 0x00FFFF, side:THREE.DoubleSide});
		visiBox.updateMatrix();
		
		function putOnCubeCorner(i, position)
		{
			position.setScalar(0.5);
			if( i%2 )
				position.x *= -1;
			if( i%4 >= 2 )
				position.y *= -1;
			if( i>=4 )
				position.z *= -1;
		}
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			visiBox.corners[i] = new THREE.Mesh( cornerGeometry, cornerMaterial );
			visiBox.corners[i].scale.setScalar( 0.01 );
			visiBox.corners[i].boundingSphere = cornerGeometry.boundingSphere;
			visiBox.add( visiBox.corners[i] );
			visiBox.corners[i].ordinaryParent = visiBox;

			visiBox.updateMatrixWorld();
			
			putOnCubeCorner(i, visiBox.corners[i].position)
			
			holdables[ "visiBoxCorner" + i.toString() ] = visiBox.corners[i];
		}
	}

	var cornerRadius = 0.01;
	
	//TODO can resize with two corners at once
	visiBox.update = function()
	{
		visiBox.updateMatrixWorld();
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			if(visiBox.corners[i].parent !== visiBox)
			{
				var newCornerPosition = visiBox.corners[ i ].getWorldPosition();
				visiBox.worldToLocal(newCornerPosition);
				visiBox.scale.x *= ( Math.abs(newCornerPosition.x)-0.5 ) + 1;
				visiBox.scale.y *= ( Math.abs(newCornerPosition.y)-0.5 ) + 1;
				visiBox.scale.z *= ( Math.abs(newCornerPosition.z)-0.5 ) + 1;
				
				visiBox.updateMatrixWorld();
				
				var newNewCornerPosition = new THREE.Vector3();
				putOnCubeCorner(i, newNewCornerPosition );
				visiBox.localToWorld(newNewCornerPosition);
				
				var displacement = visiBox.corners[ i ].getWorldPosition().sub( newNewCornerPosition )//.multiply(visiBox.scale);
				
				visiBox.position.add(displacement)
				
				break;
			}
		}
		
		var facesVisible = false;
		if(visiBox.parent !== scene)
		{
			facesVisible = true;
		}
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			if(visiBox.corners[i].parent === visiBox)
			{
				visiBox.corners[i].scale.set(cornerRadius/visiBox.scale.x,cornerRadius/visiBox.scale.y,cornerRadius/visiBox.scale.z);
				visiBox.corners[i].rotation.set(0,0,0);
				putOnCubeCorner(i, visiBox.corners[i].position );
			}
			else
			{
				facesVisible = true;
			}
		}
		for(var i = 0; i < faces.length; i++)
		{
			faces[i].visible = facesVisible;
		}
		
		//beware, the planes may be the negatives of what you expect, seemingly because of threejs bug
		for(var i = 0; i < this.planes.length; i++)
		{
			var planeVector = new THREE.Vector3();
			planeVector.applyMatrix4(this.children[i].matrix);
			this.planes[i].normal.copy(planeVector).normalize();
			this.planes[i].constant = planeVector.dot( this.planes[i].normal );
			
			this.planes[i].applyMatrix4(visiBox.matrixWorld);
		}
	}
	
	return visiBox;
}