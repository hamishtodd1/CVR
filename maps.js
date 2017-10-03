function loadMap(mapURL, mapArray,  pairIndex)
{
	new THREE.FileLoader().load( mapURL,
		function ( scalarFieldFile )
		{
			/*
			 * Kinda feels like this one has some shader stuff https://webglsamples.org/blob/blob.html
			 * Didn't volume ray casting allow you to render a surface without actually making the mesh? Wasn't that Dan's thing?
			 * 		One way of doing that: all voxels inside surface have opacity 1, outside 0. But if we're getting an odd numbered pixel then it's all opacity 0
			 * 		First try to do just that cross hatching, red and blue, so you know how to do fragment shaders
			 * 		Likely a terrible idea, you can't get your molecules in it
			 * Major problem that geometry shaders don't exist in webgl
			 * This one has workers and is threejs but is from 2009 http://philogb.github.io/blog/2010/12/10/animating-isosurfaces-with-webgl-and-workers/#result
			 * 
			 */
			var scalarFieldCommas = scalarFieldFile.replace(/\s+/g,",");
			var mapData = 
			{
				array: new Float32Array( JSON.parse("[" + scalarFieldCommas.substr(1,scalarFieldCommas.length-2) + "]") ),  //substring to remove start and end commas. -2 instead of -1 because javascript
				sizeX: 53,
				sizeY: 53,
				sizeZ: 53,
				gridSamplingX:168,
				gridSamplingY:200,
				gridSamplingZ:100,
				cellDimensionX: 64.897,
				cellDimensionY: 78.323,
				cellDimensionZ: 38.792,
				startingI: 125, //Note!!! this is swapped from Paul's email!
				startingJ: -10,
				startingK: 4,
				meanDensity: 0,
				maxDensity: 2.13897
				/* Map mode ........................................    2
		           Start and stop points on columns, rows, sections    33   51   48   66   46   62
		           Grid sampling on x, y, z ........................  256  256  360
		           Cell dimensions .................................  142.2 142.2 200.41 90.0 90.0 120.0
		           Fast, medium, slow axes .........................    Y    X    Z
		           Space-group .....................................    1
		           
		           scalarField: 19,19,17
		           scalarFieldLarge: 103,101,26
		           
		           Number of columns, rows, sections ...............   53 53   53
		           Start and stop points on columns, rows, sections   -10 42  125  177    4   56
		           Grid sampling on x, y, z ........................  168 200  100
		           Cell dimensions ................................. 64.8970    78.3230    38.7920    90.0000    90.0000    90.0000
		           58, 6, 11
		           
		           "the thing to add to uvw is 125,-10,4
		           uvw=0,0,0
				 */
			}
//			bottom left will be at molecule coordinates: 125*64.87/168, -10*78.323/200, 4*38.792/100
			if( mapData.array.length !== mapData.sizeX*mapData.sizeY*mapData.sizeZ )
				console.error("you may need to change map metadata")
			
			var cubeMarchingSystem = CubeMarchingSystem();
			modelAndMap.map = cubeMarchingSystem.createMesh(mapData);
			if(modelAndMap.model)
				modelAndMap.map.position.copy(modelAndMap.model.position)
			modelAndMap.add(modelAndMap.map)
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load PDB" ); }
	);
}