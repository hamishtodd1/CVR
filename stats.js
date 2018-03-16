/*
	Ramachandran
	Lists of:
		unmodelled blobs
		incorrect chiral volumes
		Difference map peaks
	Bar charts (presumably all one bar per residue?):
		peptide omega distortion
		NCS differences
		Rotamer analysis
		Geometry graphs
			Bonds
			Angles
			Planes
			Chirals
		B factor graph, we talked about this. Two bars per residue
		B factor variance

	If you recently used the b factors you'll probably use them again
	So 

	Want to be able to point at bars and go to their residue

	They're on the left, floor to ceiling, to line up residue.

	Some 3D thing with all the bar charts would be cool
	Pull the ones you're most interested in to the front
	Some go into the floor
	Pull it out like a towel rail
	
	Maybe:
		at all times, you have floating cursors on the walls
		They are always "at the end of your lasers"
		Probably the wall should actually be curved, cylindrical
		But "things to pick up" should probably still be in reach
		It shouldn't be far away
		You can rearrange it as you please, bunch of rectangles

	There again, no AAAD. You want stats that concern a thing to be close to that thing

*/

//we can do better than bar charts and ramachandran.
function initStats()
{
	var randomData = Array(37);
	for(var i = 0; i < randomData.length; i++)
	{
		randomData[i] = Math.random();
	}
	var randomGraph = Graph(randomData);
	randomGraph.rotation.y = TAU/4
	randomGraph.position.x = -ROOM_RADIUS + 0.0001;
	randomGraph.position.y = -randomGraph.scale.y / 2;
	randomGraph.scale.multiplyScalar(0.5)
	randomGraph.position.z = randomGraph.getWorldSpaceWidth()/2
	scene.add(randomGraph)

	var updateStats = function()
	{
		//your controllers have a laser
		//If the laser is in the rectangular area, it is visible
		//the bars should change color if they are being pointed at
		//as should the backgrounds, that lets you drag them
	}
}

function Graph(data)
{
	var graph = new THREE.Group;
	graph.position.z = -FOCALPOINT_DISTANCE
	// graph.scale.setScalar(0.1)
	var background = new THREE.Mesh(THREE.OriginCorneredPlaneGeometry(), new THREE.MeshBasicMaterial());
	background.position.z = -0.0001
	graph.add(background);

	var xAxis = new THREE.Mesh(THREE.OriginCorneredPlaneGeometry(), new THREE.MeshBasicMaterial({color:0x000000}));
	var yAxis = new THREE.Mesh(THREE.OriginCorneredPlaneGeometry(), new THREE.MeshBasicMaterial({color:0x000000}));
	graph.add(xAxis,yAxis)

	var axisThickness = 0.01;
	xAxis.scale.y = axisThickness;
	yAxis.scale.x = axisThickness;

	var graphHeight = 0.8;
	yAxis.scale.y = graphHeight + axisThickness;

	var graphOffset = new THREE.Vector3( (1-graphHeight)/2, (1-graphHeight)/2, 0.00001);
	xAxis.position.copy(graphOffset)
	xAxis.position.y -= axisThickness;
	yAxis.position.copy(graphOffset)
	yAxis.position.x -= axisThickness;
	yAxis.position.y -= axisThickness;

	xAxis.label = makeTextSign( "Residues" );
	yAxis.label = makeTextSign( "Y axis" );
	xAxis.label.scale.setScalar(0.07)
	yAxis.label.scale.setScalar(0.07)
	xAxis.label.position.copy(graphOffset).multiplyScalar(0.5);
	yAxis.label.position.copy(graphOffset).multiplyScalar(0.5);
	xAxis.label.position.x = 0.5;
	yAxis.label.position.y = 0.5;
	yAxis.label.rotation.z = TAU/4;
	graph.add(xAxis.label)
	graph.add(yAxis.label)

	graph.getWorldSpaceWidth = function()
	{
		return background.scale.x * this.scale.x;
	}

	graph.displayDataset = function(data)
	{
		var barWidth = 0.1;

		xAxis.scale.x = barWidth * data.length;
		background.scale.x = 2 * graphOffset.x + barWidth * data.length;
		xAxis.label.position.x = background.scale.x / 2;

		for(var i = 0; i < data.length; i++)
		{
			var bar = new THREE.Mesh(THREE.OriginCorneredPlaneGeometry(1,graphHeight), new THREE.MeshBasicMaterial({color:0xFF0000}));
			bar.scale.y = data[i]
			bar.scale.x = barWidth
			bar.material.color.r = bar.scale.y;
			bar.material.color.g = 1-bar.scale.y;
			bar.position.add(graphOffset);
			bar.position.x += barWidth * i;
			graph.add(bar)
		}
	}
	if(data)
	{
		graph.displayDataset(data)
	}

	return graph;
}