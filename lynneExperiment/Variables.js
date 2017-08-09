//-----Mathematical constants
var TAU = Math.PI * 2;
var HS3 = Math.sqrt(3)/2;
var TETRAHEDRAL_ANGLE = Math.acos( -1/3 );
var zAxis = new THREE.Vector3(0,0,1); //also used as a placeholder normal
var yAxis = new THREE.Vector3(0,1,0);
var xAxis = new THREE.Vector3(1,0,0);
var zero_vector = new THREE.Vector3();

//-----Fundamental, varying
var ourclock = new THREE.Clock( true ); //.getElapsedTime ()
var delta_t = 0;
var logged = 0;
var debugging = 0;

//Static or initialized and then static
var keycodeArray = "0123456789abcdefghijklmnopqrstuvwxyz";
var socket = io();
var gentilis;
var VRMODE = 0;
var RIGHT_CONTROLLER_INDEX = 0;
var LEFT_CONTROLLER_INDEX = 1-RIGHT_CONTROLLER_INDEX;

var OurVREffect;
var OurVRControls;

//Other
var scene;
var Camera;