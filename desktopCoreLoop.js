function desktopLoop(socket, controllers, VRInputSystem, labels, tools) {
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
				modelAndMap.position.multiplyScalar( 1 / modelAndMap.scale.x ); 
				modelAndMap.scale.setScalar( modelAndMap.scale.x * handSeparation / oldHandSeparation );
				modelAndMap.position.multiplyScalar(modelAndMap.scale.x);
			}
		}
		else
		{
			if( modelAndMap.parent === controllers[i] )
			{
				THREE.SceneUtils.detach(modelAndMap, controllers[i], scene );
			}
		}
		
		if( controllers[i].grippingTop )
		{
			for(var j = 0, jl = tools.length; j < jl; i++)
			{
				if( tools[j].parent === scene && tools[j].getWorldPosition().distanceTo( controllers[i].position ) )
				{
					THREE.SceneUtils.attach( modelAndMap, scene, controllers[i] );
				}
			}
		}
		else
		{
			for(var j = 0, jl = tools.length; j < jl; i++)
			{
				if( tools[j].parent === controllers[i])
				{
					THREE.SceneUtils.detach( tools[j], controllers[i], scene );
				}
			}
		}
		
//		console.log(mutator.parent !== controllers[i])
	}
	
	for(var i = 0; i < labels.length; i++)
		labels[i].update();
	
	socket.send("loopDone");
	
	ourVREffect.requestAnimationFrame( function(){
		ourVREffect.render( scene, camera );
		desktopLoop(socket, controllers, VRInputSystem, labels, tools);
	} );
}