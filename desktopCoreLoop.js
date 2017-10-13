function desktopLoop(socket, controllers, VRInputSystem, labels) {
	delta_t = ourClock.getDelta();
	
//	VRInputSystem.update( socket);
	oldHandSeparation = handSeparation;
	handSeparation = controllers[0].position.distanceTo( controllers[1].position );

	for(var i = 0; i < controllers.length; i++)
	{
		if( controllers[i].grippingSide )
		{
			if( modelAndMap.parent === scene )
			{
				THREE.SceneUtils.attach( modelAndMap, scene, controllers[i] );
			}
			if( modelAndMap.parent === controllers[1-i] )
			{
				//it's being held in the other one
				modelAndMap.scale.setScalar( modelAndMap.scale.x * handSeparation / oldHandSeparation );
			}
		}
		else
		{
			if( modelAndMap.parent === controllers[i] )
			{
				THREE.SceneUtils.detach(modelAndMap, controllers[i], scene );
			}
		}
		
//		console.log(mutator.parent !== controllers[i])
	}
	
//	if( controllers[i].grippingTop && mutator.parent !== controllers[i] )
//	{
//		controllers[i].add(mutator)
//		console.log(mutator.parent !== controllers[i])
//		mutator.position.set(0,0,0)
//	}
//	if( !controllers[i].grippingTop && mutator.parent === controllers[i] )
//	{
//		controllers[i].remove(mutator)
//		console.log("ya")
//	}
	
	for(var i = 0; i < labels.length; i++)
		labels[i].update();
	
	socket.send("loopDone");
	
	ourVREffect.requestAnimationFrame( function(){
		ourVREffect.render( scene, camera );
		desktopLoop(socket, controllers, VRInputSystem, labels);
	} );
}