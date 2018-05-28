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

var Map;
function initMapCreationSystem(visiBox)
{
	var typeColors = {
		map_den: 0x4372D2,
		map_pos: 0x298029,
		map_neg: 0x8B2E2E,
	}

	initUglyMol();
	var w = new Worker("cubeMarchWorker.js");
	w.onmessage = function(event) {  
		console.log("worker returned " + event.data);
	}
	w.postMessage(new Uint32Array([1,1,2]));

	Map = function(arrayBuffer, isDiffMap, isolevel)
	{
		var map = new THREE.Group();
		maps.push(map);
		assemblage.add(map);
		
		//happens in the other thread
		var data = new umData();
		data.from_ccp4(arrayBuffer); //pdbe and dsn9 exist

		//on first message from the other thread
		{
			thingsToBeUpdated.push(map);
			var unitCellMesh = UnitCellMesh( data.unit_cell.orth );
			map.add(unitCellMesh);
			// unitCellMesh.visible = false;
			//TODO make it movable? Move it to visibox?
		}

		var types = isDiffMap ? ['map_pos', 'map_neg'] : ['map_den'];
		if( isolevel === undefined )
		{
			isolevel = isDiffMap ? 3.0 : 1.5; //units of rmsd
		}

		map.addToIsolevel = function(addition)
		{
			for (var i = 0; i < map.children.length; i++)
			{
				if( map.children[i] !== unitCellMesh )
				{
					removeAndDispose(map.children[i]);
				}
			}
			isolevel += addition;
		}

		map.update = function()
		{
			for(var i = 0; i < this.children.length; i++)
			{
				if(this.children[i] === unitCellMesh) continue;

				if(true) //here's where you put checks for the 27-odd meshes we need. Manhattan distance!
				{
					return;
				}
			}

			var blockCenter = visiBox.position.clone()
			assemblage.updateMatrixWorld();
			assemblage.worldToLocal( blockCenter );

			var blockRadius = 2 + Math.ceil(Math.min( visiBox.corners[0].position.x * visiBox.scale.x, visiBox.corners[0].position.y * visiBox.scale.y, visiBox.corners[0].position.z * visiBox.scale.z) / getAngstrom());
			blockRadius = 3;

			for (var i = 0; i < types.length; i++)
			{
				var sigma = types[i] !== 'map_neg'? isolevel:-isolevel; //disp from mean in rmsd

				var geometricPrimitives = getBlockGeometricPrimitives(
					data,
					blockRadius, blockCenter,
					sigma, typeColors[types[i]], false );

				onGeometricPrimitivesReception(geometricPrimitives)
				
				//next you want to parallelize. The "recognizing if and where it needs to be done" system comes after.
				//may want to get rid of one that might already be there
				//will be a bit of a nightmare because of the unNormaled rim thing
			}
		}

		function onGeometricPrimitivesReception(geometricPrimitives)
		{
			if( geometricPrimitives.chickenWire === false)
			{
				var geo = new THREE.Geometry();
				geo.vertices = Array(geometricPrimitives.count);
				var normals = Array(geometricPrimitives.count);
				for ( var i = 0; i < geometricPrimitives.count; i ++ )
				{
					geo.vertices[i] = new THREE.Vector3().fromArray( geometricPrimitives.positionArray, i * 3 );
					normals[i] = new THREE.Vector3().fromArray( geometricPrimitives.normalArray, i * 3 );
				}
				//suuuuurely this is a bit slow and can be turned into buffergeometry? Not hard. If it's still chugging do that.
				geo.faces = Array(geometricPrimitives.count / 3);
				for ( var i = 0, il = geo.faces.length; i < il; i ++ )
				{
					var a = i * 3;
					var b = a + 1;
					var c = a + 2;

					geo.faces[i] = new THREE.Face3( a, b, c, [ normals[ a ], normals[ b ], normals[ c ] ] );
				}
				
				var wireframe = new THREE.Mesh( geo, //could use a slightly fattened squarish to improve
					new THREE.MeshPhongMaterial({
						color: 0xFFFFFF,
						clippingPlanes: visiBox.planes,
						wireframe:true
					}));
				var transparent = new THREE.Mesh( geo,
					new THREE.MeshPhongMaterial({
						color: geometricPrimitives.color, //less white or bluer. Back should be less blue because nitrogen
						clippingPlanes: visiBox.planes,
						transparent:true,
						opacity:0.36
					}));
				var back = new THREE.Mesh( geo,
					new THREE.MeshPhongMaterial({
						color: geometricPrimitives.color,
						clippingPlanes: visiBox.planes,
						side:THREE.BackSide
					}));
				
				var cubicIsomesh = new THREE.Group().add(wireframe,transparent,back)
			}
			else
			{
				var cubicIsomesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
					color: geometricPrimitives.color,
					linewidth: 1.25,
					clippingPlanes: visiBox.planes
				}));
				cubicIsomesh.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(geometricPrimitives.vertices), 3));
				cubicIsomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometricPrimitives.segments), 1));
			}
			
			map.add( cubicIsomesh );
			console.log("one done")
		}

		return map
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
				var xyz /*:Num3*/ = vertices[i].xyz;
				pos[3*i] = xyz[0];
				pos[3*i+1] = xyz[1];
				pos[3*i+2] = xyz[2];
			}
		}
		else
		{
			for (var i = 0; i < vertices.length; i++)
			{
				var v /*:Vector3*/ = vertices[i];
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