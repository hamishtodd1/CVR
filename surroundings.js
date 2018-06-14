'use strict';

/*
	could have it follow your head. Probably creates too much distracting movement

	Words should be small. You read them a couple times and then you know where they are

	Go on, have some fun with rectange packing :D
*/

function initSurroundings( renderer, loadFloor )
{
	var aroundness = 0.77 * TAU;
	var curvyBackground = new THREE.Mesh( new THREE.SphereBufferGeometry( 1, 32,10,
			-TAU/4-aroundness/2, aroundness,
			TAU / 4, TAU / 8),
		new THREE.MeshPhongMaterial({
			color:0x6BFFCF,
			side:THREE.BackSide,
			shininess:100,
			specular:0xFFFFFF,
			// flatShading:true,
		})
	);
	curvyBackground.scale.set(1,1.55,0.8);
	curvyBackground.scale.multiplyScalar(0.8)
	scene.add( curvyBackground);
	//want it to be adjustable really, have some more little balls

	//actually better if the top is the one with both corners on
	//Alternatively, the bottom, and then you don't tilt them at all... eh...
	//the next problem is to work out the 

	var planeWidth = 0.2; //center to side
	var testPlaneGeometry = new THREE.SphereBufferGeometry( 1, 1,1,
			0, planeWidth,
			0, planeWidth*0.2 );
	var testPlane = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry( planeWidth, planeWidth / 3 ),new THREE.MeshBasicMaterial({color:0xFF0000}) );
	testPlane.scale.copy(curvyBackground.scale);
	testPlane.scale.multiplyScalar( 0.98 );
	scene.add(testPlane)

	thingsToBeUpdated.push(testPlane)
	testPlane.update = function()
	{
		// this.position.y = Math.sin(frameCount / 100)

		var xRadius = curvyBackground.scale.x;
		var zRadius = curvyBackground.scale.z;

		this.position.x = 0//0.15*Math.sin( frameCount / 50 ) //actually some function of y
		this.position.z = -Math.sqrt( sq(zRadius) - sq(zRadius) * sq(this.position.x) / sq(xRadius) )

		//we assume its position is bottom left, and has been projected onto the ellipse
		var usefulConstant = sq(sq(planeWidth)) / sq(zRadius) / sq(xRadius);
		var otherCorner = testPlane.position.clone();
		otherCorner.x = usefulConstant * testPlane.position.x + Math.sqrt(usefulConstant+1) + testPlane.position.x;
		otherCorner.x /= usefulConstant + 1;
		console.log( otherCorner.x ) //should be essentially just planeWidth

		otherCorner.z = Math.sqrt( sq(zRadius) + sq(zRadius) * sq(otherCorner.x) / sq(xRadius) );
		if( Math.abs( otherCorner.distanceTo(testPlane.position) - planeWidth ) > 0.01 )
		{
			otherCorner.z *= -1;
		}
		
		otherCorner.sub(testPlane.position).normalize();
		testPlane.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors( 
			new THREE.Vector3(1,0,0).applyQuaternion(testPlane.quaternion),
			otherCorner ) );

		//could put crazy seldom-used things behind, or on top and underneath
		//should be that things move each other out of the way
		//could have a list of the buttons somewhere and you drag things in to make them do stuff woo
		//people want to know the time and their connection speed
	}
	
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

	var shadowsPresent = false;
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