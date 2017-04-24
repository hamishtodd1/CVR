//-----Mathematical constants
var TAU = Math.PI * 2;
var PHI = (1+Math.sqrt(5)) / 2;
var zAxis = new THREE.Vector3(0,0,1); //also used as a placeholder normal
var yAxis = new THREE.Vector3(0,1,0);
var xAxis = new THREE.Vector3(1,0,0);

//-----Fundamental
var ourclock = new THREE.Clock( true ); //.getElapsedTime ()
var delta_t = 0;
var logged = 0;
var debugging = 0;

var isMobileOrTablet = false;

//Static. At least in some sense.
var gentilis;

var FOCALPOINT_DISTANCE = 1;

//var pleasantPatternGeometry = new THREE.TorusKnotGeometry( 0.3, 0.02, 300,6,5,12 );

var scene;
var camera;

var ourVREffect;
var ourVRControls;

var ourObject = new THREE.Object3D();

var testSphere = new THREE.Mesh( new THREE.SphereGeometry( 0.3, 32, 32 ), new THREE.MeshBasicMaterial( {color: 0xffff00} ) );

var PointOfFocus = new THREE.Vector3(); //where the user is looking