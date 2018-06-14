'use strict';

if( !window.Worker || !navigator.getVRDisplays)
{
	console.error("Missing dependency. Get chromium")
}

const TAU = Math.PI * 2;
const HS3 = Math.sqrt(3)/2;
var zVector = new THREE.Vector3(0,0,1); //also used as a placeholder normal
var yVector = new THREE.Vector3(0,1,0);
var xVector = new THREE.Vector3(1,0,0);
var zeroVector = new THREE.Vector3();

const RIGHT_CONTROLLER_INDEX = 0;
const LEFT_CONTROLLER_INDEX = 1-RIGHT_CONTROLLER_INDEX;
const TETRAHEDRAL_ANGLE = 2 * Math.atan(Math.sqrt(2))

var ourClock = new THREE.Clock( true ); //.getElapsedTime ()
var frameDelta = 0;
var logged = 0;
const debugging = 0;

var camera = new THREE.PerspectiveCamera( 70, //can be changed by VR effect
		window.innerWidth / window.innerHeight,
		0.1, 700);
var scene = new THREE.Scene().add(camera);

var controllers = Array(2);
var models = [];
var maps = [];

var TEST_SPHERE = new THREE.Mesh(new THREE.EfficientSphereGeometry(0.01), new THREE.MeshBasicMaterial({color:0xFF0000}));

var frameCount = 0;

//------varying
//mousePosition = new THREE.Vector2(); //[0,1],[0,1]

var thingsToBeUpdated = [];
var holdables = [];
var socket = null;

var ourPDBLoader = new THREE.PDBLoader();

function getAngstrom()
{
	return assemblage.scale.x;
}
var assemblage = new THREE.Group();