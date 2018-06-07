'use strict';

function initSurroundings( renderer, loadFloor )
{
	var floorY = -1;

	var horizontal = 0.77 * TAU;
	var curvyBackground = new THREE.Mesh( new THREE.SphereBufferGeometry( ROOM_RADIUS, 32,10,
			-TAU/4-horizontal/2, horizontal,
			TAU / 4, TAU / 8),
		new THREE.MeshStandardMaterial({
			color:0x6BFFCF,
			side:THREE.BackSide
		})
	);
	curvyBackground.geometry.applyMatrix(new THREE.Matrix4().makeScale(1,1.55,0.8))
	scene.add( curvyBackground);
	//want it to be adjustable really, have some more little balls


	//could put crazy seldom-used things behind, or on top and underneath
	//should be that things move each other out of the way
	//could have a list of the buttons somewhere and you drag things in to make them do stuff woo
	//people want to know the time and their connection speed
	//
	
	var OurTextureLoader = new THREE.TextureLoader();
	OurTextureLoader.crossOrigin = true;
	if(loadFloor)
	{
		OurTextureLoader.load(
			"data/textures/Floor4.png",
			function(texture)
			{
				texture.magFilter = THREE.NearestFilter;

				var floorMat = new THREE.MeshPhongMaterial({ map: texture }); 
				
				var floorDimension = 8;
				var floorTile = new THREE.Mesh( new THREE.PlaneBufferGeometry( floorDimension, floorDimension ), floorMat);
//				floorTile.receiveShadow = true;
				
				floorTile.position.y = floorY;
				floorTile.rotation.x = -TAU / 4;
				scene.add(floorTile);
			},
			function ( xhr ) {}, function ( xhr ) {console.log( 'texture loading error' );}
		);
	}

	//-----------------lights
	/*
		Could attach one to people's heads?
	*/
	// scene.add( new THREE.PointLight( 0xFFFFFF, 1, 0.36 ) ); //this one's us!

	var ambientLight = new THREE.AmbientLight( 0xffffff, 0.7 );
	// ambientLight.color.setHSL( 0.6, 1, 0.6 );
	scene.add( ambientLight );

	var spotLight = new THREE.SpotLight(0xFFFFFF,1,99,0.36,0,1);
	// spotLight.color.setHSL( 0.1, 1, 0.95 );
	// spotLight.position.set( -1, 1.75, 1 );
	spotLight.target = controllers[0]
	spotLight.position.multiplyScalar( 0.1 );
	scene.add( spotLight );
	
	var helperSphere = new THREE.Mesh(new THREE.SphereGeometry(0.04), new THREE.MeshPhongMaterial({color:0xFF0000}));
	helperSphere.geometry.computeBoundingSphere();
	spotLight.boundingSphere = helperSphere.geometry.boundingSphere;
	spotLight.ordinaryParent = scene;
	spotLight.add(helperSphere);
	holdables.push(spotLight)

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
		new THREE.SphereGeometry( 600, 32, 15 ),
		new THREE.ShaderMaterial( { 
			vertexShader: vertexShader, 
			fragmentShader: fragmentShader, 
			uniforms: uniforms, 
			side: THREE.BackSide
		})
	);
	scene.add( sky );

	var shadowsPresent = false;
	if(shadowsPresent)
	{
		curvyBackground.receiveShadow = true;
		controllers[0].castShadow = true;
		controllers[1].castShadow = true;
		
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.BasicShadowMap;

		spotLight.castShadow = true;
		spotLight.shadowCameraVisible  = true;
		spotLight.shadowDarkness = 0.5;

		spotLight.shadow.mapSize.width = 2048;
		spotLight.shadow.mapSize.height = 2048;

		var dimension = 50;

		spotLight.shadow.camera.left = -dimension;
		spotLight.shadow.camera.right = dimension;
		spotLight.shadow.camera.top = dimension;
		spotLight.shadow.camera.bottom = -dimension;

		spotLight.shadow.camera.far = 3500;
		spotLight.shadow.bias = -0.0001;
	}
}