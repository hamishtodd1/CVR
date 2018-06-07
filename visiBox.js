/*
	TODO edges shouldn't do the silly scaling thing
*/

function initVisiBox()
{
	var visiBox = new THREE.Object3D();

	visiBox.centerInAssemblageSpace = function()
	{
		var center = this.position.clone();
		assemblage.updateMatrixWorld();
		assemblage.worldToLocal( center );
		return center;
	}
	
	thingsToBeUpdated.push(visiBox)
	
	visiBox.position.y = -0.25;
	scene.add(visiBox);
	visiBox.scale.y = Math.abs(visiBox.position.y) * 1.5
	visiBox.scale.x = visiBox.scale.y * 1.4
	visiBox.scale.z = visiBox.scale.y * 0.9
	console.log(visiBox.scale.z)

	//when you're resizing
	// var someSphere = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshPhongMaterial({color:0xFF0000}));
	// scene.add(someSphere);
	// someSphere.position.copy(visiBox.centerInAssemblageSpace())

	var faceToFront = 0.2; //there was that one guy who kept inching back when it restarted. He could have resized the visibox
	visiBox.position.z = -visiBox.scale.z / 2 - faceToFront;
	visiBox.ordinaryParent = scene;
	visiBox.ordinaryParent.add(visiBox);
	
	var ourSquareGeometry = new THREE.RingGeometry( 0.9 * Math.sqrt( 2 ) / 2, Math.sqrt( 2 ) / 2,4,1);
	ourSquareGeometry.applyMatrix( new THREE.Matrix4().makeRotationZ( TAU / 8 ) );
	visiBox.planes = [];
	var faces = Array(6);
	for(var i = 0; i < 6; i++)
	{
		faces[i] = new THREE.Mesh(ourSquareGeometry, new THREE.MeshLambertMaterial({color:0x333333,transparent:true, opacity:0.5, side:THREE.DoubleSide}) );
		visiBox.add( faces[i] );
		if( i === 1 ) faces[i].rotation.x = TAU/2;
		if( i === 2 ) faces[i].rotation.x = TAU/4;
		if( i === 3 ) faces[i].rotation.x = -TAU/4;
		if( i === 4 ) faces[i].rotation.y = TAU/4;
		if( i === 5 ) faces[i].rotation.y = -TAU/4;
		faces[i].position.set(0,0,0.5);
		faces[i].position.applyEuler( faces[i].rotation );
		
		visiBox.planes.push( new THREE.Plane() );
	}
	
	//there's an argument for doing this with sides rather than corners, but corners are easier to aim for and give more power?
	{
		visiBox.corners = Array(8);
		var cornerGeometry = new THREE.EfficientSphereBufferGeometry(1);
		cornerGeometry.computeBoundingSphere();
		var cornerMaterial = new THREE.MeshLambertMaterial({color: 0x00FFFF});
		visiBox.updateMatrix();

		function putOnCubeCorner(i, position)
		{
			position.setScalar(0.5);
			if( i%2 )
			{
				position.x *= -1;
			}
			if( i%4 >= 2 )
			{
				position.y *= -1;
			}
			if( i>=4 )
			{
				position.z *= -1;
			}
		}
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			visiBox.corners[i] = new THREE.Mesh( cornerGeometry, cornerMaterial );
			visiBox.corners[i].boundingSphere = cornerGeometry.boundingSphere;
			visiBox.corners[i].onLetGo = visiBox.onLetGo;
			visiBox.add( visiBox.corners[i] );
			visiBox.corners[i].ordinaryParent = visiBox;

			visiBox.updateMatrixWorld();
			
			putOnCubeCorner(i, visiBox.corners[i].position)
			
			holdables.push( visiBox.corners[i] );
		}
	}

	var cornerRadius = 0.01;
	
	//TODO resize with two corners at once
	visiBox.update = function()
	{
		visiBox.updateMatrixWorld();
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			if(visiBox.corners[i].parent !== visiBox)
			{
				var newCornerPosition = new THREE.Vector3()
				visiBox.corners[ i ].getWorldPosition(newCornerPosition);
				visiBox.worldToLocal(newCornerPosition);
				visiBox.scale.x *= ( Math.abs(newCornerPosition.x)-0.5 ) + 1;
				visiBox.scale.y *= ( Math.abs(newCornerPosition.y)-0.5 ) + 1;
				visiBox.scale.z *= ( Math.abs(newCornerPosition.z)-0.5 ) + 1;
				
				visiBox.updateMatrixWorld();
				
				var newNewCornerPosition = new THREE.Vector3();
				putOnCubeCorner(i, newNewCornerPosition );
				visiBox.localToWorld(newNewCornerPosition);
				
				var displacement = new THREE.Vector3()
				visiBox.corners[ i ].getWorldPosition(displacement)
				displacement.sub( newNewCornerPosition )
				
				visiBox.position.add(displacement);
				
				break;
			}
		}
		
		var facesVisible = false;
		var cornerScale = new THREE.Vector3(cornerRadius/visiBox.scale.x,cornerRadius/visiBox.scale.y,cornerRadius/visiBox.scale.z);
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			if(visiBox.corners[i].parent === visiBox)
			{
				visiBox.corners[i].scale.copy(cornerScale);
				visiBox.corners[i].rotation.set(0,0,0);
				putOnCubeCorner(i, visiBox.corners[i].position );
			}
			else
			{
				facesVisible = true;
			}
		}
		// for(var i = 0; i < faces.length; i++)
		// {
		// 	faces[i].visible = facesVisible;
		// }
		
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

	visiBox.corners[0].position.x = 0;
	
	return visiBox;
}