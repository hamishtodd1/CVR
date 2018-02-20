function initSurroundings( loadFloor )
{
	scene.fog = new THREE.Fog( 0xffffff, 1, 600 );
	scene.fog.color.setHSL( 0.6, 0, 1 );
	
	// LIGHTS

	hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
	hemiLight.color.setHSL( 0.6, 1, 0.6 );
	hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
	hemiLight.position.set( 0, 500, 0 );
	scene.add( hemiLight );

	dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
	dirLight.color.setHSL( 0.1, 1, 0.95 );
	dirLight.position.set( -1, 1.75, 1 );
	dirLight.position.multiplyScalar( 50 );
	scene.add( dirLight );

	dirLight.castShadow = true;

	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;

	var d = 50;

	dirLight.shadow.camera.left = -d;
	dirLight.shadow.camera.right = d;
	dirLight.shadow.camera.top = d;
	dirLight.shadow.camera.bottom = -d;

	dirLight.shadow.camera.far = 3500;
	dirLight.shadow.bias = -0.0001;

	var floorY = -1;

	var wallHeight = 1.5;
	var wallMaterial = new THREE.MeshStandardMaterial({color:0xBBBBBB, side:THREE.DoubleSide});
	var walls = Array(3);
	for(var i = 0; i < walls.length; i++)
	{
		walls[i] = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_RADIUS*2,wallHeight), wallMaterial);
		walls[i].rotation.y = (i+1) * TAU/4;
		walls[i].position.x = ROOM_RADIUS;
		walls[i].position.y = floorY + wallHeight / 2;
		walls[i].position.applyAxisAngle(yVector,i*TAU/4);
		scene.add(walls[i])
	}
	
	var OurTextureLoader = new THREE.TextureLoader();
	OurTextureLoader.crossOrigin = true;
	if(loadFloor)
	{
		OurTextureLoader.load(
			"data/textures/Floor4.png",
			function(texture)
			{
				texture.magFilter = THREE.NearestFilter;
//				texture.minFilter = THREE.LinearMipMapLinearFilter;

				var floorMat = new THREE.MeshPhongMaterial({ map: texture }); 
				
				var floorDimension = 8;
				var floorTile = new THREE.Mesh( new THREE.PlaneBufferGeometry( floorDimension, floorDimension ), floorMat);
//				floorTile.receiveShadow = true;
				
				floorTile.position.y = floorY;
				floorTile.rotation.x = -TAU / 4;
				scene.add(floorTile);

				// var wallHeight = 2;
				// var walls = new THREE.Mesh(
				// 	new THREE.CylinderBufferGeometry(2,2,2,64,1,true), 
				// 	wallMaterial );
				// walls.position.y = floorTile.position.y + wallHeight / 2;
				// scene.add(walls);
			},
			function ( xhr ) {}, function ( xhr ) {console.log( 'texture loading error' );}
		);
	}

	// SKYDOME

	var vertexShader = document.getElementById( 'vertexShader' ).textContent;
	var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
	var uniforms = {
		topColor: 	 { type: "c", value: new THREE.Color( 0x0077ff ) },
		bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
		offset:		 { type: "f", value: 33 },
		exponent:	 { type: "f", value: 0.6 }
	};
	uniforms.topColor.value.copy( hemiLight.color );

	scene.fog.color.copy( uniforms.bottomColor.value );

	var skyGeo = new THREE.SphereGeometry( 600, 32, 15 );
	var skyMat = new THREE.ShaderMaterial( { 
		vertexShader: vertexShader, 
		fragmentShader: fragmentShader, 
		uniforms: uniforms, 
		side: THREE.BackSide } );

	var sky = new THREE.Mesh( skyGeo, skyMat );
	scene.add( sky );
}