/**
 * Altered by @hamish_todd to give carbon alphas in callback
 * 
 * @author alteredq / http://alteredqualia.com/
 * @author Mugen87 / https://github.com/Mugen87
 */

function initPdbLoader()
{
	var loader = new THREE.FileLoader();

	let pdbOpening = ""

	loadPdb = function ( url, onLoad, onProgress, onError )
	{
		loader.load( url, function ( text )
		{
			var atomsAndBonds = parsePdb( text );
			createModel( atomsAndBonds, onLoad );

		}, onProgress, onError );
	}
	
	parsePdb = function ( text )
	{
		function trim( text ) 
		{
			return text.replace( /^\s\s*/, '' ).replace( /\s\s*$/, '' );
		}

		function capitalize( text )
		{
			return text.charAt( 0 ).toUpperCase() + text.substr( 1 ).toLowerCase();
		}

		function hash( s, e )
		{
			return "s" + Math.min( s, e ) + "e" + Math.max( s, e );
		}

		function parseBond( start, length ) {

			var eatom = parseInt( lines[ i ].substr( start, length ) );

			if ( eatom )
			{
				var h = hash( satom, eatom );

				if ( bhash[ h ] === undefined )
				{
					bonds.push( [ satom - 1, eatom - 1, 1 ] );
					bhash[ h ] = bonds.length - 1;
				}
				else
				{

					// doesn't really work as almost all PDBs
					// have just normal bonds appearing multiple
					// times instead of being double/triple bonds
					// bonds[bhash[h]][2] += 1;

				}
			}
		}

		var CPK = { "h": [ 255, 255, 255 ], "he": [ 217, 255, 255 ], "li": [ 204, 128, 255 ], "be": [ 194, 255, 0 ], "b": [ 255, 181, 181 ], "c": [ 144, 144, 144 ], "n": [ 48, 80, 248 ], "o": [ 255, 13, 13 ], "f": [ 144, 224, 80 ], "ne": [ 179, 227, 245 ], "na": [ 171, 92, 242 ], "mg": [ 138, 255, 0 ], "al": [ 191, 166, 166 ], "si": [ 240, 200, 160 ], "p": [ 255, 128, 0 ], "s": [ 255, 255, 48 ], "cl": [ 31, 240, 31 ], "ar": [ 128, 209, 227 ], "k": [ 143, 64, 212 ], "ca": [ 61, 255, 0 ], "sc": [ 230, 230, 230 ], "ti": [ 191, 194, 199 ], "v": [ 166, 166, 171 ], "cr": [ 138, 153, 199 ], "mn": [ 156, 122, 199 ], "fe": [ 224, 102, 51 ], "co": [ 240, 144, 160 ], "ni": [ 80, 208, 80 ], "cu": [ 200, 128, 51 ], "zn": [ 125, 128, 176 ], "ga": [ 194, 143, 143 ], "ge": [ 102, 143, 143 ], "as": [ 189, 128, 227 ], "se": [ 255, 161, 0 ], "br": [ 166, 41, 41 ], "kr": [ 92, 184, 209 ], "rb": [ 112, 46, 176 ], "sr": [ 0, 255, 0 ], "y": [ 148, 255, 255 ], "zr": [ 148, 224, 224 ], "nb": [ 115, 194, 201 ], "mo": [ 84, 181, 181 ], "tc": [ 59, 158, 158 ], "ru": [ 36, 143, 143 ], "rh": [ 10, 125, 140 ], "pd": [ 0, 105, 133 ], "ag": [ 192, 192, 192 ], "cd": [ 255, 217, 143 ], "in": [ 166, 117, 115 ], "sn": [ 102, 128, 128 ], "sb": [ 158, 99, 181 ], "te": [ 212, 122, 0 ], "i": [ 148, 0, 148 ], "xe": [ 66, 158, 176 ], "cs": [ 87, 23, 143 ], "ba": [ 0, 201, 0 ], "la": [ 112, 212, 255 ], "ce": [ 255, 255, 199 ], "pr": [ 217, 255, 199 ], "nd": [ 199, 255, 199 ], "pm": [ 163, 255, 199 ], "sm": [ 143, 255, 199 ], "eu": [ 97, 255, 199 ], "gd": [ 69, 255, 199 ], "tb": [ 48, 255, 199 ], "dy": [ 31, 255, 199 ], "ho": [ 0, 255, 156 ], "er": [ 0, 230, 117 ], "tm": [ 0, 212, 82 ], "yb": [ 0, 191, 56 ], "lu": [ 0, 171, 36 ], "hf": [ 77, 194, 255 ], "ta": [ 77, 166, 255 ], "w": [ 33, 148, 214 ], "re": [ 38, 125, 171 ], "os": [ 38, 102, 150 ], "ir": [ 23, 84, 135 ], "pt": [ 208, 208, 224 ], "au": [ 255, 209, 35 ], "hg": [ 184, 184, 208 ], "tl": [ 166, 84, 77 ], "pb": [ 87, 89, 97 ], "bi": [ 158, 79, 181 ], "po": [ 171, 92, 0 ], "at": [ 117, 79, 69 ], "rn": [ 66, 130, 150 ], "fr": [ 66, 0, 102 ], "ra": [ 0, 125, 0 ], "ac": [ 112, 171, 250 ], "th": [ 0, 186, 255 ], "pa": [ 0, 161, 255 ], "u": [ 0, 143, 255 ], "np": [ 0, 128, 255 ], "pu": [ 0, 107, 255 ], "am": [ 84, 92, 242 ], "cm": [ 120, 92, 227 ], "bk": [ 138, 79, 227 ], "cf": [ 161, 54, 212 ], "es": [ 179, 31, 212 ], "fm": [ 179, 31, 186 ], "md": [ 179, 13, 166 ], "no": [ 189, 13, 135 ], "lr": [ 199, 0, 102 ], "rf": [ 204, 0, 89 ], "db": [ 209, 0, 79 ], "sg": [ 217, 0, 69 ], "bh": [ 224, 0, 56 ], "hs": [ 230, 0, 46 ], "mt": [ 235, 0, 38 ],
			   "ds": [ 235, 0, 38 ], "rg": [ 235, 0, 38 ], "cn": [ 235, 0, 38 ], "uut": [ 235, 0, 38 ], "uuq": [ 235, 0, 38 ], "uup": [ 235, 0, 38 ], "uuh": [ 235, 0, 38 ], "uus": [ 235, 0, 38 ], "uuo": [ 235, 0, 38 ] };

		var atoms = [];
		var bonds = [];
		var terminations = [];
		var histogram = {};

		var bhash = {};

		var lines = text.split( "\n" );

		var x, y, z, e

		let isCA, residueType;

		let writePdbOpening = pdbOpening === ""

		for ( var i = 0, l = lines.length; i < l; ++ i )
		{
			if( writePdbOpening )
			{
				pdbOpening += lines[i]
			}

			if ( lines[ i ].substr( 0, 4 ) == "ATOM" || lines[ i ].substr( 0, 6 ) == "HETATM" )
			{
				writePdbOpening = false

				x = parseFloat( lines[ i ].substr( 30, 7 ) );
				y = parseFloat( lines[ i ].substr( 38, 7 ) );
				z = parseFloat( lines[ i ].substr( 46, 7 ) );

				e = trim( lines[ i ].substr( 76, 2 ) ).toLowerCase();
				
				isCA = lines[ i ].substr( 13, 2 ) === "CA";
				residueType = lines[ i ].substr( 17, 3 )

				if ( e === "" )
				{
					e = trim( lines[ i ].substr( 12, 2 ) ).toLowerCase();
				}
				atoms.push( [ x, y, z, CPK[ e ], capitalize( e ), isCA ] );

				if ( histogram[ e ] === undefined ) histogram[ e ] = 1;
				else histogram[ e ] += 1;

			}
			else if ( lines[ i ].substr( 0, 6 ) == "CONECT" )
			{
				var satom = parseInt( lines[ i ].substr( 6, 5 ) );

				parseBond( 11, 5 );
				parseBond( 16, 5 );
				parseBond( 21, 5 );
				parseBond( 26, 5 );

			}
			else if ( lines[ i ].substr( 0, 3 ) === "TER" )
			{
				terminations.push(atoms.length)
			}
		}

		return { "ok": true, "atoms": atoms, "bonds": bonds, "histogram": histogram };
	}

	createModel = function( atomsAndBonds )
	{
		var geometryAtoms = new THREE.BufferGeometry();
		var geometryBonds = new THREE.BufferGeometry();

		var carbonAlphas = [];

		var i, l;

		var verticesAtoms = [];
		var colors = [];
		var verticesBonds = [];

		geometryAtoms.elements = [];

		var atoms = atomsAndBonds.atoms;
		var bonds = atomsAndBonds.bonds;

		for ( i = 0, l = atoms.length; i < l; i ++ ) {

			var atom = atoms[ i ];

			var x = atom[ 0 ];
			var y = atom[ 1 ];
			var z = atom[ 2 ];
			
			if(atoms[i][5])
			{
				carbonAlphas.push(new THREE.Vector3(x,y,z));
			}

			verticesAtoms.push( x, y, z );

			var r = atom[ 3 ][ 0 ] / 255;
			var g = atom[ 3 ][ 1 ] / 255;
			var b = atom[ 3 ][ 2 ] / 255;

			colors.push( r, g, b );

			geometryAtoms.elements.push( atom[ 4 ] );

		}

		for ( i = 0, l = bonds.length; i < l; i ++ ) {

			var bond = bonds[ i ];

			var start = bond[ 0 ];
			var end = bond[ 1 ];

			verticesBonds.push( verticesAtoms[ ( start * 3 ) + 0 ] );
			verticesBonds.push( verticesAtoms[ ( start * 3 ) + 1 ] );
			verticesBonds.push( verticesAtoms[ ( start * 3 ) + 2 ] );

			verticesBonds.push( verticesAtoms[ ( end * 3 ) + 0 ] );
			verticesBonds.push( verticesAtoms[ ( end * 3 ) + 1 ] );
			verticesBonds.push( verticesAtoms[ ( end * 3 ) + 2 ] );

		}

		geometryAtoms.addAttribute( 'position', new THREE.Float32BufferAttribute( verticesAtoms, 3 ) );
		geometryAtoms.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

		geometryBonds.addAttribute( 'position', new THREE.Float32BufferAttribute( verticesBonds, 3 ) );

		return {carbonAlphas, geometryAtoms, geometryBonds}
	}

	function exportPdb()
	{
		/*
			Note no hydrogens

					atom name  chain resno					  						element
			ATOM      1  N   ALA A  43       8.858  12.487  42.895  1.00 30.00           N  
			ATOM      2  CA  ALA A  43       9.496  11.840  41.783  1.00 30.00           C  
			ATOM      3  C   ALA A  43       8.449  11.397  40.767  1.00 30.00           C  
			ATOM      4  O   ALA A  43       7.378  10.919  41.102  1.00 30.00           O  
			ATOM      5  CB  ALA A  43      10.303  10.639  42.312  1.00 30.00           C  


			ATOM   1259  OXT ASN A 159      -6.568  16.728  34.653  1.00 41.23           O  
			TER    1260      ASN A 159                                                      
			ATOM   1261  N   CYS B   1      -4.889   8.927  83.639  1.00 17.65           N  


			look at what chain IDs and residue numbers are already in there and make a new one
			(Or add to an existing chain if that's what the user has specified)

			and make sure residue numbers do not collide too
		*/

		let atomNo = 1;
		let prevChain = models[0].atoms[0].chainId
		let prevResidueType = ""
		let prevResno = 0
		//don't do it by going through the pdb, state might have changed in all kinds of ways
		for(let i = 0; i < models.length; i++)
		{
			for(let j = 0; j < models[i].atoms.length; j++)
			{
				if( models[i].atoms[j].chainId !== prevChain )
				{
					"TER " + padLeft(atomNo,7) + "      " + prevResidueType + " " + prevChain +  padLeft(atom.resNo,4) + "                                                      \n"

					atomNo++
					prevChain = atom.chainId
					continue
				}
				//could make everything alanine

				let atom = models[i].atoms[j]

				"ATOM" + padLeft(atomNo,7) + "  " + padRight( atom.name, 4 )
				+ padRight(atom.residueType,4)
				padRight(atom.chainId,2)
				padLeft(atom.resNo,4)
				str += resNo + "     "

				for(let i = 0; i < 3; i++)
				{
					let coordStr = padLeft(position.getComponent(i).toFixed(3),7)
				}

				str += atom.occupancyAndTemperatureFactorString
				let element = atom.name[0]
				str += element + "  \n"

				prevResidueType = atom.residueType
				prevResno = atom.resNo
				atomNo++;
			}
		}
		//write the whole thing yourself
		//go through the pdb you currently have, get #atoms, #chains
		//is this already in a chain? urgh

		
	}
}