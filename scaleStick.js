function initScaleStick()
{
	var clippingPlane = new THREE.Plane();
	var scaleStick = new THREE.Mesh(
		DottedLineGeometry(99,0.002),
		new THREE.MeshLambertMaterial(
		{
			color:0xFF0000,
			clippingPlanes: [clippingPlane]
		}));

	scene.add(scaleStick);
	scaleStick.update = function()
	{
		this.visible = (controllers[0].grippingSide && controllers[1].grippingSide);

		var direction = controllers[1].position.clone().sub(controllers[0].position).normalize();
		
		var newY = direction.clone().multiplyScalar(getAngstrom());
		redirectCylinder(this, controllers[0].position, newY)

		clippingPlane.normal.copy( direction ).negate();
		clippingPlane.constant = controllers[1].position.dot( direction );
	}
	thingsToBeUpdated.push( scaleStick );
}