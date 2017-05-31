//A live fish

function Render( controllers, bonds) {
	delta_t = ourclock.getDelta();

	inputObject.updateFromAsynchronousInput( controllers );
	
	updateBonds(controllers, bonds);
	
	ramachandran.update();
	
//	ramachandran.update(bonds);
	
	OurVREffect.requestAnimationFrame( function(){
		OurVREffect.render( scene, Camera );
		Render( controllers, bonds );
	} );
}

function updateBonds(controllers, bonds)
{
	for(var i = 0; i < 2; i++)
	{
		if( !controllers[i].Gripping )
		{
			if( controllers[i].heldBond > -1 )
			{
				if( controllers[i].heldBond === 0 )
				{
					THREE.SceneUtils.detach( bonds[0], controllers[i], scene );
				}
				else
				{
					controllers[i].angleStick.visible = false;
				}
				controllers[i].heldBond = -1;
			}
		}
		else
		{
			if( controllers[i].heldBond === -1 )
			{
				var closestBondSoFar = -1;
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
						closestBondSoFar = j;
					}
				}
				
				if( closestBondSoFar !== -1 )
				{
					if( controllers[1-i].heldBond === -1 )
					{
						controllers[i].heldBond = 0; //You get the non-modifying grip
						console.log("yo")
						THREE.SceneUtils.attach( bonds[0], scene, controllers[i] ); //0 assumed to be root
					}
					else
					{
						controllers[i].heldBond = closestBondSoFar;
						controllers[i].angleStick.visible = true;
						
						controllers[i].lastYRotation = controllers[i].rotation.y;
						controllers[i].lastZRotation = controllers[i].rotation.z;
					}
				}
			}
			
			if( controllers[i].heldBond > -1 )
			{
				/*
				 * When you grab, it creates a rudder
				 * 
				 * psi (and phi) is bond.rotation.y
				 * and call tau bond.rotation.z, so that we think of tau in the xy plane
				 * 
				 * Extras:
				 * 		If none of your parents are held, all your parents get moved too, else, it's just you (and you children)
				 * 
				 * Once again the interesting, possibly difficulty-creating, but probably necessary thing to strive for is changing tau and psi simultaneously 
				 * Probably just: controller rotation.z delta added to z, same with y.
				 * But then again, there was this idea about grabbing the other one.
				 * 
				 * We want to be able to twist twist twist
				 */
				
//				controllers[i].updateMatrixWorld();
//				
//				var rudderTopBeginning = controllers[ i ].position.clone();
//				bonds[ controllers[i].heldBond ].worldToLocal( rudderTopBeginning );
//				var rudderTopEnd = controllers[ i ].currentRudderTip.clone();
//				controllers[ i ].localToWorld( rudderTopEnd );
//				bonds[ controllers[i].heldBond ].worldToLocal( rudderTopEnd );
//				
//				var rudderTop = rudderTopEnd.clone().sub( rudderTopBeginning );
//				var intersectionScalar = -zAxis.dot( rudderTopBeginning );
//				intersectionScalar /= zAxis.dot( rudderTop );
//				if( intersectionScalar < 0 )
//					intersectionScalar *= -1;
//				var intersection = rudderTop.multiplyScalar(intersectionScalar).add(rudderTopBeginning);
//				
//				var angleGettingVersion = new THREE.Vector2( intersection.x, intersection.y );
//				var antiClockwiseAngleFromY = angleGettingVersion.angle();
//				antiClockwiseAngleFromY -= TAU / 4;
//				if( antiClockwiseAngleFromY < 0 )
//					antiClockwiseAngleFromY += TAU;
//				
//				bonds[ controllers[i].heldBond ].rotation.z += antiClockwiseAngleFromY;
//				bonds[ controllers[i].heldBond ].updateMatrixWorld();
//				
//				var currentPsiDirector = zAxis.clone();
//				var intendedPsiDirector = controllers[i].position.clone();
//				bonds[ controllers[i].heldBond ].worldToLocal( intendedPsiDirector );
//				intendedPsiDirector.y = 0;
//				var psiDelta = currentPsiDirector.angleTo( intendedPsiDirector );
//				var directionGetter = new THREE.Vector3().crossVectors( currentPsiDirector, intendedPsiDirector);
//				if( directionGetter.angleTo( yAxis ) > 0.01 )
//					psiDelta *= -1;
//				
//				bonds[ controllers[i].heldBond ].rotation.y += psiDelta;
//				
//				controllers[i].rudder.geometry.vertices[0].set(0,0,0);
//				controllers[i].rudder.geometry.vertices[1].copy( bonds[ controllers[i].heldBond ].getWorldPosition() );
//				controllers[i].worldToLocal( controllers[i].rudder.geometry.vertices[1] );
//				controllers[i].rudder.geometry.vertices[2].copy( bonds[ controllers[i].heldBond ].getEnd() );
//				controllers[i].worldToLocal( controllers[i].rudder.geometry.vertices[2] );
//				controllers[i].rudder.geometry.vertices[3].copy( controllers[i].currentRudderTip );
//				
//				controllers[i].rudder.geometry.verticesNeedUpdate = true;
				
				var yRotationDelta = controllers[i].rotation.y - controllers[i].lastYRotation;
				var zRotationDelta = controllers[i].rotation.z - controllers[i].lastZRotation;
				
				if( Math.abs( yRotationDelta ) > Math.abs( zRotationDelta ) )
					bonds[ controllers[i].heldBond ].rotation.y += yRotationDelta;
				else
					bonds[ controllers[i].heldBond ].rotation.z += zRotationDelta;

				controllers[i].lastYRotation = controllers[i].rotation.y;
				controllers[i].lastZRotation = controllers[i].rotation.z;
			}
		}
	}
}