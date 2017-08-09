//A live fish

function Render( controllers, bonds, ramachandran) {
	delta_t = ourclock.getDelta();

	inputObject.updateFromAsynchronousInput( controllers,ramachandran );
	
	updateBonds(controllers, bonds, ramachandran);
	
	ramachandran.update(bonds);
	
	OurVREffect.requestAnimationFrame( function(){
		OurVREffect.render( scene, Camera );
		Render( controllers, bonds, ramachandran );
	} );
}

function updateBonds(controllers, bonds, ramachandran)
{
	for(var i = 0; i < 2; i++)
	{
		if( !controllers[i].Gripping )
		{
			if( controllers[i].heldBond !== null )
			{
				var heldBond = controllers[i].heldBond;
				THREE.SceneUtils.detach( heldBond, controllers[i], scene );
				THREE.SceneUtils.attach( heldBond, scene, heldBond.parentBond );
				controllers[i].heldBond = null;
			}
		}
		else
		{
			if( controllers[i].heldBond === null )
			{
				var bondToGrab = null;
				var lowestDistanceSoFar = 99999999;
				for(var j = 0; j < bonds.length; j++)
				{
					var bondCenter = bonds[j].geometry.boundingSphere.center.clone();
					bonds[j].updateMatrixWorld();
					bonds[j].localToWorld( bondCenter );
					var distance = controllers[ i ].position.distanceTo( bondCenter );
					if( distance < lowestDistanceSoFar && distance < bonds[j].geometry.boundingSphere.radius )
					{
						lowestDistanceSoFar = distance;
						bondToGrab = bonds[j];
					}
				}
				
				if( bondToGrab !== null )
				{
					controllers[i].heldBond = bondToGrab;
					THREE.SceneUtils.detach( bondToGrab, bondToGrab.parentBond, scene );
					THREE.SceneUtils.attach( bondToGrab, scene, controllers[i] );
				}
			}
			
			if( controllers[i].heldBond !== null )
			{
				if(controllers[i].heldBond.parentBond !== scene)
				{
					var currentStemPosition = controllers[i].heldBond.parentBond.getEndWorld();
					var intendedStemPosition = new THREE.Vector3();
					controllers[i].heldBond.localToWorld(intendedStemPosition);
					bonds[0].position.add(intendedStemPosition);
					bonds[0].position.sub(currentStemPosition);
					
					console.log(
							controllers[i].heldBond.getPsi() );
					
					ramachandran.repositionIndicatorAndReturnAllowability( 
							controllers[i].heldBond.getTau(), 
							controllers[i].heldBond.getPhi(),
							controllers[i].heldBond.getPsi() );
				}
			}
		}
	}
}