/*
	edges shouldn't do the silly scaling thing
	arguably corner movement should be horizontally mirrored
	maybe it should be frustum shaped?
*/

function initVisiBox()
{
	var visiBox = new THREE.Object3D();

	scene.add(visiBox);
	visiBox.scale.y = 0.42
	visiBox.scale.x = 0.54
	visiBox.scale.z = 0.56

	var faceToFront = 0.3;
	visiBox.position.z = -visiBox.scale.z / 2 - faceToFront;
	visiBox.position.y = -0.34;
	visiBox.rotation.x = -(TAU / 4 - Math.atan(visiBox.position.z/visiBox.position.y) )
	
	let ourSquareGeometry = new THREE.Geometry()
	ourSquareGeometry.vertices.push(new THREE.Vector3(0.5,0.5,0),new THREE.Vector3(0.5,-0.5,0),new THREE.Vector3(-0.5,-0.5,0),new THREE.Vector3(-0.5,0.5,0))
	visiBox.planes = [];
	var faces = Array(6);
	for(var i = 0; i < 6; i++)
	{
		faces[i] = new THREE.LineLoop( ourSquareGeometry, new THREE.MeshLambertMaterial({color:0x333333}) );
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
	
	{
		visiBox.corners = Array(8);
		var cornerGeometry = new THREE.BoxBufferGeometry(1);
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

	visiBox.update = function()
	{
		visiBox.updateMatrixWorld();
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			if(visiBox.corners[i].parent !== visiBox)
			{
				var localGrabbedCornerPosition = visiBox.corners[ i ].getWorldPosition(new THREE.Vector3());
				visiBox.worldToLocal(localGrabbedCornerPosition);
				visiBox.scale.x *= ( Math.abs(localGrabbedCornerPosition.x)-0.5 )*2 + 1;
				visiBox.scale.y *= ( Math.abs(localGrabbedCornerPosition.y)-0.5 ) + 1;
				visiBox.scale.z *= ( Math.abs(localGrabbedCornerPosition.z)-0.5 ) + 1;
				
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
		var cornerRadius = 0.01;
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
	objectsToBeUpdated.push(visiBox)

	let rememberedScale = zeroVector.clone()
	MenuOnPanel([{
		string:"Toggle clipping planes", buttonFunction:function()
		{
			if( rememberedScale.equals(zeroVector) )
			{
				rememberedScale.copy(visiBox.scale)
				visiBox.scale.setScalar(camera.far*2)
			}
			else
			{
				visiBox.scale.copy(rememberedScale)
				rememberedScale.copy(zeroVector)
			}
		}
	}],4.23,5.42)
	
	return visiBox;
}