'use strict';
/*
	Man this was dumb. The center of a cube? madman.
	It was based on the idea that
		if the zoom level is right
		you can be moving smoothly in any 3D direction
		and you'll never see uncontoured molecule

	Better: for each cube
		test its distance from the central spindle
		We test whether it is in the visiBox
		We test which of 9 z-penetrating columns it is in
		If it's not textured we request it
		You spiral out from the middle in the subthread and just send what you've got

	TODO
		there is a "cubicles" thing in uglymol's molecules that was good for searching?
		When you have multiple maps, urgh, only want them one at a time too
*/

function initMapCreationSystem()
{
	camera.rotation.x = -0.5

	let worker = new Worker("mapExtractionAndMeshing.js")

	worker.onmessage = function(event)
	{
		maps[ event.data.mapIndex ].receiveMessageConcerningSelf( event.data );
	}

	Map = function(arrayBuffer)
	{
		let map = new THREE.Group();
		maps.push(map);
		assemblage.add(map);

		let blockRadius = 11
		let blocks = Array(27*2)

		let isDiffMap = true
		map.toggleDiffMap = function()
		{
			isDiffMap = !isDiffMap
			isolevel = isDiffMap ? 3.0 : 1.5
		}

		//note that this is not the "absolute" isolevel of the data
		let isolevel = isDiffMap ? 3.0 : 1.5;

		let latestUserCenterOnGrid = [0,0,0];
		let waitingOnResponse = false;
		let mostRecentBlockIsolevel = Infinity; //we care because there might be some recent arrivals whose isolevel is better than most recent

		let cubesPerBlock = (blockRadius*2)*(blockRadius*2)*(blockRadius*2)
		for(let i = 0; i < blocks.length; i++)
		{
			let block = new THREE.Group()
			blocks[i] = block
			block.centerOnGrid = null

			block.back = new THREE.Mesh( new THREE.BufferGeometry(),
				new THREE.MeshPhongMaterial({
					clippingPlanes: visiBox.planes
				}));
			block.back.geometry.addAttribute( 'position',	new THREE.BufferAttribute( new Float32Array(cubesPerBlock*12), 3 ) );
			block.back.geometry.addAttribute( 'normal',		new THREE.BufferAttribute( new Float32Array(cubesPerBlock*12), 3 ) );
			block.back.geometry.attributes.position.dynamic = true
			block.back.geometry.attributes.normal.dynamic = true
			block.add(block.back)

			block.wireframe = new THREE.LineSegments(new THREE.BufferGeometry(),
				new THREE.LineBasicMaterial({
					linewidth: 1.25,
					clippingPlanes: visiBox.planes
				}));
			block.wireframe.geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(cubesPerBlock*12), 3));
			block.wireframe.geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(cubesPerBlock*12), 1));
			block.wireframe.geometry.attributes.position.dynamic = true
			block.wireframe.geometry.index.dynamic = true
			block.add(block.wireframe)
		}
		let replaceableBlock = blocks[0]

		map.update = function()
		{
			removeABadBlockIfOneExists();

			if( !waitingOnResponse )
			{
				let center = new THREE.Vector3(0,0,-1 )
				visiBox.localToWorld(center)
				center.setLength((visiBox.scale.z + panel.scale.z )/2)
				assemblage.updateMatrixWorld();
				assemblage.worldToLocal( center );

				let msg = {
					isolevel,
					isDiffMap,
					userCenterOffGrid: center.toArray(),
					chickenWire: false,
					currentCenterOnGrids: [],
				};

				for(let i = 0; i < blocks.length; i++)
				{
					if( blocks[i].isolevel === isolevel )
					{
						msg.currentCenterOnGrids.push(blocks[i].centerOnGrid);
					}
				}

				for(let i = 0; i < 2; i++)
				{
					if( Math.abs( handControllers[i].thumbStickAxes[1] ) > 0.1 )
					{
						isolevel += 0.06 * handControllers[i].thumbStickAxes[1] * handControllers[i].thumbStickAxes[1] * handControllers[i].thumbStickAxes[1];
						msg.currentCenterOnGrids.length = 0;
					}
				}

				this.postMessageConcerningSelf(msg);
				waitingOnResponse = true;
			}
		}

		map.receiveMessageConcerningSelf = function(msg)
		{
			waitingOnResponse = false;

			if( msg.userCenterOnGrid)
			{
				latestUserCenterOnGrid = msg.userCenterOnGrid;
			}

			if( msg.centerOnGrid )
			{
				for(let i = 0; i < msg.meshData.length; i++)
				{
					let block = replaceableBlock

					let meshDatum = msg.meshData[i];
					let solid = meshDatum.solidGeometricPrimitives
					let wireframe = meshDatum.wireframeGeometricPrimitives

					// block.back.geometry.attributes.position.array = solid.positionArray
					// block.back.geometry.attributes.normal.array = solid.normalArray
					// block.wireframe.geometry.attributes.position.array = wireframe.vertices
					// block.wireframe.geometry.index.array = wireframe.segments
					copyShortArrayToLong(block.back.geometry.attributes.position.array, solid.positionArray)
					copyShortArrayToLong(block.back.geometry.attributes.normal.array, solid.normalArray)
					copyShortArrayToLong(block.wireframe.geometry.attributes.position.array, wireframe.vertices)
					copyShortArrayToLong(block.wireframe.geometry.index.array, wireframe.segments)

					block.back.geometry.attributes.position.needsUpdate = true
					block.back.geometry.attributes.normal.needsUpdate = true
					block.wireframe.geometry.attributes.position.needsUpdate = true
					block.wireframe.geometry.index.needsUpdate = true

					block.back.material.side = isDiffMap && meshDatum.relativeIsolevel < 0 ? THREE.FrontSide : THREE.BackSide
					block.back.material.color.setHex(meshDatum.color)
					block.wireframe.material.color.setHex(meshDatum.color)
					block.wireframe.material.color.lerp(white,0.5)

					block.isolevel = meshDatum.relativeIsolevel;
					block.centerOnGrid = msg.centerOnGrid;
					map.add( block );
				}

				mostRecentBlockIsolevel = msg.meshData[0].relativeIsolevel;
				for(let i = 0; i < blocks.length; i++)
				{
					blocks[i].visible = Math.abs(blocks[i].isolevel) === Math.abs(mostRecentBlockIsolevel);
				}
			}

			if(msg.orthogonalMatrix)
			{
				map.unitCellMesh = UnitCellMesh( msg.orthogonalMatrix );
				map.add(map.unitCellMesh);
				map.unitCellMesh.visible = false;
				//TODO make it movable? Keep it centered in visibox?

				//so this is where we're "done" apparently, quite hacky
				objectsToBeUpdated.push(map);
				addMapDisplayManager(map)
			}
		}

		function getBlockCenterOffset(block)
		{
			if( block.centerOnGrid === null )
			{
				return null
			}
			let offset = Array(3);
			for(let i = 0; i < 3; i++)
			{
				offset[i] = block.centerOnGrid[i]-latestUserCenterOnGrid[i]
			}
			return offset;
		}
		function getArrayVectorLengthSq(array)
		{
			return array[0]*array[0] + array[1]*array[1] + array[2]*array[2];
		}

		function removeABadBlockIfOneExists()
		{
			blocks.sort(function(a,b)
			{
				let aHasGoodIsolevel = Math.abs( a.isolevel ) === Math.abs( mostRecentBlockIsolevel )
				let bHasGoodIsolevel = Math.abs( b.isolevel ) === Math.abs( mostRecentBlockIsolevel )
				if( aHasGoodIsolevel && !bHasGoodIsolevel )
				{
					return -1;
				}
				if( !aHasGoodIsolevel && bHasGoodIsolevel )
				{
					return 1;
				}

				let aCenterOffset = getBlockCenterOffset(a);
				let bCenterOffset = getBlockCenterOffset(b);
				if( aCenterOffset === null || bCenterOffset === null )
				{
					if( bCenterOffset === null && bCenterOffset === null )
					{
						return 0
					}
					else
					{
						if( aCenterOffset === null )
						{
							return 1
						}
						else
						{
							return -1
						}
					}
				}

				let lengthDifference = getArrayVectorLengthSq( aCenterOffset ) - getArrayVectorLengthSq( bCenterOffset );
				if( lengthDifference !== 0 )
				{
					return lengthDifference;
				}
				else
				{
					for(let i = 0; i < 3; i++)
					{
						if( aCenterOffset[i] < bCenterOffset[i] )
						{
							return -1;
						}
						else if( aCenterOffset[i] > bCenterOffset[i] )
						{
							return 1;
						}
					}
					return 0;
				}
			});

			replaceableBlock = blocks[blocks.length-1]
			if( !isDiffMap && blocks.indexOf(replaceableBlock) >= blocks.length/2 )
			{
				replaceableBlock = blocks[26]
			}
		}

		map.postMessageConcerningSelf = function(msg)
		{
			msg.mapIndex = maps.indexOf(this);
			worker.postMessage(msg);
		}

		map.postMessageConcerningSelf({arrayBuffer,blockRadius});
		waitingOnResponse = true;
	}

	let white = new THREE.Color(0xFFFFFF)

	function UnitCellMesh(orthogonalMatrix)
	{
		let CUBE_EDGES = [	[0, 0, 0], [1, 0, 0],
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
		let vertices = CUBE_EDGES.map(function (a)
		{
			return {
				xyz: [  orthogonalMatrix[0] * a[0]  + orthogonalMatrix[1] * a[1]  + orthogonalMatrix[2] * a[2],
					  /*orthogonalMatrix[3] * a[0]*/+ orthogonalMatrix[4] * a[1]  + orthogonalMatrix[5] * a[2],
					  /*orthogonalMatrix[6] * a[0]  + orthogonalMatrix[7] * a[1]*/+ orthogonalMatrix[8] * a[2]]
			};
		});

		let geometry = new THREE.BufferGeometry();
		let pos = new Float32Array(vertices.length * 3);
		if (vertices && vertices[0].xyz)
		{
			for (let i = 0; i < vertices.length; i++)
			{
				let xyz = vertices[i].xyz;
				pos[3*i] = xyz[0];
				pos[3*i+1] = xyz[1];
				pos[3*i+2] = xyz[2];
			}
		}
		else
		{
			for (let i = 0; i < vertices.length; i++)
			{
				let v = vertices[i];
				pos[3*i] = v.x;
				pos[3*i+1] = v.y;
				pos[3*i+2] = v.z;
			}
		}
		geometry.addAttribute('position', new THREE.BufferAttribute(pos, 3));

		let colors = new Float32Array([ 1,0,0,1,0.66667,0,0,1,0,0.66667,1,0,0,0,1,0,0.66667,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0 ]);
		geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));

		let material = new THREE.LineBasicMaterial({
			vertexColors: THREE.VertexColors,
			linewidth:1,
			clippingPlanes: visiBox.planes,
		})

		return new THREE.LineSegments( geometry, material );
	}
}

function copyShortArrayToLong(long, short)
{
	let shortLen = short.length
	console.assert(long.length >= shortLen)
	for(let i = 0,il=long.length; i < il; i++)
	{
		if( i < shortLen )
		{
			long[i] = short[i]
		}
		else
		{
			long[i] = 0
		}
	}
}