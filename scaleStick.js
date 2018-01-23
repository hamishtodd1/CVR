function initScaleStick(thingsToBeUpdated)
{
	var clippingPlane = new THREE.Plane();
	var scaleStick = new THREE.Mesh(new THREE.Geometry(),new THREE.MeshLambertMaterial(
		{
			color:0xFF0000,
			clippingPlanes: [clippingPlane]
		}));
	
	var numDots = 99;
	var ssRadiusSegments = 15;
	var ssRadius = 0.002;
	scaleStick.geometry.vertices = Array(numDots*ssRadiusSegments*2);
	scaleStick.geometry.faces = Array(numDots*ssRadiusSegments*2);
	for(var i = 0; i < numDots; i++)
	{
		for( var j = 0; j < ssRadiusSegments; j++)
		{
			var bottomRightVertex = i*ssRadiusSegments*2+j;
			scaleStick.geometry.vertices[bottomRightVertex]   				 = new THREE.Vector3(ssRadius,2*i,   0).applyAxisAngle(yVector,TAU*j/ssRadiusSegments);
			scaleStick.geometry.vertices[bottomRightVertex+ssRadiusSegments] = new THREE.Vector3(ssRadius,2*i+1, 0).applyAxisAngle(yVector,TAU*j/ssRadiusSegments);

			scaleStick.geometry.faces[i*ssRadiusSegments*2+j*2]   = new THREE.Face3(
				bottomRightVertex,
				bottomRightVertex+ssRadiusSegments,
				i*ssRadiusSegments*2+(j+1)%ssRadiusSegments)
			scaleStick.geometry.faces[i*ssRadiusSegments*2+j*2+1] = new THREE.Face3(
				bottomRightVertex+ssRadiusSegments,
				i*ssRadiusSegments*2+(j+1)%ssRadiusSegments+ssRadiusSegments,
				i*ssRadiusSegments*2+(j+1)%ssRadiusSegments );
		}
	}
	scaleStick.geometry.computeFaceNormals();
	scaleStick.geometry.computeVertexNormals();
	scene.add(scaleStick);
	scaleStick.update = function()
	{
		this.visible = (controllers[0].grippingSide && controllers[1].grippingSide);

		var start = controllers[0].position.clone();
		var end = controllers[1].position.clone();

		var direction = end.clone().sub(start).normalize();
		
		var newY = direction.clone().multiplyScalar(getAngstrom());
		var newX = randomPerpVector( newY ).normalize();
		var newZ = newY.clone().cross(newX).normalize();
		
		this.matrix.makeBasis( newX, newY, newZ );
		this.matrix.setPosition( start );
		this.matrixAutoUpdate = false;

		clippingPlane.normal.copy( direction ).negate();
		clippingPlane.constant = end.dot( direction );
	}
	thingsToBeUpdated.push( scaleStick );
}