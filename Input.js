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
	ourStereoEffect.setSize( window.innerWidth, window.innerHeight );

	camera.aspect = Renderer.domElement.width / Renderer.domElement.height;
	camera.updateProjectionMatrix();
}, false );


//document.addEventListener('touchstart', go_fullscreen_and_init_object, false ); //This gives an error but the below works! Bullshit!
document.addEventListener( 'mousedown', go_fullscreen_and_init_object, false );
function go_fullscreen_and_init_object(event) 
{
	if( THREEx.FullScreen.activated() )
		return;
	
	THREEx.FullScreen.request(Renderer.domElement);
}

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

//	if(event.keyCode === 37)
//		camera.rotation.y += turningSpeed;
//	if(event.keyCode === 38)
//		camera.rotation.x += turningSpeed;
//	if(event.keyCode === 39)
//		camera.rotation.y -= turningSpeed;
//	if(event.keyCode === 40)
//		camera.rotation.x -= turningSpeed;
	
}, false );

//if( window.devicePixelRatio !== 1 )
//{
//	var zoomPercentage = 100 / window.devicePixelRatio;
//	document.body.style.zoom = zoomPercentage.toString() + "%"
//}