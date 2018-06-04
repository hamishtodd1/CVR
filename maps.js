'use strict';
/*
	there is a "cubicles" thing in uglymol's molecules that was good for searching

	bug: red difference map normals need to be reversed. 
	Well actually all normals EXCEPT red difference map normals need to be reversed and backside needs to be removed

	It's irritating to have them pop in and out. Would it make a difference to have a single frame where they all get visibility set at once?
*/

var starProcessingMapData;
function initMapCreationSystem(visiBox)
{
	var worker = new Worker("mapExtractionAndMeshing.js");
	worker.onmessage = function(event)
	{
		maps[ event.data.mapIndex ].receiveMessageConcerningSelf( event.data );
	}

	Map = function(arrayBuffer, isDiffMap)
	{
		// isDiffMap = true
		var map = new THREE.Group();
		maps.push(map);
		assemblage.add(map);

		var isolevel = isDiffMap ? 3.0 : 1.5

		var latestUserCenterOnGrid = null;

		map.update = function()
		{
			if( (!isDiffMap && map.children.length > 28) || (isDiffMap && map.children.length > 55) )
			{
				map.children.sort(function(a,b)
				{
					if(a === map.unitCellMesh)
					{
						return -1
					}
					if(b === map.unitCellMesh)
					{
						return 1
					}

					if( isolevelIsAcceptable(a) && !isolevelIsAcceptable(b) )
					{
						return -1;
					}
					if( !isolevelIsAcceptable(a) && isolevelIsAcceptable(b) )
					{
						return 1;
					}

					var aDistanceToCenter = manhattanDistanceArrays(latestUserCenterOnGrid,a.centerOnGrid);
					var bDistanceToCenter = manhattanDistanceArrays(latestUserCenterOnGrid,b.centerOnGrid);

					if( isolevelIsAcceptable(a) && isolevelIsAcceptable(b) )
					{
						return aDistanceToCenter - bDistanceToCenter;
					}
					else
					{
						return bDistanceToCenter - aDistanceToCenter;
					}
				});
				//check and think about diffMap for negative isolevel shit

				removeAndRecursivelyDispose(map.children[map.children.length-1]);
			}

			var msg = {
				isolevel,
				userCenterOffGrid: visiBox.centerInAssemblageSpace().toArray(),
				chickenWire: false,
				currentCenterOnGrids: []
			};

			var numWithCorrectIsolevel = 0;
			for(var i = 0, il = this.children.length; i < il; i++)
			{
				var block = this.children[i];
				if(block === this.unitCellMesh) continue;
				msg.currentCenterOnGrids.push(block.centerOnGrid);
				
				if( isolevelIsAcceptable(block) && !isDiffMap )
				{
					numWithCorrectIsolevel++;
				}
			}

			if(numWithCorrectIsolevel >= 1)
			{
				for(var j = 0; j < 2; j++)
				{
					if( Math.abs( controllers[j].thumbStickAxes[1] ) > 0.1 )
					{
						isolevel += 0.06 * controllers[j].thumbStickAxes[1];
						msg.currentCenterOnGrids.length = 0; //do same if chickenwire changed
					}
				}
			}

			this.postMessageConcerningSelf(msg);
		}

		map.receiveMessageConcerningSelf = function(msg)
		{
			if( msg.wireframeGeometricPrimitives )
			{
				var newBlock = geometricPrimitivesToMesh(msg.color,msg.wireframeGeometricPrimitives,msg.nonWireframeGeometricPrimitives);
				newBlock.isolevel = msg.relativeIsolevel;
				newBlock.centerOnGrid = msg.centerOnGrid;
				console.log(msg.centerOnGrid)
				map.add( newBlock );

				latestUserCenterOnGrid = msg.userCenterOnGrid
			}

			if(msg.orthogonalMatrix)
			{
				map.unitCellMesh = UnitCellMesh( msg.orthogonalMatrix );
				map.add(map.unitCellMesh);
				map.unitCellMesh.visible = false;
				//TODO make it movable? Keep it centered in visibox?

				thingsToBeUpdated.push(map);
			}
		}

		map.postMessageConcerningSelf = function(msg)
		{
			msg.mapIndex = maps.indexOf(this);
			worker.postMessage(msg);
		}

		function isolevelIsAcceptable(block)
		{
			return block.isolevel === isolevel || block.isolevel === -isolevel;
		}

		map.postMessageConcerningSelf({arrayBuffer:arrayBuffer,isDiffMap:isDiffMap});
	}

	function manhattanDistanceArrays(a,b)
	{
		return Math.abs(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
	}

	function geometricPrimitivesToMesh(color, wireframeGeometricPrimitives, nonWireframeGeometricPrimitives)
	{
		if( nonWireframeGeometricPrimitives === undefined )
		{
			return wireframeIsomeshFromGeometricPrimitives(wireframeGeometricPrimitives)
		}
		else
		{
			var geo = new THREE.BufferGeometry();
			geo.addAttribute( 'position',	new THREE.BufferAttribute( nonWireframeGeometricPrimitives.positionArray, 3 ) );
			geo.addAttribute( 'normal',		new THREE.BufferAttribute( nonWireframeGeometricPrimitives.normalArray, 3 ) );
			
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

			if(wireframeGeometricPrimitives)
			{
				//super high quality
				var wireframe = wireframeIsomeshFromGeometricPrimitives(wireframeGeometricPrimitives);
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