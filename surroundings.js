'use strict';

/*
	could have it follow your head. Probably creates too much distracting movement
*/

function initSurroundings( renderer, loadFloor )
{
	var horizontal = 0.77 * TAU;
	var curvyBackground = new THREE.Mesh( new THREE.SphereBufferGeometry( ROOM_RADIUS, 32,10,
			-TAU/4-horizontal/2, horizontal,
			TAU / 4, TAU / 8),
		new THREE.MeshPhongMaterial({
			color:0x6BFFCF,
			side:THREE.BackSide,
			shininess:100,
			specular:0xFFFFFF,
			flatShading:true,
		})
	);
	curvyBackground.scale.set(1,1.55,0.8);
	scene.add( curvyBackground);
	//want it to be adjustable really, have some more little balls

	// var planeRadius = 0.1; //center to side
	// var testPlane = new THREE.Mesh(new THREE.PlaneGeometry(planeRadius*2,0.01),new THREE.MeshBasicMaterial());
	// var theta = 3/4*TAU;
	// var scaledEllipseMinorRadius = curvyBackground.scale.z / planeRadius;
	// var scaledEllipseMajorRadius = curvyBackground.scale.x / planeRadius;
	// var centerR = -1 / ( Math.cos(theta) / sq(scaledEllipseMajorRadius) + Math.sin(theta) / sq(scaledEllipseMinorRadius) );
	// testPlane.position.set( centerR*Math.cos(theta), 0, centerR*Math.sin(theta) ); //from lots of scribbling
	// testPlane.rotation.y = 
	//PROBLEM WAS THAT THE VECTOR FROM THE CENTER OF THE ELLIPSE IS NOT NECESSARILY ORTHOGONAL

	//could put crazy seldom-used things behind, or on top and underneath
	//should be that things move each other out of the way
	//could have a list of the buttons somewhere and you drag things in to make them do stuff woo
	//people want to know the time and their connection speed
	//
	
	if(loadFloor)
	{
		var ourTextureLoader = new THREE.TextureLoader();
		ourTextureLoader.crossOrigin = true;
		var floorDimension = 8;				
		var floorTile = new THREE.Mesh( new THREE.PlaneBufferGeometry( floorDimension, floorDimension ), new THREE.MeshLambertMaterial());
		floorTile.position.y = -1.2;
		floorTile.rotation.x = -TAU / 4;
		scene.add(floorTile);
		ourTextureLoader.load(
			"data/textures/Floor4.png",
			function(texture)
			{
				texture.magFilter = THREE.NearestFilter;
				floorTile.material.map = texture;
			},
			function ( xhr ) {}, function ( xhr ) {console.log( 'texture loading error' );}
		);
	}

	//-----------------lights
	/*
		Could attach one to people's heads? Hands?
	*/

	var ambientLight = new THREE.AmbientLight( 0xffffff, 0.7 );
	// ambientLight.color.setHSL( 0.6, 1, 0.6 );
	scene.add( ambientLight );

	var ourLight = new THREE.PointLight(0xFFFFFF,1,99,0.36,0,1);
	// ourLight.color.setHSL( 0.1, 1, 0.95 );
	// ourLight.position.set( -1, 1.75, 1 );
	ourLight.target = controllers[0]
	ourLight.position.multiplyScalar( 0.1 );
	scene.add( ourLight );
	
	var helperSphere = new THREE.Mesh(new THREE.SphereGeometry(0.04), new THREE.MeshPhongMaterial({color:0xFF0000}));
	helperSphere.geometry.computeBoundingSphere();
	ourLight.boundingSphere = helperSphere.geometry.boundingSphere;
	ourLight.ordinaryParent = scene;
	ourLight.add(helperSphere);
	holdables.push(ourLight)

	//------------Sky

	var vertexShader = document.getElementById( 'vertexShader' ).textContent;
	var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
	var uniforms = {
		topColor: 	 { type: "c", value: new THREE.Color( 0x0077ff ) },
		bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
		offset:		 { type: "f", value: 33 },
		exponent:	 { type: "f", value: 0.6 }
	};
	uniforms.topColor.value.copy( new THREE.Color().setHSL( 0.6, 1, 0.6 ) );

	var sky = new THREE.Mesh( 
		new THREE.SphereGeometry( camera.far*0.99, 32, 15 ),
		new THREE.ShaderMaterial( { 
			vertexShader: vertexShader, 
			fragmentShader: fragmentShader, 
			uniforms: uniforms, 
			side: THREE.BackSide
		})
	);
	scene.add( sky );

	var shadowsPresent = true;
	if(shadowsPresent)
	{
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.BasicShadowMap;

		controllers[0].controllerModel.castShadow = true;
		controllers[1].controllerModel.castShadow = true;
		curvyBackground.receiveShadow = true;
		floorTile.receiveShadow = true;

		if(ourLight.isDirectionalLight)
		{
			var dimension = 0.06;
			ourLight.shadow.camera.left = -dimension;
			ourLight.shadow.camera.right = dimension;
			ourLight.shadow.camera.top = dimension;
			ourLight.shadow.camera.bottom = -dimension;
		}

		ourLight.shadow.camera.far = 10;
		ourLight.shadow.camera.near = ourLight.boundingSphere.radius / 2;
		ourLight.shadow.mapSize.width = 512;
		ourLight.shadow.mapSize.height = 512;
		ourLight.castShadow = true;
	}
}