'use strict';
/*
	Could use a single web worker for contouring and loading file in, interactivity remains.
	there is a "cubicles" thing in uglymol's molecules that was good for searching
	TODO turn into proper object so you don't have to repeat the functions

	May need both uglymol and threejs marching cubes systems for different styles
	Except maybe solid is objectively better in VR?

	Does putting the mesh in memory take much more time than calculating it? Probably not but do check

	So you have a worker that constantly, in a separate thread:
		Extracts blocks
		Calculates new contour chunks
		Adds them to the scene
		Removes 
		Unless there's nothing to be done
		Break it up into chunks. When you move it, they don't all have to go

	if you increase contour level it all has to go

	threejs web worker https://threejs.org/examples/webgl_loader_obj2_run_director.html

	bug: red difference map normals need to be reversed. 
	Well actually all normals EXCEPT red difference map normals need to be reversed and backside needs to be removed
*/

var starProcessingMapData;
function initMapCreationSystem(visiBox)
{
	var worker = new Worker("mapExtractionAndMeshing.js");
	worker.onmessage = function(event)
	{
		maps[ event.data.mapIndex ].receiveMessageConcerningSelf( event.data );
	}

	var numMeshesBeingWorkedOn = 0;
	var blockRadius = 4;

	{
		var offsets = [];
		for(var i = -1; i <= 1; i++)
		{
			for(var j = -1; j <= 1; j++)
			{
				for(var k = -1; k <= 1; k++)
				{
					offsets.push(new THREE.Vector3(i,j,k).multiplyScalar(blockRadius));
				}
			}
		}
		offsets.sort(function (vec1,vec2)
	    {
			return vec1.lengthSq() - vec2.lengthSq();
		});
	}

	Map = function(arrayBuffer, isDiffMap)
	{
		var map = new THREE.Group();
		maps.push(map);
		assemblage.add(map);

		var isolevel = isDiffMap ? 3.0:1.5

		var gotten = false;
		map.update = function()
		{
			/*
				Each frame, decide on a value point that is the center
				Snap that to grid points the size of our 27 things (yeah not ideal but hey)
			*/

			var centralPointSnappedToBlockSize = visiBox.position.clone();
			assemblage.updateMatrixWorld();
			assemblage.worldToLocal( centralPointSnappedToBlockSize );
			//now to snap to, erm...

			centralPointSnappedToBlockSize.set(0,0,0); //for now!

			for(var i = 0, il = 2; i < il && numMeshesBeingWorkedOn < 2; i++)
			{
				var pointToCheckFor = centralPointSnappedToBlockSize.clone().add(offsets[i]);
				var meshInPlace = false;
				for(var j = 0; j < this.children.length; j++)
				{
					var block = this.children[j];
					if( block === this.unitCellMesh) continue;

					if( pointToCheckFor.equals(block.center))
					{
						if( block.isolevel === isolevel )
						{
							meshInPlace = true;

							// if( offset[i].equals(zeroVector) && !isDiffMap ) //you have seen current isolevel
							// {
							// 	for(var i = 0; i < controllers.length; i++)
							// 	{
							// 		if( Math.abs( controllers[i].thumbStickAxes[1] ) > 0.1 )
							// 		{
							// 			isolevel += 0.06 * controllers[i].thumbStickAxes[1];
							// 			//TODO this is limited by "framerate"
							// 			meshInPlace = false;
							// 		}
							// 	}
							// }
						}
						break;
					}
				}
				if(!meshInPlace)
				{
					this.postMessageConcerningSelf({
						isolevel:isolevel,
						blockRadius:blockRadius,
						chickenWire:false,
						center:pointToCheckFor
					});

					numMeshesBeingWorkedOn++;
					//hopefully you can't send off for the same one twice because of numMeshesBeingWorkedON
				}
			}
		}

		map.receiveMessageConcerningSelf = function(msg)
		{
			if(msg.orthogonalMatrix)
			{
				this.unitCellMesh = UnitCellMesh( msg.orthogonalMatrix );
				this.add(this.unitCellMesh);
				this.unitCellMesh.visible = false;
				//TODO make it movable? Keep it centered in visibox?

				thingsToBeUpdated.push(this);
			}

			if( msg.isolevel )
			{
				console.log("yo")
				numMeshesBeingWorkedOn--;
				if(msg.isolevel === isolevel)
				{
					var newBlock = geometricPrimitivesToMesh(msg);
					newBlock.isolevel = msg.isolevel;
					newBlock.center = msg.center;
					this.add( newBlock );
					console.log(newBlock.isolevel,newBlock.center)
					
					var blockThatIsFurthestFromCenter = null;
					var furthestDistSq = -1;
					var centralPointSnappedToBlockSize = new THREE.Vector3(); //something involving visiBox.position
					for(var i = 0; i < this.children.length; i++)
					{
						var block = this.children[i];
						if( block === this.unitCellMesh || block === newBlock) continue;
						
						if( block.center.x === newBlock.center.x && block.center.y === newBlock.center.y && block.center.z === newBlock.center.z )
						{
							removeAndRecursivelyDispose(block);
							return;
						}

						if( centralPointSnappedToBlockSize.distanceToSquared(block.center) > furthestDistSq )
						{
							blockThatIsFurthestFromCenter = block;
							furthestDistSq = centralPointSnappedToBlockSize.distanceToSquared(block.center);
						}
					}

					if( this.children.length > 27 && blockThatIsFurthestFromCenter)
					{
						removeAndRecursivelyDispose(blockThatIsFurthestFromCenter);
					}
				}
			}
		}

		map.postMessageConcerningSelf = function(msg)
		{
			msg.mapIndex = maps.indexOf(this);
			worker.postMessage(msg);
		}

		map.postMessageConcerningSelf({arrayBuffer:arrayBuffer,isDiffMap:isDiffMap});
	}

	function geometricPrimitivesToMesh(msg)
	{
		if( !msg.nonWireframeGeometricPrimitives )
		{
			return wireframeIsomeshFromGeometricPrimitives(msg.wireframeGeometricPrimitives)
		}
		else
		{
			var geo = new THREE.BufferGeometry();
			geo.addAttribute( 'position',	new THREE.BufferAttribute( msg.nonWireframeGeometricPrimitives.positionArray, 3 ) );
			geo.addAttribute( 'normal',		new THREE.BufferAttribute( msg.nonWireframeGeometricPrimitives.normalArray, 3 ) );
			
			var transparent = new THREE.Mesh( geo,
				new THREE.MeshPhongMaterial({
					color: msg.color, //less white or bluer. Back should be less blue because nitrogen
					clippingPlanes: visiBox.planes,
					transparent:true,
					opacity:0.36
				}));
			var back = new THREE.Mesh( geo,
				new THREE.MeshPhongMaterial({
					color: msg.color,
					clippingPlanes: visiBox.planes,
					side:THREE.BackSide
				}));

			if(msg.wireframeGeometricPrimitives)
			{
				//super high quality
				var wireframe = wireframeIsomeshFromGeometricPrimitives(msg.wireframeGeometricPrimitives);
			}
			else
			{
				var wireframe = new THREE.LineSegments( new THREE.WireframeGeometry( geo ),
					new THREE.LineBasicMaterial({
						clippingPlanes: visiBox.planes
					}));
			}
			
			return new THREE.Group().add(wireframe,transparent,back)
		}
	}

	function wireframeIsomeshFromGeometricPrimitives(geometricPrimitives)
	{
		var isomesh = new THREE.LineSegments(new THREE.BufferGeometry(),
			new THREE.LineBasicMaterial({
				color: 0xFFFFFF,
				linewidth: 1.25,
				clippingPlanes: visiBox.planes
			}));
		isomesh.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(geometricPrimitives.vertices), 3));
		isomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometricPrimitives.segments), 1));
		return isomesh;
	}

	function UnitCellMesh(orthogonalMatrix)
	{
		var CUBE_EDGES = [	[0, 0, 0], [1, 0, 0],
							[0, 0, 0], [0, 1, 0],
							[0, 0, 0], [0, 0, 1],
							[1, 0, 0], [1, 1, 0],
							[1, 0, 0], [1, 0, 1],
							[0, 1, 0], [1, 1, 0],
							[0, 1, 0], [0, 1, 1],
							[0, 0, 1], [1, 0, 1],
							[0, 0, 1], [0, 1, 1],
							[1, 0, 1], [1, 1, 1],
							[1, 1, 0], [1, 1, 1],
							[0, 1, 1], [1, 1, 1] ];
		var vertices = CUBE_EDGES.map(function (a)
		{
			return {
				xyz: [  orthogonalMatrix[0] * a[0]  + orthogonalMatrix[1] * a[1]  + orthogonalMatrix[2] * a[2],
					  /*orthogonalMatrix[3] * a[0]*/+ orthogonalMatrix[4] * a[1]  + orthogonalMatrix[5] * a[2],
					  /*orthogonalMatrix[6] * a[0]  + orthogonalMatrix[7] * a[1]*/+ orthogonalMatrix[8] * a[2]]
			};
		});

		var geometry = new THREE.BufferGeometry();
		var pos = new Float32Array(vertices.length * 3);
		if (vertices && vertices[0].xyz)
		{
			for (var i = 0; i < vertices.length; i++)
			{
				var xyz = vertices[i].xyz;
				pos[3*i] = xyz[0];
				pos[3*i+1] = xyz[1];
				pos[3*i+2] = xyz[2];
			}
		}
		else
		{
			for (var i = 0; i < vertices.length; i++)
			{
				var v = vertices[i];
				pos[3*i] = v.x;
				pos[3*i+1] = v.y;
				pos[3*i+2] = v.z;
			}
		}
		geometry.addAttribute('position', new THREE.BufferAttribute(pos, 3));

		var colors = new Float32Array([ 1,0,0,1,0.66667,0,0,1,0,0.66667,1,0,0,0,1,0,0.66667,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1 ]);
		geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

		return new THREE.LineSegments( geometry, new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors, linewidth:1}) );
	}
}