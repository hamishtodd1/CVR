/*
	edges shouldn't do the silly scaling thing
	arguably corner movement should be horizontally mirrored
	maybe it should be frustum shaped?
*/

function initVisiBox()
{
	visiBox = new THREE.LineSegments(new THREE.Geometry(),new THREE.MeshLambertMaterial({color:0x333333}));
	visiBox.planes = []
	scene.add(visiBox);

	let faceToFront = 0.3;

	visiBox.scale.y = 0.16
	visiBox.scale.x = 0.27
	visiBox.scale.z = 0.28

	visiBox.rotation.x = -TAU * 0.09

	let d = 99999
	visiBox.geometry.vertices.push(
		new THREE.Vector3(1,1,-1), new THREE.Vector3(1,-1,-1),new THREE.Vector3(1,-1,-1),new THREE.Vector3(d,-d,-d),
		new THREE.Vector3(1,-1,-1), new THREE.Vector3(-1,-1,-1), new THREE.Vector3(-1,-1,-1), new THREE.Vector3(-d,-d,-d),
		new THREE.Vector3(-1,-1,-1), new THREE.Vector3(-1,1,-1), new THREE.Vector3(-1,1,-1), new THREE.Vector3(-d,d,-d),
		new THREE.Vector3(-1,1,-1),new THREE.Vector3(1,1,-1),new THREE.Vector3(1,1,-1),new THREE.Vector3(d,d,-d) )

	let faces = Array(5);
	let planes = []
	let squareGeometry = new THREE.PlaneGeometry(0.6,0.6)
	for(let i = 0; i < faces.length; i++)
	{
		faces[i] = new THREE.Mesh( squareGeometry,new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:0.3}) );
		faces[i].visible = false
		visiBox.add( faces[i] );
		if( i === 0 ) faces[i].position.z = -1
		if( i === 1 ) faces[i].rotation.x = TAU/8;
		if( i === 2 ) faces[i].rotation.x = -TAU/8;
		if( i === 3 ) faces[i].rotation.y = TAU/8;
		if( i === 4 ) faces[i].rotation.y = -TAU/8;
		
		planes.push( new THREE.Plane() );
		visiBox.planes.push(planes[i])
	}

	{
		visiBox.corners = Array(4);
		let cornerGeometry = new THREE.BoxBufferGeometry(1);
		cornerGeometry.computeBoundingSphere();
		let cornerMaterial = new THREE.MeshLambertMaterial({color: 0x00FFFF});
		visiBox.updateMatrix();

		for(let i = 0; i < visiBox.corners.length; i++)
		{
			visiBox.corners[i] = new THREE.Mesh( cornerGeometry, cornerMaterial );
			visiBox.corners[i].boundingSphere = cornerGeometry.boundingSphere;
			visiBox.add( visiBox.corners[i] );
			visiBox.corners[i].ordinaryParent = visiBox;

			visiBox.updateMatrixWorld();
			visiBox.corners[i].intendedPositionInVisiBox = new THREE.Vector3(1,1,-1)
			if( i%2 )
			{
				visiBox.corners[i].intendedPositionInVisiBox.x *= -1;
			}
			if( i%4 >= 2 )
			{
				visiBox.corners[i].intendedPositionInVisiBox.y *= -1;
			}
			visiBox.corners[i].position.copy(visiBox.corners[i].intendedPositionInVisiBox)
			
			holdables.push( visiBox.corners[i] );
		}
	}

	objectsToBeUpdated.push(visiBox)
	visiBox.update = function()
	{
		visiBox.updateMatrixWorld();
		for(let i = 0; i < visiBox.corners.length; i++)
		{
			if(visiBox.corners[i].parent !== visiBox)
			{
				let localGrabbedCornerPosition = visiBox.corners[i].getWorldPosition( new THREE.Vector3() )
				visiBox.worldToLocal(localGrabbedCornerPosition);

				visiBox.scale.x *= localGrabbedCornerPosition.x
				visiBox.scale.y *= localGrabbedCornerPosition.y
				visiBox.scale.z *= -localGrabbedCornerPosition.z
				//urgh do you want off-center on the y?


				//x is mirrored
				//y is just 

				// let localGrabbedCornerPosition = visiBox.corners[ i ].getWorldPosition(new THREE.Vector3());
				// visiBox.worldToLocal(localGrabbedCornerPosition);
				// visiBox.scale.x *= ( Math.abs(localGrabbedCornerPosition.x)-0.5 )*2 + 1;
				// visiBox.scale.y *= ( Math.abs(localGrabbedCornerPosition.y)-0.5 ) + 1;
				// visiBox.scale.z *= ( Math.abs(localGrabbedCornerPosition.z)-0.5 ) + 1;
				
				visiBox.updateMatrixWorld();
				
				break;
			}
		}
		
		let cornerRadius = 0.01;
		let cornerScale = new THREE.Vector3(cornerRadius/visiBox.scale.x,cornerRadius/visiBox.scale.y,cornerRadius/visiBox.scale.z);
		for(let i = 0; i < visiBox.corners.length; i++)
		{
			if(visiBox.corners[i].parent === visiBox)
			{
				visiBox.corners[i].scale.copy(cornerScale);
				visiBox.corners[i].rotation.set(0,0,0);
				visiBox.corners[i].position.copy(visiBox.corners[i].intendedPositionInVisiBox)
			}
		}
		
		//beware, the planes may be the negatives of what you expect, seemingly because of threejs bug
		planes[0].constant = -1
		for(let i = 0; i < planes.length; i++)
		{
			planes[i].normal.set(0,0,-1)
			planes[i].normal.applyMatrix4(faces[i].matrix).normalize();
			planes[i].applyMatrix4(visiBox.matrixWorld);
		}
	}

	let rememberedScale = zeroVector.clone()
	MenuOnPanel([{
		string:"Toggle clipping planes", buttonFunction:function()
		{
			if( visiBox.planes.length !== 0 )
			{
				visiBox.planes.length = 0
			}
			else
			{
				for(let i = 0; i < planes.length; i++)
				{
					visiBox.planes.push(planes[i])
				}
			}
		}
	}],4.23,5.42)
}