'use strict';

if( !window.Worker )
{
	console.error("Missing dependency")
}

const TAU = Math.PI * 2;
const HS3 = Math.sqrt(3)/2;
let zVector = new THREE.Vector3(0,0,1); //also used as a placeholder normal
let yVector = new THREE.Vector3(0,1,0);
let xVector = new THREE.Vector3(1,0,0);
let zeroVector = new THREE.Vector3();

const RIGHT_CONTROLLER_INDEX = 0;
const LEFT_CONTROLLER_INDEX = 1-RIGHT_CONTROLLER_INDEX;
const TETRAHEDRAL_ANGLE = 2 * Math.atan(Math.sqrt(2))

let ourClock = new THREE.Clock( true ); //.getElapsedTime ()
let frameDelta = 0;
let logged = 0;
const debugging = 0;
let frameCount = 0;

let camera = new THREE.PerspectiveCamera( 70, //can be changed by VR effect
		window.innerWidth / window.innerHeight,
		0.1, 700);
let scene = new THREE.Scene().add(camera);

let renderer = new THREE.WebGLRenderer( { antialias: true } );
let handControllers = [new THREE.Object3D(),new THREE.Object3D()]

let models = [];
let maps = [];

let TEST_SPHERE = new THREE.Mesh(new THREE.EfficientSphereGeometry(0.01), new THREE.MeshBasicMaterial({color:0xFFFF00}));

//------varying
//mousePosition = new THREE.Vector2(); //[0,1],[0,1]

let objectsToBeUpdated = [];
let holdables = [];
let socket = null;

let ourPdbLoader = new THREE.PDBLoader();

let assemblage = new THREE.Group();
function getAngstrom()
{
	return assemblage.scale.x;
}