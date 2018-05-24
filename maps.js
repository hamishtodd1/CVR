/*
	Could use a single web worker for contouring and loading file in, interactivity remains.
	there is a "cubicles" thing in uglymol's molecules that was good for searching
	TODO turn into proper object so you don't have to repeat the functions

	May need both uglymol and threejs marching cubes systems for different styles
	Except maybe solid is objectively better in VR?

	Does putting the mesh in memory take much more time than calculating it? Probably not but do check

	So you have a worker that constantly, in a separate thread:
		Calculates new contour chunks
		Adds them to the scene
		Removes 
		Unless there's nothing to be done
	Break it up into chunks. When you move it, they don't all have to go

	threejs web worker https://threejs.org/examples/webgl_loader_obj2_run_director.html
*/

function Map(arrayBuffer, isDiffMap, visiBox, isolevel)
{
	var w = new Worker("cubeMarchWorker.js");
	w.onmessage = function(event) {  
		console.log("worker returned " + event.data);
	}
	w.postMessage(new Uint32Array([1,1,2]));


	//------------

	var colors = {
		map_den: 0x4372D2,
		map_pos: 0x298029,
		map_neg: 0x8B2E2E,
	}

	var map = new THREE.Object3D();
	
	var data = new UM.ElMap();
	data.from_ccp4(arrayBuffer); //pdbe and dsn9 exist

	var types = isDiffMap ? ['map_pos', 'map_neg'] : ['map_den'];
	var style = "solid"; // "marching cubes", "solid"
	if(!isolevel) isolevel = isDiffMap ? 3.0 : 1.5; //units of rmsd

	map.extractAndRepresentBlock = function()
	{
		var blockCenterVector = visiBox.position.clone()

		assemblage.updateMatrixWorld();
		assemblage.worldToLocal( blockCenterVector );

		var blockRadius = 2 + Math.ceil(Math.min( visiBox.corners[0].position.x * visiBox.scale.x, visiBox.corners[0].position.y * visiBox.scale.y, visiBox.corners[0].position.z * visiBox.scale.z) / getAngstrom());
		blockRadius = 3;

		data.extract_block( blockRadius, [ blockCenterVector.x, blockCenterVector.y, blockCenterVector.z ] );
		refreshMeshesFromBlock();
	}
	map.extractAndRepresentBlock();

	function refreshMeshesFromBlock()
	{
		for (var i = 0; i < map.children.length; i++)
		{
			if( map.children[i] !== unitCellMesh )
			{
				map.children[i].geometry.dispose();
				map.children[i].material.dispose();
			}
		}

		for (var i = 0; i < types.length; i += 1)
		{
			var isolevelMultiplier = 1;
			if( types[i] === 'map_neg' )
			{
				isolevelMultiplier = -1
			}

			var isomesh = isomeshInBlock( data,
				isolevelMultiplier * isolevel,
				colors[types[i]],
				visiBox.planes,
				"wireframe" );
			map.add( isomesh );
		}
	}

	map.addToIsolevel = function(addition)
	{
		isolevel += addition;
		//TODO better way to check
		if(map.children.length === 0)
		{
			console.log("this map should not exist if there's nothing to refresh. Deal with it if there's a crash")
		}
		refreshMeshesFromBlock();
	}

	{
		var unitCellMesh = getUnitCellMesh( data.unit_cell.orth );
		// unitCellMesh.visible = false;
		map.add(unitCellMesh);
		unitCellMesh.scale.multiplyScalar(0.2)
		//TOD make it movable?
		map.toggleUnitCellVisibility = function()
		{
			unitCellMesh.visible = !unitCellMesh.visible;
		}
	}

	return map;
}

function getUnitCellMesh(orthogonalMatrix)
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

	var colors = new Float32Array([ 1,0,0,1,0.66667,0,0,1,0,0.66667,1,0,0,0,1,0,0.666667,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1 ]);
	geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

	return new THREE.LineSegments( geometry, new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors, linewidth:1}) );
}

function isomeshInBlock(elMap, sigma, color, clippingPlanes, method)
{
	var abs_level = sigma * elMap.stats.rms + elMap.stats.mean;

	if(method === "solid")
	{
		var geo = solidMarchingCubes(elMap.block._size[0],elMap.block._size[1],elMap.block._size[2],
			elMap.block._values, elMap.block._points, abs_level);
		var isomesh = new THREE.Group().add(
			new THREE.Mesh( geo,
				new THREE.MeshPhongMaterial({
					color: color, //less white or bluer. Back should be less blue because nitrogen
					clippingPlanes: clippingPlanes,
					transparent:true,
					opacity:0.36
				})),
			new THREE.Mesh( geo,
				new THREE.MeshPhongMaterial({
					color: color,
					clippingPlanes: clippingPlanes,
					side:THREE.BackSide
				})),
			new THREE.Mesh( geo, //could use a slightly fattened squarish to improve
				new THREE.MeshPhongMaterial({
					color: 0xFFFFFF,
					clippingPlanes: clippingPlanes,
					wireframe:true
				}))
			)
	}
	else
	{
		var isomesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
			color: color,
			linewidth: 1.25,
			clippingPlanes: clippingPlanes
		}));
		var geometricPrimitives = marchingCubes(elMap.block._size[0],elMap.block._size[1],elMap.block._size[2],
			elMap.block._values, elMap.block._points, abs_level, method);
		
		isomesh.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(geometricPrimitives.vertices), 3));
		isomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometricPrimitives.segments), 1));

		// isomesh.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array([0.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]), 3));
		// isomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometricPrimitives.segments), 1));
	}

	return isomesh;
};