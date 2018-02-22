/*
	Could use a single web worker for contouring and loading file in, interactivity remains.
	there is a "cubicles" thing in uglymol's molecules that was good for searching
	TODO turn into proper object so you don't have to repeat the functions
*/

function Map(arrayBuffer, isDiffMap, visiBox, blockRadius, isolevel)
{
	var lineWidth = 1.25;
	var colors = {
		map_den: 0x4372D2,
		map_pos: 0x298029,
		map_neg: 0x8B2E2E,
	}

	var map = new THREE.Object3D();
	var unitCellMesh = null;
	
	var data = new UM.ElMap();
	data.from_ccp4(arrayBuffer, true); //pdbe and dsn9 exist
	var unitCellGetter = data.unit_cell.orthogonalize.bind(data.unit_cell);
	unitCellMesh = UM.makeRgbBox(unitCellGetter, {color: {r:1,g:1,b:1}});
	unitCellMesh.visible = false;
	map.add(unitCellMesh);
	var types = isDiffMap ? ['map_pos', 'map_neg'] : ['map_den'];
	var style = "squarish"; // "marching cubes"
	if(!isolevel) isolevel = isDiffMap ? 3.0 : 1.5; //units of rmsd
	
	function toggleUnitCell()
	{
		unitCellMesh.visible = !unitCellMesh.visible;
	}

	map.extractAndRepresentBlock = function()
	{
		var blockCenterVector = visiBox.position.clone()

		assemblage.updateMatrixWorld();
		assemblage.worldToLocal( blockCenterVector );

		var blockRadius = 2 + Math.ceil(Math.min( visiBox.corners[0].position.x * visiBox.scale.x, visiBox.corners[0].position.y * visiBox.scale.y, visiBox.corners[0].position.z * visiBox.scale.z) / getAngstrom());

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
			var isomesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
				color: colors[types[i]],
				linewidth: lineWidth,
				clippingPlanes: visiBox.planes
			}));

			var isolevelMultiplier = 1;
			if( types[i] === 'map_neg' )
			{
				isolevelMultiplier = -1
			}
			var geometricPrimitives = data.isomesh_in_block( isolevelMultiplier * isolevel, style);
			isomesh.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(geometricPrimitives.vertices), 3));
			// isomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometricPrimitives.segments), 1));
			isomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometricPrimitives.faces), 1));
			
			map.add( isomesh );
		}
	}

	//could be good to make it so that this is movable
	map.toggleUnitCellVisibility = function()
	{
		unitCellMesh.visible = !unitCellMesh.visible;
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
	return map;
}