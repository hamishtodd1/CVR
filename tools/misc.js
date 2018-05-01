//environment distances is a bunch of spheres you can stick in there (and leave). They stay in model space


function initEnvironmentDistance()
{
	var environmentDistancer = new THREE.Object3D();
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0xFF69B4, opacity: 0.4}));
	environmentDistancer.add( ball );
	ball.geometry.computeBoundingSphere();
	environmentDistancer.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Environment Distances" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	environmentDistancer.add(label);

	var connectionMeshes = [];
	
	// environmentDistancer.onGrab = function(controller)
	// {
	// 	this.scale.setScalar(1);

	// 	//TODO have one seed many?
	// 	// var newEnvironmentDistancer = new THREE.Mesh(environmentDistancer.geometry, environmentDistancer.material);
	// 	// newEnvironmentDistancer.label = new THREE.Mesh(label.geometry,label.material);
	// 	// scene.add(newEnvironmentDistancer);
	// 	// newEnvironmentDistancer.position.copy(environmentDistancer.position);
	// 	// newEnvironmentDistancer.quaternion.copy(environmentDistancer.quaternion);
	// 	// establishAttachment(newEnvironmentDistancer, controller);

	// 	// newEnvironmentDistancer.update = updateEnvironmentDistancer;

	// 	// holdables.push(newEnvironmentDistancer)
	// 	// thingsToBeUpdated.push(newEnvironmentDistancer);
	// 	// newEnvironmentDistancer.ordinaryParent = newEnvironmentDistancer.parent;
	// }

	var mostRecentlyRequestedResNo = null;

	function updateEnvironmentDistancer()
	{
		var localRadiusSq = sq( radius / getAngstrom() );

		label.visible = this.parent === scene || this.parent === assemblage;

		//label showing length
		//might be nice to also show/otherwise make aware of some typical lengths?
		if(this.parent !== scene && this.parent !== this.ordinaryParent)
		{
			var closestAtom = null;
			var closestAtomDistSq = Infinity;
			for(var i = 0; i < models.length; i++)
			{
				var ourPosition = new THREE.Vector3();
				this.getWorldPosition(ourPosition);
				models[i].updateMatrixWorld();
				models[i].worldToLocal(ourPosition);
				
				for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
				{
					var distanceSq = ourPosition.distanceToSquared(models[i].atoms[j].position);
					if(	distanceSq < localRadiusSq && distanceSq < closestAtomDistSq)
					{
						closestAtom = models[i].atoms[j];
						closestAtomDistSq = ourPosition.distanceToSquared(models[i].atoms[j].position);
					}
				}
			}


			var closestAtomResNo = null;
			if(closestAtom !== null)
			{
				closestAtomResNo = closestAtom.resNo;

				if(mostRecentlyRequestedResNo !== closestAtomResNo )
				{
					var msg = { command: "getEnvironmentDistances" };
					closestAtom.assignAtomSpecToObject( msg );
					socket.send( JSON.stringify( msg ) );
				}
			}

			if( mostRecentlyRequestedResNo !== closestAtomResNo )
			{
				for(var i = connectionMeshes.length-1; i >= 0; i--)
				{
					assemblage.remove( connectionMeshes[i] );
					// connectionMeshes[i].geometry.dispose();
					// connectionMeshes[i].dispose();
					removeSingleElementFromArray(connectionMeshes, connectionMeshes[i])
				}
				mostRecentlyRequestedResNo = closestAtomResNo;
				connectionMeshes.length = 0;
			}
		}
	}
	environmentDistancer.update = updateEnvironmentDistancer;

	//maybe reversed
	var materials = [
		new THREE.MeshLambertMaterial({color:new THREE.Color(0.7,0.7,0.2)}),
		new THREE.MeshLambertMaterial({color:new THREE.Color(0.7,0.2,0.7)})];

	socket.commandReactions["environmentDistances"] = function(msg)
	{
		var model = getModelWithImol( msg.imol );
		var connectionsByColor = [ msg.data[1][0], msg.data[1][1] ]
		for(var i = 0; i < connectionsByColor.length; i++)
		{
			for(var j = 0; j < connectionsByColor[i].length; j++)
			{
				//getting some weirdness, are the indices definitely right?
				var connection = connectionsByColor[i][j];
				
				var start = new THREE.Vector3().fromArray(connection[0]);
				var end = new THREE.Vector3().fromArray(connection[1])
				var length = start.distanceTo(end);

				var numDots = Math.floor(length* 3);
				var connectionMesh = new THREE.Mesh( DottedLineGeometry(numDots,0.07), materials[i]);
				var newY = end.clone().sub(start).multiplyScalar(0.5 / numDots);
				redirectCylinder(connectionMesh, start, newY );
				assemblage.add(connectionMesh);
				connectionMeshes.push(connectionMesh);
			}
		}
	}

	// environmentDistancer.onLetGo()
	// {
	// 	this.scale.setScalar(1/getAngstrom());
	// }
	
	holdables.push(environmentDistancer)
	thingsToBeUpdated.push(environmentDistancer);
	scene.add(environmentDistancer);
	environmentDistancer.ordinaryParent = assemblage; //note discrepancy

	return environmentDistancer;
}

function initAtomLabeller()
{
	var atomLabeller = new THREE.Object3D();
	
	var radius = 0.05;
	var ball = new THREE.Mesh(new THREE.EfficientSphereBufferGeometry(radius), new THREE.MeshLambertMaterial({transparent:true,color:0x0000FF, opacity: 0.7}));
	atomLabeller.add( ball );
	ball.geometry.computeBoundingSphere();
	atomLabeller.boundingSphere = ball.geometry.boundingSphere;

	var label = makeTextSign( "Atom Labeller" );
	label.position.z = radius;
	label.scale.setScalar(radius/3)
	atomLabeller.add(label);
	
	atomLabeller.update = function()
	{
		label.visible = this.parent === scene;

		var ourRadiusSq = sq( radius / getAngstrom() );

		if(this.parent !== scene)
		{
			for(var i = 0; i < models.length; i++)
			{
				var ourPosition = this.getWorldPosition();
				models[i].updateMatrixWorld();
				models[i].worldToLocal(ourPosition);
				
				for(var j = 0, jl = models[i].atoms.length; j < jl; j++)
				{
					var labelVisibility = models[i].atoms[j].position.distanceToSquared( ourPosition ) < ourRadiusSq;
					models[i].atoms[j].setLabelVisibility(labelVisibility);
				}
			}
		}
	}
	
	thingsToBeUpdated.push(atomLabeller);
	holdables.push(atomLabeller)
	scene.add(atomLabeller);
	atomLabeller.ordinaryParent = atomLabeller.parent;

	return atomLabeller;
}



function initPointer()
{
	var pointerRadius = 0.03;
	var pointer = new THREE.Mesh(
		new THREE.CylinderBufferGeometry( pointerRadius,pointerRadius, pointerRadius * 4,32 ),
		new THREE.MeshPhongMaterial({color:0x00FFFF })
	);
	pointer.geometry.computeBoundingSphere();
	pointer.boundingSphere = pointer.geometry.boundingSphere;

	var laserRadius = 0.001;
	var laser = new THREE.Mesh(
		new THREE.CylinderBufferGeometryUncentered( laserRadius, 2), 
		new THREE.MeshBasicMaterial({color:0xFF0000, /*transparent:true,opacity:0.4*/}) 
	);
	pointer.add(laser);
	laser.visible = false;

	var label = makeTextSign( "pointer" );
	label.position.z = pointerRadius;
	label.rotation.z = -TAU/4;
	label.scale.setScalar(pointerRadius)
	pointer.add(label);
	pointer.rotation.z = TAU/4;

	pointer.update = function()
	{
		label.visible = this.parent === scene;
		
		if( this.parent !== scene )
		{
			laser.visible = this.parent.button1;
		}
		else
		{
			laser.visible = false;
		}
	}

	thingsToBeUpdated.push(pointer);
	holdables.push(pointer);
	pointer.ordinaryParent = scene;

	pointer.position.set(0,-0.4,0.1)
	scene.add(pointer);
	return pointer;
}