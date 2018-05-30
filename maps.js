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

	{
		var individualMeshRadius = 3; //probably not thinking about this the right way
		var totalMeshingRadius = 10;
		var placesToPutMeshes = [];
		for(var i = 0; i < totalMeshingRadius; i++)
		{
			for(var j = 0; j < totalMeshingRadius; j++)
			{
				for(var k = 0; k < totalMeshingRadius; k++)
				{
					var possiblePlace = new THREE.Vector3(i-totalMeshingRadius/2.0,j-totalMeshingRadius/2.0,k-totalMeshingRadius/2.0);
					possiblePlace.multiplyScalar(individualMeshRadius);
					if(possiblePlace.length() < totalMeshingRadius)
					{
						placesToPutMeshes.push(possiblePlace);
					}
				}
			}
		}
		placesToPutMeshes.sort(function (vec1,vec2)
	    {
			return vec1.lengthSq() - vec2.lengthSq();
		});
	}

	Map = function(arrayBuffer, isDiffMap)
	{
		var map = new THREE.Group();
		maps.push(map);
		assemblage.add(map);

		var isolevel = isDiffMap ? 3.0:0.03;//1.5

		var gotten = false;
		map.update = function()
		{
			if(!isDiffMap)
			{
				for(var i = 0; i < controllers.length; i++)
				{
					if( Math.abs( controllers[i].thumbStickAxes[1] ) > 0.1 )
					{
						isolevel += 0.022 * controllers[i].thumbStickAxes[1];
						gotten = false;
					}
				}
			}
			/*
				"recognizing if and where it needs to be done" system:
					may want to get rid of one that might already be there
					will be a bit of a nightmare because of the unNormaled rim thing
					look at all the ones that currently exist, taking their distance from the center, fill in the closest gap
					there may be multiple coming in per frame?

				The "radius" you give to uglymol seems to be interpreted totally fucking randomly

				you have an array of the things and they remember their centers

				So we partition space up into radius-sized, er, cubes. Some region around the center must be full of cubes

				here we're

				Well look you want the visibox... and then some
				w*h*l chunks of "radius" r

				so radius 1 
				-> 1x2x2 boxes for some reason
				-> unNormaled rim, +2 to each = 3x5x5
				-> not boxes but points, +1 to each
				=4x6x6 = 144?
			*/

			// for(var i = 0; i < this.children.length; i++)
			// {
			// 	if(this.children[i] === this.unitCellMesh) continue;

			// 	var block = this.children[i];
			// 	if(block.isolevel !== isolevel)
			// 	{
			// 		//need to send off for another
			// 	}

			// 	//if your manhattan distance to the center is above something
			// 	//take the manhattan vector from your center to the ball's center,
			// 	//and add that x2
			// 	//octahedron...
			// }
			if(gotten) return;
			else gotten = true;

			var center = visiBox.position.clone()
			assemblage.updateMatrixWorld();
			assemblage.worldToLocal( center );

			var radius = 2 + Math.ceil(Math.min( visiBox.corners[0].position.x * visiBox.scale.x, visiBox.corners[0].position.y * visiBox.scale.y, visiBox.corners[0].position.z * visiBox.scale.z) / getAngstrom());
			radius = 2; //may have to be tiny to avoid jerkiness

			this.postMessageConcerningSelf({
				center:			center,
				radius:			radius,
				isolevel:		isolevel,
				chickenWire:	false
			});
		}

		map.postMessageConcerningSelf = function(msg)
		{
			msg.mapIndex = maps.indexOf(this);
			worker.postMessage(msg);
		}
		map.postMessageConcerningSelf({arrayBuffer:arrayBuffer,isDiffMap:isDiffMap});

		map.receiveMessageConcerningSelf = function(msg)
		{
			if(msg.orthogonalMatrix)
			{
				this.unitCellMesh = UnitCellMesh( msg.orthogonalMatrix );
				this.add(this.unitCellMesh);
				this.unitCellMesh.visible = false;
				//TODO make it movable? Move it to visibox?

				thingsToBeUpdated.push(this);
			}

			if( msg.geometricPrimitives )
			{
				var newMesh = geometricPrimitivesToMesh(msg.geometricPrimitives, msg.color);
				newMesh.isolevel = msg.isolevel;
				newMesh.center = msg.center;
				
				map.children.forEach(function(mesh)
				{
					if(mesh !== map.unitCellMesh)
					{
						if( mesh.center.x === newMesh.center.x && mesh.center.y === newMesh.center.y && mesh.center.z === newMesh.center.z )
						{
							removeAndRecursivelyDispose(mesh);
						}
					}
				});
				
				map.add( newMesh );

				//and then don't want to receive another one this frame really
			}
		}
	}

	function geometricPrimitivesToMesh(geometricPrimitives, color)
	{
		if( geometricPrimitives.normalArray )
		{
			//suuuuurely this is a bit slow and can be turned into buffergeometry? Not hard. If it's still chugging do that.

			var geo = new THREE.Geometry();
			geo.vertices = Array(geometricPrimitives.count);
			var normals = Array(geometricPrimitives.count);
			for ( var i = 0; i < geometricPrimitives.count; i ++ )
			{
				geo.vertices[i] = new THREE.Vector3().fromArray( geometricPrimitives.positionArray, i * 3 );
				normals[i] = new THREE.Vector3().fromArray( geometricPrimitives.normalArray, i * 3 );
			}
			geo.faces = Array(geometricPrimitives.count / 3);
			for ( var i = 0, il = geo.faces.length; i < il; i ++ )
			{
				var a = i * 3;
				var b = a + 1;
				var c = a + 2;

				geo.faces[i] = new THREE.Face3( a, b, c, [ normals[ a ], normals[ b ], normals[ c ] ] );
			}

			var b = new THREE.BufferGeometry().fromGeometry(geo)
			console.log(b.attributes.position.array.length)
			
			var wireframe = new THREE.Mesh( geo, //could use a slightly fattened squarish to improve
				new THREE.MeshPhongMaterial({
					color: 0xFFFFFF,
					clippingPlanes: visiBox.planes,
					wireframe:true
				}));
			var transparent = new THREE.Mesh( geo,
				new THREE.MeshPhongMaterial({
					color: color, //less white or bluer. Back should be less blue because nitrogen
					clippingPlanes: visiBox.planes,
					transparent:true,
					opacity:0.36
				}));
			var back = new THREE.Mesh( geo,
				new THREE.MeshPhongMaterial({
					color: color,
					clippingPlanes: visiBox.planes,
					side:THREE.BackSide
				}));
			
			var isomesh = new THREE.Group().add(wireframe,transparent,back)
		}
		else
		{
			var isomesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
				color: color,
				linewidth: 1.25,
				clippingPlanes: visiBox.planes
			}));
			isomesh.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(geometricPrimitives.vertices), 3));
			isomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometricPrimitives.segments), 1));
		}
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