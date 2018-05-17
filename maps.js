/*
	Could use a single web worker for contouring and loading file in, interactivity remains.
	there is a "cubicles" thing in uglymol's molecules that was good for searching
	TODO turn into proper object so you don't have to repeat the functions

	May need both uglymol and threejs marching cubes systems for different styles
	Except maybe solid is objectively better in VR?

	Does putting the mesh in memory take much more time than calculating it? Probably not but do check

	So you have a worker that constantly:
		Calculates new contour chunks
		Adds them to the scene
		Removes
		Unless there's nothing to be done
	Break it up into chunks. When you move it, they don't all have to go

	threejs web worker https://threejs.org/examples/webgl_loader_obj2_run_director.html
*/

function Map(arrayBuffer, isDiffMap, visiBox, isolevel)
{
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
		blockRadius = clamp(blockRadius,2,10);

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
				removeAndDispose(map.children[i]);
			}
		}

		for (var i = 0; i < types.length; i += 1)
		{
			var isolevelMultiplier = 1;
			if( types[i] === 'map_neg' )
			{
				isolevelMultiplier = -1
			}

			var isomesh = data.isomesh_in_block( 
				isolevelMultiplier * isolevel,
				colors[types[i]],
				visiBox.planes,
				style );
			map.add( isomesh );
		}
	}

	map.addToIsolevel = function(addition)
	{
		isolevel += addition;
		if(map.children.length === 0)
		{
			return;
		}
		refreshMeshesFromBlock();
	}

	function removeAndDispose(obj)
	{
		obj.parent.remove(obj);
		if (obj.geometry) { obj.geometry.dispose(); }
		if (obj.material)
		{
			if (obj.material.uniforms && obj.material.uniforms.map) 
			{
				obj.material.uniforms.map.value.dispose();
			}
			obj.material.dispose();
		}
		for (var i = 0, list = obj.children; i < list.length; i += 1)
		{
			var o = list[i];

			removeAndDispose(o);
		}
	}

	{
		var unitCellMesh = data.unit_cell.getMesh();
		unitCellMesh.visible = false;
		map.add(unitCellMesh);
		//could be good to make it so that it is movable
		map.toggleUnitCellVisibility = function()
		{
			unitCellMesh.visible = !unitCellMesh.visible;
		}
	}

	return map;
}