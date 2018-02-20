//-----Mathematical
var TAU = Math.PI * 2;
var zVector = new THREE.Vector3(0,0,1);
var yVector = new THREE.Vector3(0,1,0);
var xVector = new THREE.Vector3(1,0,0);
var zeroVector = new THREE.Vector3();

var FOCALPOINT_DISTANCE = 0.3;

var camera = new THREE.PerspectiveCamera( 70, //can be changed by VR effect
		window.innerWidth / window.innerHeight,
		0.1, 700);
var scene = new THREE.Scene().add(camera);

function init()
{
	var renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.localClippingEnabled = true;
	renderer.vr.enabled = true;
	document.body.appendChild( renderer.domElement );

	var vrButton = WEBVR.createButton( renderer );
	document.addEventListener( 'keydown', function(event)
	{
		if(event.keyCode === 69 ) //e
		{
			vrButton.onclick();
		}
	}, false );
	document.body.appendChild( vrButton );

	function render()
	{
		renderer.render( scene, camera );
	}
	renderer.animate( render );
	
	var visiBox = initVisiBox(0.3);
	clippingPlanes:visiBox.planes

	var obj = new THREE.Mesh(new THREE.SphereBufferGeometry(0.18), new THREE.MeshBasicMaterial( {
		color:0x00FF00,
		clippingPlanes: visiBox.planes
	} ) );
	obj.position.z = -FOCALPOINT_DISTANCE;
	scene.add(obj)
	
	render();
}
init();


function initVisiBox(initialScale)
{
	var visiBox = new THREE.Object3D();
	
	visiBox.scale.setScalar(initialScale);
	visiBox.position.z = -FOCALPOINT_DISTANCE;
	scene.add(visiBox);
	
	var ourSquareGeometry = new THREE.RingGeometry( 0.9 * Math.sqrt( 2 ) / 2, Math.sqrt( 2 ) / 2,4,1);
	ourSquareGeometry.applyMatrix( new THREE.Matrix4().makeRotationZ( TAU / 8 ) );
	visiBox.planes = [];
	var faces = Array(6);
	for(var i = 0; i < 6; i++)
	{
		faces[i] = new THREE.Mesh(ourSquareGeometry, new THREE.MeshBasicMaterial({color:0xFF0000,transparent:true, opacity:0.5, side:THREE.DoubleSide}) );
		visiBox.add( faces[i] );
		if( i === 1) faces[i].rotation.x = TAU/2;
		if( i === 2) faces[i].rotation.x = TAU/4;
		if( i === 3) faces[i].rotation.x = -TAU/4;
		if( i === 4) faces[i].rotation.y = TAU/4;
		if( i === 5) faces[i].rotation.y = -TAU/4;
		faces[i].position.set(0,0,0.5);
		faces[i].position.applyEuler( faces[i].rotation );
		
		visiBox.planes.push( new THREE.Plane() );
	}
	
	//making corners
	{
		visiBox.corners = Array(8);
		var cornerGeometry = new THREE.SphereBufferGeometry(1);
		cornerGeometry.computeBoundingSphere();
		var cornerMaterial = new THREE.MeshBasicMaterial({color: 0x00FFFF, side:THREE.DoubleSide});
		visiBox.updateMatrix();

		function putOnCubeCorner(i, position)
		{
			position.setScalar(0.5);
			if( i%2 )
			{
				position.x *= -1;
			}
			if( i%4 >= 2 )
			{
				position.y *= -1;
			}
			if( i>=4 )
			{
				position.z *= -1;
			}
		}
		for(var i = 0; i < visiBox.corners.length; i++)
		{
			visiBox.corners[i] = new THREE.Mesh( cornerGeometry, cornerMaterial );
			visiBox.corners[i].scale.setScalar( 0.01 );
			visiBox.add( visiBox.corners[i] );

			visiBox.updateMatrixWorld();
			
			putOnCubeCorner(i, visiBox.corners[i].position)
		}
	}
	
	visiBox.updateMatrixWorld();
	for(var i = 0; i < visiBox.corners.length; i++)
	{
		if(visiBox.corners[i].parent !== visiBox)
		{
			var newCornerPosition = visiBox.corners[ i ].getWorldPosition();
			visiBox.worldToLocal(newCornerPosition);
			visiBox.scale.x *= ( Math.abs(newCornerPosition.x)-0.5 ) + 1;
			visiBox.scale.y *= ( Math.abs(newCornerPosition.y)-0.5 ) + 1;
			visiBox.scale.z *= ( Math.abs(newCornerPosition.z)-0.5 ) + 1;
			
			visiBox.updateMatrixWorld();
			
			var newNewCornerPosition = new THREE.Vector3();
			putOnCubeCorner(i, newNewCornerPosition );
			visiBox.localToWorld(newNewCornerPosition);
			
			var displacement = visiBox.corners[ i ].getWorldPosition().sub( newNewCornerPosition )
			
			visiBox.position.add(displacement);
			
			break;
		}
	}
	
	//beware, the planes may be the negatives of what you expect, seemingly because of threejs bug
	for(var i = 0; i < visiBox.planes.length; i++)
	{
		var planeVector = new THREE.Vector3();
		planeVector.applyMatrix4(visiBox.children[i].matrix);
		visiBox.planes[i].normal.copy(planeVector).normalize();
		visiBox.planes[i].constant = planeVector.dot( visiBox.planes[i].normal );
		
		visiBox.planes[i].applyMatrix4(visiBox.matrixWorld);
	}
	
	return visiBox;
}