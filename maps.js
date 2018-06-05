'use strict';
/*
	there is a "cubicles" thing in uglymol's molecules that was good for searching

	bug: red difference map normals need to be reversed. 
	Well actually all normals EXCEPT red difference map normals need to be reversed and backside needs to be removed

	It's irritating to have them pop in and out
		Would it make a difference to have a single frame where they all get visibility set at once?

	The chunks have to be small because framerate
	isolevel
		all chunk except the changing one disappear
	Movement

	would be nice to have the opacity drop off away from the center

	You only want to get one per frame. You're only asking for one per frame but fuck that
	Ok, 

	could have a flag in the message to say that you want to receive something

	Don't want to add, or remove, more than one per frame.
	Don't want a "buffer" of isolevels
		So you can't send isolevel until you

	Us: request, with list of current correct-isolevel centers
	[any number of frames pass]
	Worker: Send most central needed block
	Us: receive
		hide bad isolevel blocks
		allow frame to complete,
	Us:
		Check for isolevel change 
		request, with list of current correct-isolevel centers and isolevel 

	Each frame:
		If bad blocks exist, remove one
		Check if we should make a request

	All the while, be sending updates about isolevel and userCenterOffGrid?
	Won't necessarily get them as fast as possible but whatever

	How is it possible to see a flash while scrolling?
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

		var isolevel = isDiffMap ? 3.0 : 1.5;
		var latestUserCenterOnGrid = null;
		var waitingOnResponse = false;

		// var someSphere = new THREE.Mesh(new THREE.SphereGeometry(4), new THREE.MeshPhongMaterial({color:0xFF0000}));
		// assemblage.add(someSphere);
		// someSphere.position.copy(visiBox.centerInAssemblageSpace())

		map.update = function()
		{
			var bestIsolevel = getBestIsolevel();
			removeABadBlockIfOneExists(bestIsolevel);

			if( !waitingOnResponse )
			{
				var msg = {
					isolevel,
					userCenterOffGrid: visiBox.centerInAssemblageSpace().toArray(),
					chickenWire: false,
					currentCenterOnGrids: []
				};

				for(var i = 0; i < map.children.length; i++)
				{
					if(map.children[i] === map.unitCellMesh) continue;

					if( map.children[i].isolevel === bestIsolevel )
					{
						msg.currentCenterOnGrids.push(map.children[i].centerOnGrid);
					}
				}

				for(var i = 0; i < 2; i++)
				{
					if( Math.abs( controllers[i].thumbStickAxes[1] ) > 0.1 )
					{
						isolevel += 0.06 * controllers[i].thumbStickAxes[1];
						msg.currentCenterOnGrids = 0;
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

			if( msg.color )
			{
				var newBlock = geometricPrimitivesToMesh(msg.color,msg.wireframeGeometricPrimitives,msg.nonWireframeGeometricPrimitives);
				newBlock.isolevel = msg.relativeIsolevel;
				newBlock.centerOnGrid = msg.centerOnGrid;
				map.add( newBlock );

				var numVisible = 0;
				for(var i = 0; i < map.children.length; i++)
				{
					if(map.children[i] === map.unitCellMesh) continue;
					map.children[i].visible = map.children[i].isolevel === newBlock.isolevel; //NOT necessarily the best! but it is the latest! Round-off errors, urgh
				}
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

		function getBestIsolevel()
		{
			var bestIsolevel = Infinity;

			for(var i = 0; i < map.children.length; i++)
			{
				if(map.children[i] === map.unitCellMesh) continue;

				if( Math.abs( map.children[i].isolevel - isolevel ) < Math.abs( bestIsolevel - isolevel ) )
				{
					bestIsolevel = map.children[i].isolevel;
				}
			}

			return bestIsolevel;
		}

		function removeABadBlockIfOneExists(bestIsolevel)
		{
			var blocks = [];
			map.children.forEach( function(child)
			{
				if(child !== map.unitCellMesh)
				{
					blocks.push(child);
				}
			});
			if(!blocks.length)
			{
				return;
			}

			blocks.sort(function(a,b)
			{
				if( a.isolevel === bestIsolevel && b.isolevel !== bestIsolevel )
				{
					return -1;
				}
				if( a.isolevel !== bestIsolevel && b.isolevel === bestIsolevel )
				{
					return 1;
				}

				var aDistanceToCenter = manhattanDistanceArrays(latestUserCenterOnGrid,a.centerOnGrid);
				var bDistanceToCenter = manhattanDistanceArrays(latestUserCenterOnGrid,b.centerOnGrid);

				return aDistanceToCenter - bDistanceToCenter;
			});

			if( ( blocks[blocks.length-1].isolevel !== bestIsolevel ) ||
				(!isDiffMap && blocks.length > 27) ||
				(isDiffMap && blocks.length > 54) )
			{
				removeAndRecursivelyDispose(blocks.pop());
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
		waitingOnResponse = true;
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