//-----Mathematical
var TAU = Math.PI * 2;
var PHI = (1+Math.sqrt(5)) / 2;
var zAxis = new THREE.Vector3(0,0,1); //also used as a placeholder normal
var yAxis = new THREE.Vector3(0,1,0);
var xAxis = new THREE.Vector3(1,0,0);

THREE.Quaternion.prototype.distanceTo = function(q2)
{
	var theta = Math.acos(this.w*q2.w + this.x*q2.x + this.y*q2.y + this.z*q2.z);
	if (theta>Math.PI/2) theta = Math.PI - theta;
	return theta;
}

//-----Fundamental
var ourclock = new THREE.Clock( true ); //.getElapsedTime ()
var delta_t = 0;
var logged = 0;
var debugging = 0;
var testSphere = new THREE.Mesh( new THREE.SphereGeometry( 0.3, 32, 32 ), new THREE.MeshBasicMaterial( {color: 0xffff00} ) );

var isMobileOrTablet = false;

//------We enforce these to be static

var FOCALPOINT_DISTANCE = 0.7;

var scene = new THREE.Scene();
var camera;

var gentilis;
new THREE.FontLoader().load(  "http://hamishtodd1.github.io/Sysmic/gentilis.js", 
		function ( reponse ) {
			gentilis = reponse;
		},
		function ( xhr ) {}, //progression function
		function ( xhr ) { console.error( "couldn't load font" ); }
	);


var ourVRControls;

//Could check the number of globals and make sure it doesn't change

//var pleasantPatternGeometry = new THREE.TorusKnotGeometry( 0.3, 0.02, 300,6,5,12 );