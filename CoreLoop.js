function mainLoop(socket, cursor, models, maps) {
	delta_t = ourclock.getDelta();
	
	if(isMobileOrTablet)
		ourOrientationControls.update();
	
	cursor.updateMatrixWorld();
	camera.updateMatrixWorld();
	
	//highlight
	{
		if(!cursor.children.length)
		{
			for(var i = 0; i < models.length; i++)
			{
				if( models[i].material && models[i].geometry.boundingSphere && models[i].pointInBoundingSphere( cursor.getWorldPosition() ) )
					models[i].material.emissive.r = 1;
				else
					models[i].material.emissive.r = 0;
			}
		}
	}
	
	if( cursor.grabbing )
	{
		if(!cursor.followers.length && !cursor.children.length) //not picked anything up
		{
			for(var i = 0; i < models.length; i++)
			{
				if( !models[i].geometry.boundingSphere || models[i].parent.uuid === cursor.uuid )
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
		 *  
		 * 
		 */
	}
	
	for(var i = 0; i < cursor.followers.length; i++)
	{
		cursor.followers[i].position.sub(cursor.oldWorldPosition);
		cursor.followers[i].position.add(cursor.getWorldPosition());
	}
	
	
	for(var i = 0; i < models.length; i++)
	{
		if( models[i].parent.uuid === cursor.uuid)
			continue;
		
		for( var j = 0; j < maps.length; j++)
		{
			if( models[i].position.distanceTo(maps[j].position) < 0.1 && models[i].quaternion.distanceTo(maps[j].quaternion) < TAU / 16 )
			{
				models[i].position.copy( maps[j].position );
				models[i].quaternion.copy( maps[j].quaternion );
			}
		}
	}
	
	socket.send("loopDone")
	
	requestAnimationFrame( function(){
		mainLoop(socket, cursor, models, maps, ourStereoEffect);
	} );
//	if(isMobileOrTablet)
		ourStereoEffect.render( scene, camera ); //CC
//	else
//		Renderer.render( scene, camera );
}