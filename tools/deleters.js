//TODO turning white is a bad way to highlight, they're inside a ball
function initAtomDeleter(holdables, socket, models)
{
	var atomDeleter = new THREE.Object3D();
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0xFF0000, opacity: 0.7}));
	atomDeleter.add( ball );
	ball.geometry.computeBoundingSphere();
	atomDeleter.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Atom deleter" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	atomDeleter.add(label);

	var highlightColor = new THREE.Color(1,1,1);
	
	atomDeleter.update = function()
	{
		if( models.length === 0 )
		{
			return;
		}

		label.visible = this.parent === scene;

		var ourRadiusSq = sq( radius / getAngstrom() );

		if(this.parent !== scene)
		{
			//request is now fixed
			if( this.parent.button1 && !this.parent.button1Old )
			{
				for(var i = 0; i < models.length; i++)
				{
					for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
					{
						if( models[i].atoms[j].selected )
						{
							var msg = {command:"deleteAtom"};
							models[i].atoms[j].assignAtomSpecToMessage( msg );
							socket.send(JSON.stringify(msg));
						}
					}
				}
			}
			else
			{
				for(var i = 0; i < models.length; i++)
				{
					var ourPosition = this.getWorldPosition();
					models[i].updateMatrixWorld();
					models[i].worldToLocal(ourPosition);
					
					for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
					{
						if( models[i].atoms[j].position.distanceToSquared( ourPosition ) < ourRadiusSq )
						{
							if(!models[i].atoms[j].selected)
							{
								models[i].atoms[j].selected = true;
								models[i].geometry.colorAtom(models[i].atoms[j], highlightColor);
							}
						}
						else
						{
							if( models[i].atoms[j].selected )
							{
								models[i].atoms[j].selected = false;
								models[i].geometry.colorAtom( models[i].atoms[j] );
							}
						}
					}
				}
			}
		}
		else
		{
			//probably various things can highlight something, be sure to always do cleanup
			//heh but what if you want a tool in each hand?
			for(var i = 0; i < models.length; i++)
			{
				for(var j = 0, jl = models[i].atoms[j].length; j < jl; j++)
				{
					if( models[i].atoms[j].selected )
					{
						models[i].atoms[j].selected = false;
						models[i].geometry.colorAtom( models[i].atoms[j] );
					}
				}
			}
		}
	}
	
	thingsToBeUpdated.push(atomDeleter);
	holdables.push(atomDeleter)
	scene.add(atomDeleter);
	atomDeleter.ordinaryParent = atomDeleter.parent;

	return atomDeleter;
}

//seems to have a bug if you delete two residues at the same time
function initResidueDeleter(holdables, socket, models)
{
	var residueDeleter = new THREE.Object3D();
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0xFF0000, opacity: 0.7}));
	residueDeleter.add( ball );
	ball.geometry.computeBoundingSphere();
	residueDeleter.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Residue deleter" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	residueDeleter.add(label);

	var highlightColor = new THREE.Color(1,1,1);
	
	residueDeleter.update = function()
	{
		if( models.length === 0 )
		{
			return;
		}

		label.visible = this.parent === scene;

		var ourRadiusSq = sq( radius / getAngstrom() );

		if(this.parent !== scene)
		{
			if( this.parent.button1 && !this.parent.button1Old )
			{
				for(var i = 0; i < models.length; i++)
				{
					for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
					{
						if( models[i].atoms[j].selected )
						{
							for(var k = 0, kl = models[i].atoms.length; k < kl; k++)
							{
								if(models[i].atoms[k].resNo === models[i].atoms[j].resNo)
								{
									//would be more efficient on coot side to delete all at once
									var msg = {command:"deleteAtom"};
									models[i].atoms[k].assignAtomSpecToMessage( msg );
									socket.send(JSON.stringify(msg));
								}
							}
						}
					}
				}
			}
			else
			{
				for(var i = 0; i < models.length; i++)
				{
					var ourPosition = this.getWorldPosition();
					models[i].updateMatrixWorld();
					models[i].worldToLocal(ourPosition);
					
					for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
					{
						if( models[i].atoms[j].position.distanceToSquared( ourPosition ) < ourRadiusSq )
						{
							if(!models[i].atoms[j].selected)
							{
								models[i].atoms[j].selected = true;

								for(var k = 0, kl = models[i].atoms.length; k < kl; k++)
								{
									if(models[i].atoms[k].resNo === models[i].atoms[j].resNo)
									{
										models[i].geometry.colorAtom(models[i].atoms[k], highlightColor);
									}
								}
							}
						}
						else
						{
							if( models[i].atoms[j].selected )
							{
								models[i].atoms[j].selected = false;

								for(var k = 0, kl = models[i].atoms.length; k < kl; k++)
								{
									if(models[i].atoms[k].resNo === models[i].atoms[j].resNo)
									{
										models[i].geometry.colorAtom(models[i].atoms[k]);
									}
								}
							}
						}
					}
				}
			}
		}
		else
		{
			for(var i = 0; i < models.length; i++)
			{
				for(var j = 0, jl = models[i].atoms[j].length; j < jl; j++)
				{
					if( models[i].atoms[j].selected )
					{
						models[i].atoms[j].selected = false;

						for(var k = 0, kl = models[i].atoms.length; k < kl; k++)
						{
							if(models[i].atoms[k].resNo === models[i].atoms[j].resNo)
							{
								models[i].geometry.colorAtom(models[i].atoms[k]);
							}
						}
					}
				}
			}
		}
	}
	
	thingsToBeUpdated.push(residueDeleter);
	holdables.push(residueDeleter)
	scene.add(residueDeleter);
	residueDeleter.ordinaryParent = residueDeleter.parent;

	return residueDeleter;
}