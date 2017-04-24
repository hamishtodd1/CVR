function Render(socket) {
	delta_t = ourclock.getDelta();
	
	socket.send("mousePositionPlease")
	
	if(isMobileOrTablet)
		ourOrientationControls.update();
	
	ourObject.position.set(0,0,-FOCALPOINT_DISTANCE);
	camera.updateMatrixWorld();
	camera.localToWorld(ourObject.position);
	
	requestAnimationFrame( function(){
		Render(socket);
	} );
	if(isMobileOrTablet)
		ourStereoEffect.render( scene, camera ); //CC
	else
		Renderer.render( scene, camera );
}
