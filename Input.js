//document.addEventListener( 'mousedown', go_fullscreen_and_init_object, false );
//document.addEventListener('touchstart', go_fullscreen_and_init_object, false );
//function go_fullscreen_and_init_object(event)
//{
//	event.preventDefault();
//	
//	if( THREEx.FullScreen.activated() )
//		return;
//	
//	THREEx.FullScreen.request(Renderer.domElement);
//}

window.addEventListener( 'resize', function(event)
{
	Renderer.setSize( window.innerWidth, window.innerHeight );
	if( isMobileOrTablet )
	{
		ourStereoEffect.setSize( window.innerWidth, window.innerHeight );
		console.error("hey, we just did something untested!")
	}
	camera.aspect = Renderer.domElement.width / Renderer.domElement.height;
	camera.updateProjectionMatrix();
}, false );

document.addEventListener( 'keydown', function(event)
{
	//arrow keys
	if( 37 <= event.keyCode && event.keyCode <= 40)
	{
		var turningSpeed = 0.05;
		
		if(event.keyCode === 37)
			camera.rotation.y += turningSpeed;
		if(event.keyCode === 38)
			camera.rotation.x += turningSpeed;
		if(event.keyCode === 39)
			camera.rotation.y -= turningSpeed;
		if(event.keyCode === 40)
			camera.rotation.x -= turningSpeed;
	}
}, false );