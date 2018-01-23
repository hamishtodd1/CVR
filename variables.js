//-----Mathematical
var TAU = Math.PI * 2;
var zVector = new THREE.Vector3(0,0,1); //also used as a placeholder normal
var yVector = new THREE.Vector3(0,1,0);
var xVector = new THREE.Vector3(1,0,0);
var zeroVector = new THREE.Vector3();

//-----Fundamental
var ourClock = new THREE.Clock( true ); //.getElapsedTime ()
var frameDelta = 0;
var logged = 0;
var debugging = 0;

var FOCALPOINT_DISTANCE = 0.3;
var RIGHT_CONTROLLER_INDEX = 0;
var LEFT_CONTROLLER_INDEX = 1-RIGHT_CONTROLLER_INDEX;

var camera = new THREE.PerspectiveCamera( 70, //can be changed by VR effect
		window.innerWidth / window.innerHeight,
		0.1, 700);
var scene = new THREE.Scene().add(camera);

var TEST_SPHERE = new THREE.Mesh(new THREE.EfficientSphereGeometry(0.1), new THREE.MeshBasicMaterial({color:0xFF0000}));

var assemblage = new THREE.Group();

//------varying
//mousePosition = new THREE.Vector2(); //[0,1],[0,1]