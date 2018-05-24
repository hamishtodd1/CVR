/*
	The purpose of havng this in a web worker is so that it can work constantly without worrying about "interrupting"

 	Note these fail silently if you try to run them locally without "allow-access-from-files"
 */

importScripts('lib/three.js');

var t = new THREE.Mesh(new THREE.SphereGeometry(0.01), new THREE.MeshBasicMaterial())
t.position.z -= 0.2
postMessage(new Float32Array([0,1,2]));

onmessage = function(event) {  
	console.log("received: ", event.data);
};