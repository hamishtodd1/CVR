/*
	So it's like you're holding the amide plane.
	You grab and a plane appears.
		Move your hand and its corner will stay in same place
			But it can point any which way
		Keep moving your hand, and if it is far enough away a new one shall be created
		Move your hand back and it disappears. Can go back as far as you like
		Lampshade-like toroidal region

	Tau is set to 110, but if Lynne's data is to be believed it can do 105 and 115 too
	There are only two degrees of freedom, phi and psi
	The first one in the chain should have full freedom
		but for now we will be making a chain de novo
			but will pretend that we are starting somewhere

	Would be nice to have it recognize where you are in the sequence

	Would be nice to use ramachandran data to limit where you can put it
		Chemistry, a rabbit hole!
		Could do our own hard-sphere stuff
		But radii? They come from "energy" which is in ener_lib.cif


	Sending it off to coot
		If it's a new chain, have to make that, then residues start at 0
		Otherwise,
		add_new_chain does exist
*/

function initPainter()
{
	new THREE.PlaneBufferGeometry(2,Math.sqrt(3))

	TETRAHEDRAL_ANGLE;
}