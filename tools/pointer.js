function initPointer()
{
	var pointerRadius = 0.03;
	var pointer = new THREE.Mesh(
		new THREE.CylinderBufferGeometry( pointerRadius,pointerRadius, pointerRadius * 4,32 ),
		new THREE.MeshPhongMaterial({color:0x00FFFF })
	);
	pointer.geometry.computeBoundingSphere();
	pointer.boundingSphere = pointer.geometry.boundingSphere;

	var laserRadius = 0.001;
	var laser = new THREE.Mesh(
		new THREE.CylinderBufferGeometryUncentered( laserRadius, 2), 
		new THREE.MeshBasicMaterial({color:0xFF0000, /*transparent:true,opacity:0.4*/}) 
	);
	pointer.add(laser);
	laser.visible = false;

	var label = makeTextSign( "pointer" );
	label.position.z = pointerRadius;
	label.rotation.z = -TAU/4;
	label.scale.setScalar(pointerRadius)
	pointer.add(label);
	pointer.rotation.z = TAU/4;

	pointer.update = function()
	{
		label.visible = this.parent === scene;
		
		if( this.parent !== scene )
		{
			laser.visible = this.parent.button1;
		}
		else
		{
			laser.visible = false;
		}
	}

	thingsToBeUpdated.push(pointer);
	holdables.push(pointer);
	pointer.ordinaryParent = scene;

	pointer.position.set(0,-0.4,0.1)
	scene.add(pointer);
	return pointer;
}