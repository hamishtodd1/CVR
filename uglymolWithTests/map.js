//if you update uglymol there may be problems
//note there used to be a "cubicles" thing that was good for searching
//also there was pdbe and dsn9
function Map(url, isDiffMap, blockCenter, blockRadius, isolevel)
{
	var map = new THREE.Object3D();
	var unitCellMesh = null;
	
	var data = null;
	var types = isDiffMap ? ['map_pos', 'map_neg'] : ['map_den'];
	var style = "squarish";
	if(!isolevel) isolevel = isDiffMap ? 3.0 : 1.5; //units of rmsd
	if(!blockRadius) blockRadius = 9; //seems nonlinear?
	if(!blockCenter) blockCenter = [0,0,0];

	var req = new XMLHttpRequest();
	req.open('GET', url, true);
	req.responseType = 'arraybuffer';
	req.onreadystatechange = function ()
	{
		if (req.readyState === 4)
		{
			data = new UM.ElMap();
			data.from_ccp4(req.response, true);

			var unitCellGetter = data.unit_cell.orthogonalize.bind(data.unit_cell);
			unitCellMesh = UM.makeRgbBox(unitCellGetter, {color: {r:1,g:1,b:1}});
			unitCellMesh.visible = false;
			map.add(unitCellMesh);

			extractAndRepresentBlock();
		}
	};
	req.send(null);

	function extractAndRepresentBlock()
	{
		data.extract_block( blockRadius, blockCenter);
		refreshMeshesFromBlock();
	}

	var lineWidth = 1.25;
	var colors = {
		map_den: 0x3362B2,
		map_pos: 0x298029,
		map_neg: 0x8B2E2E,
	}

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
			var isomesh = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
				color: colors[types[i]],
				linewidth: lineWidth,
			}));

			var isolevelMultiplier = 1;
			if( types[i] === 'map_neg' )
			{
				isolevelMultiplier = -1
			}
			var segmentsAndVertices = data.isomesh_in_block( isolevelMultiplier * isolevel, style);
			isomesh.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(segmentsAndVertices.vertices), 3));
			isomesh.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(segmentsAndVertices.segments), 1));
			
			map.add( isomesh );
		}
	}

	map.toggleStyle = function()
	{
		if(style === "marching cubes")
		{
			style = "squarish"
		}
		else
		{
			style = "marching cubes"
		}
		refreshMeshesFromBlock();
	}

	//could be good to make it so that this is movable
	map.toggleUnitCellVisibility = function()
	{
		unitCellMesh.visible = !unitCellMesh.visible;
	}

	map.getIsolevel = function()
	{
		return isolevel;
	}
	map.setIsolevel = function(newIsolevel)
	{
		isolevel = newIsolevel;
		refreshMeshesFromBlock();
	}

	map.getBlockRadius = function()
	{
		return blockRadius;
	}
	map.setBlockRadius = function(newBlockRadius)
	{
		blockRadius = newBlockRadius;
		extractAndRepresentBlock();
	}

	//happens in units of cube?
	map.getBlockCenter = function()
	{
		var copy = [blockCenter[0],blockCenter[1],blockCenter[2]]
		return copy;
	}
	map.setBlockCenter = function(newBlockCenter)
	{
		blockCenter = newBlockCenter;
		extractAndRepresentBlock();
	}

	return map;
}

function removeAndDispose(obj) {
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