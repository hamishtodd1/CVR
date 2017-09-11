function mobileLoop(socket, cursor, models, maps, labels) {
	delta_t = ourclock.getDelta();
	console.log((1/delta_t))

	if(isMobileOrTablet)
		ourOrientationControls.update();
	
	cursor.updateMatrixWorld();
	camera.updateMatrixWorld();
	
	//highlight
//	{
//		if(!cursor.children.length)
//		{
//			for(var i = 0; i < models.length; i++)
//			{
//				if( models[i].atomsBondsMesh.material && models[i].atomsBondsMesh.pointInBoundingSphere( cursor.getWorldPosition() ) )
//					models[i].atomsBondsMesh.material.emissive.b = 0.3;
//				else
//					models[i].atomsBondsMesh.material.emissive.b = 0;
//			}
//		}
//	}
	
	//urgh, come on
	if( cursor.grabbing )
	{
		if(!cursor.followers.length && !cursor.children.length) //not picked anything up
		{
			for(var i = 0; i < models.length; i++)
			{
				if( !models[i].parent || !models[i].boundingSphere || models[i].parent.uuid === cursor.uuid )
					continue;
				
				if( models[i].pointInBoundingSphere(cursor.getWorldPosition() ))
				{	
					cursor.followers.push(models[i]);
					for(var i = 0; i < maps.length; i++)
					{
						THREE.SceneUtils.attach(maps[i], scene, camera );
					}
					break;
				}

				if( !cursor.followers.length && !cursor.children.length )
				{
					for(var i = 0; i < maps.length; i++)
					{
						THREE.SceneUtils.attach(maps[i], scene, cursor );
					}
				}
			}
		}
	}
	else
	{
		cursor.followers.length = 0;
		for(var i = 1; i < camera.children.length; i++) //still want cursor on
		{
			THREE.SceneUtils.detach(camera.children[i], camera, scene );
		}
		for(var i = 0; i < cursor.children.length; i++)
		{
			THREE.SceneUtils.detach(cursor.children[i], cursor, scene );
		}
		
		/* how about taking the head rotation and multiplying them all by some amount?
		 * So you probably are going to the map pivoting around you. In that context, protein staying still maybe makes sense
		 * 
		 */
	}
	
	for(var i = 0; i < cursor.followers.length; i++)
	{
		cursor.followers[i].position.sub(cursor.oldWorldPosition);
		cursor.followers[i].position.add(cursor.getWorldPosition());
	}
	
	for(var i = 0; i < labels.length; i++)
		labels[i].update();
	
	socket.send("loopDone")
	
	requestAnimationFrame( function(){
		mobileLoop(socket, cursor, models, maps,labels);
	} );
	ourStereoEffect.render( scene, camera );
}