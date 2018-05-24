/*
 * UglyMol v0.5.7. Macromolecular Viewer for Crystallographers.
 * Copyright 2014 Nat Echols
 * Copyright 2016 Diamond Light Source Ltd
 * Copyright 2016 Marcin Wojdyr
 * Released under the MIT License.
 * Modified by Hamish Todd
 */

(function (global, factory)
{
	if( typeof exports === 'object' && typeof module !== 'undefined' )
	{
		factory(exports, require('three'))
	}
	else if( typeof define === 'function' && define.amd )
	{
		define(['exports', 'three'], factory)
	}
	else
	{
		(factory((global.UM = {}),global.THREE));
	}
}(this,(function (exports,THREE) 
{
	
'use strict'; 

var ElMap = function ElMap()
{
	this.unit_cell = null;
	this.grid = null;
	this.stats = { mean: 0.0, rms: 1.0 };
	this.block = new Block();
};

ElMap.prototype.unit = 'e/\u212B\u00B3';

// Extract a block of density for calculating an isosurface using the
// separate marching cubes implementation.
ElMap.prototype.extract_block = function extract_block (radius/*:number*/, center /*:[number,number,number]*/)
{
	if (this.grid == null || this.unit_cell == null) { return; }

	/*
		frac2grid and grid2frac is just multiplying and dividing by dims
		So those dimensions are probably the resolution, the distance between measurements
		.orth and .frac are matrices
	*/
	var grid = this.grid;
	var unit_cell = this.unit_cell;

	var r = [radius / unit_cell.parameters[0], //scale
			 radius / unit_cell.parameters[1],
			 radius / unit_cell.parameters[2]];
	var fc = multiply(center, unit_cell.frac);
	var grid_min = grid.frac2grid([fc[0] - r[0], fc[1] - r[1], fc[2] - r[2]]);
	var grid_max = grid.frac2grid([fc[0] + r[0], fc[1] + r[1], fc[2] + r[2]]);
	
	var points = [];
	var values = [];
	for (var i = grid_min[0]; i <= grid_max[0]; i++) {
	for (var j = grid_min[1]; j <= grid_max[1]; j++) {
	for (var k = grid_min[2]; k <= grid_max[2]; k++) {
		var frac = grid.grid2frac(i, j, k);
		var orth = multiply( frac, unit_cell.orth );
		points.push(orth);
		var map_value = grid.get_grid_value(i, j, k);
		values.push(map_value);
	}
	}
	}

	var size = [grid_max[0] - grid_min[0] + 1,
				grid_max[1] - grid_min[1] + 1,
				grid_max[2] - grid_min[2] + 1];
	if (size[0] <= 0 || size[1] <= 0 || size[2] <= 0) {
		throw Error('Grid dimensions are zero along at least one edge');
	}
	var len = size[0] * size[1] * size[2];
	if (values.length !== len || points.length !== len) {
		throw Error('isosurface: array size mismatch');
	}

	this.block._points = points;
	this.block._values = values;
	this.block._size = size;
};

// http://www.ccp4.ac.uk/html/maplib.html#description
// eslint-disable-next-line complexity
ElMap.prototype.from_ccp4 = function from_ccp4 (buf /*:ArrayBuffer*/)
{
	var expand_symmetry = true;

	if (buf.byteLength < 1024) { throw Error('File shorter than 1024 bytes.'); }
	//console.log('buf type: ' + Object.prototype.toString.call(buf));
	// for now we assume both file and host are little endian
	var iview = new Int32Array(buf, 0, 256);
	// word 53 - character string 'MAP ' to identify file type
	if (iview[52] !== 0x2050414d) { throw Error('not a CCP4 map'); }
	// map has 3 dimensions referred to as columns (fastest changing), rows
	// and sections (c-r-s)
	var n_crs = [iview[0], iview[1], iview[2]];
	var mode = iview[3];
	var nb;
	if (mode === 2) { nb = 4; }
	else if (mode === 0) { nb = 1; }
	else { throw Error('Only Mode 2 and Mode 0 of CCP4 map is supported.'); }
	var start = [iview[4], iview[5], iview[6]];
	var n_grid = [iview[7], iview[8], iview[9]];
	var nsymbt = iview[23]; // size of extended header in bytes
	if (1024 + nsymbt + nb*n_crs[0]*n_crs[1]*n_crs[2] !== buf.byteLength) {
		throw Error('ccp4 file too short or too long');
	}
	var fview = new Float32Array(buf, 0, buf.byteLength >> 2);
	this.unit_cell = new UnitCell(fview[10], fview[11], fview[12],
																fview[13], fview[14], fview[15]);
	// MAPC, MAPR, MAPS - axis corresp to cols, rows, sections (1,2,3 for X,Y,Z)
	var map_crs = [iview[16], iview[17], iview[18]];
	var ax = map_crs.indexOf(1);
	var ay = map_crs.indexOf(2);
	var az = map_crs.indexOf(3);

	var min = fview[19];
	var max = fview[20];
	//const sg_number = iview[22];
	//const lskflg = iview[24];
	var grid = new GridArray(n_grid);
	if (nsymbt % 4 !== 0) {
		throw Error('CCP4 map with NSYMBT not divisible by 4 is not supported.');
	}
	var data_view;
	if (mode === 2) { data_view = fview; }
	else /* mode === 0 */ { data_view = new Int8Array(buf); }
	var idx = (1024 + nsymbt) / nb | 0;

	// We assume that if DMEAN and RMS from the header are not clearly wrong
	// they are what the user wants. Because the map can cover a small part
	// of the asu and its rmsd may be different than the total rmsd.
	this.stats.mean = fview[21];
	this.stats.rms = fview[54];
	if (this.stats.mean < min || this.stats.mean > max || this.stats.rms <= 0) {
		this.stats = calculate_stddev(data_view, idx);
	}
	var b1 = 1;
	var b0 = 0;
	// if the file was converted by mapmode2to0 - scale the data
	if (mode === 0 && iview[39] === -128 && iview[40] === 127) {
		// scaling f(x)=b1*x+b0 such that f(-128)=min and f(127)=max
		b1 = (max - min) / 255.0;
		b0 = 0.5 * (min + max + b1);
	}

	var end = [start[0] + n_crs[0], start[1] + n_crs[1], start[2] + n_crs[2]];
	var it = [0, 0, 0];
	for (it[2] = start[2]; it[2] < end[2]; it[2]++) { // sections
		for (it[1] = start[1]; it[1] < end[1]; it[1]++) { // rows
			for (it[0] = start[0]; it[0] < end[0]; it[0]++) { // cols
				grid.set_grid_value(it[ax], it[ay], it[az], b1 * data_view[idx] + b0);
				idx++;
			}
		}
	}
	if (expand_symmetry && nsymbt > 0) {
		var u8view = new Uint8Array(buf);
		for (var i = 0; i+80 <= nsymbt; i += 80) {
			var j = (void 0);
			var symop = '';
			for (j = 0; j < 80; ++j) {
				symop += String.fromCharCode(u8view[1024 + i + j]);
			}
			if (/^\s*x\s*,\s*y\s*,\s*z\s*$/i.test(symop)) { continue; }// skip x,y,z
			//console.log('sym ops', symop.trim());
			var mat = parse_symop(symop);
			// Note: we apply here symops to grid points instead of coordinates.
			// In the cases we came across it is equivalent, but in general not.
			for (j = 0; j < 3; ++j) {
				mat[j][3] = Math.round(mat[j][3] * n_grid[j]) | 0;
			}
			idx = (1024 + nsymbt) / nb | 0;
			var xyz = [0, 0, 0];
			for (it[2] = start[2]; it[2] < end[2]; it[2]++) { // sections
				for (it[1] = start[1]; it[1] < end[1]; it[1]++) { // rows
					for (it[0] = start[0]; it[0] < end[0]; it[0]++) { // cols
						for (j = 0; j < 3; ++j) {
							xyz[j] = it[ax] * mat[j][0] + it[ay] * mat[j][1] +
											 it[az] * mat[j][2] + mat[j][3];
						}
						grid.set_grid_value(xyz[0], xyz[1], xyz[2],
																b1 * data_view[idx] + b0);
						idx++;
					}
				}
			}
		}
	}
	this.grid = grid;
};

// DSN6 MAP FORMAT
// http://www.uoxray.uoregon.edu/tnt/manual/node104.html
// Density values are stored as bytes.
ElMap.prototype.from_dsn6 = function from_dsn6 (buf /*: ArrayBuffer*/) {
	//console.log('buf type: ' + Object.prototype.toString.call(buf));
	var u8data = new Uint8Array(buf);
	var iview = new Int16Array(u8data.buffer);
	if (iview[18] !== 100) {
		var len = iview.length;// or only header, 256?
		for (var n = 0; n < len; n++) {
			// swapping bytes with Uint8Array like this:
			// var tmp=u8data[n*2]; u8data[n*2]=u8data[n*2+1]; u8data[n*2+1]=tmp;
			// was slowing down this whole function 5x times (!?) on V8.
			var val = iview[n];
			iview[n] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
		}
	}
	if (iview[18] !== 100) {
		throw Error('Endian swap failed');
	}
	var origin = [iview[0], iview[1], iview[2]];
	var n_real = [iview[3], iview[4], iview[5]];
	var n_grid = [iview[6], iview[7], iview[8]];
	var cell_mult = 1.0 / iview[17];
	this.unit_cell = new UnitCell(cell_mult * iview[9],
																cell_mult * iview[10],
																cell_mult * iview[11],
																cell_mult * iview[12],
																cell_mult * iview[13],
																cell_mult * iview[14]);
	var grid = new GridArray(n_grid);
	var prod = iview[15] / 100;
	var plus = iview[16];
	//var data_scale_factor = iview[15] / iview[18] + iview[16];
	// bricks have 512 (8x8x8) values
	var offset = 512;
	var n_blocks = [Math.ceil(n_real[0] / 8),
										Math.ceil(n_real[1] / 8),
										Math.ceil(n_real[2] / 8)];
	for (var zz = 0; zz < n_blocks[2]; zz++) {
		for (var yy = 0; yy < n_blocks[1]; yy++) {
			for (var xx = 0; xx < n_blocks[0]; xx++) { // loop over bricks
				for (var k = 0; k < 8; k++) {
					var z = 8 * zz + k;
					for (var j = 0; j < 8; j++) {
						var y = 8 * yy + j;
						for (var i = 0; i < 8; i++) { // loop inside brick
							var x = 8 * xx + i;
							if (x < n_real[0] && y < n_real[1] && z < n_real[2]) {
								var density = (u8data[offset] - plus) / prod;
								offset++;
								grid.set_grid_value(origin[0] + x,
																		origin[1] + y,
																		origin[2] + z, density);
							} else {
								offset += 8 - i;
								break;
							}
						}
					}
				}
			}
		}
	}
	this.stats = calculate_stddev(grid.values, 0);
	this.grid = grid;
	//this.show_debug_info();
};

var UnitCell = function UnitCell(a /*:number*/, b /*:number*/, c /*:number*/,
						alpha /*:number*/, beta /*:number*/, gamma /*:number*/) {
	if (a <= 0 || b <= 0 || c <= 0 || alpha <= 0 || beta <= 0 || gamma <= 0) {
		throw Error('Zero or negative unit cell parameter(s).');
	}
	this.parameters = [a, b, c, alpha, beta, gamma];
	var deg2rad = Math.PI / 180.0;
	var cos_alpha = Math.cos(deg2rad * alpha);
	var cos_beta = Math.cos(deg2rad * beta);
	var cos_gamma = Math.cos(deg2rad * gamma);
	var sin_alpha = Math.sin(deg2rad * alpha);
	var sin_beta = Math.sin(deg2rad * beta);
	var sin_gamma = Math.sin(deg2rad * gamma);
	if (sin_alpha === 0 || sin_beta === 0 || sin_gamma === 0) {
		throw Error('Impossible angle - N*180deg.');
	}
	var cos_alpha_star_sin_beta = (cos_beta * cos_gamma - cos_alpha) /
																	sin_gamma;
	var cos_alpha_star = cos_alpha_star_sin_beta / sin_beta;
	var s1rca2 = Math.sqrt(1.0 - cos_alpha_star * cos_alpha_star);
	// The orthogonalization matrix we use is described in ITfC B p.262:
	// "An alternative mode of orthogonalization, used by the Protein
	// Data Bank and most programs, is to align the a1 axis of the unit
	// cell with the Cartesian X_1 axis, and to align the a*_3 axis with the
	// Cartesian X_3 axis."
	//
	// Zeros in the matrices below are kept to make matrix multiplication
	// faster: they make extract_block() 2x (!) faster on V8 4.5.103,
	// no difference on FF 50.
	/* eslint-disable no-multi-spaces, comma-spacing */
	this.orth = [a, b * cos_gamma,c * cos_beta,
							 0.0, b * sin_gamma, -c * cos_alpha_star_sin_beta,
							 0.0, 0.0        ,c * sin_beta * s1rca2];
	// based on xtal.js which is based on cctbx.uctbx
	this.frac = [
		1.0 / a,
		-cos_gamma / (sin_gamma * a),
		-(cos_gamma * cos_alpha_star_sin_beta + cos_beta * sin_gamma) /
				(sin_beta * s1rca2 * sin_gamma * a),
		0.0,
		1.0 / (sin_gamma * b),
		cos_alpha_star / (s1rca2 * sin_gamma * b),
		0.0,
		0.0,
		1.0 / (sin_beta * s1rca2 * c) ];
};

// This function is only used with matrices frac and orth, which have 3 zeros.
// We skip these elements, but it doesn't affect performance (on FF50 and V8).
function multiply(xyz, mat) {
	return [mat[0] * xyz[0]  + mat[1] * xyz[1]  + mat[2] * xyz[2],
		  /*mat[3] * xyz[0]*/+ mat[4] * xyz[1]  + mat[5] * xyz[2],
		  /*mat[6] * xyz[0]  + mat[7] * xyz[1]*/+ mat[8] * xyz[2]];
}

var Block = function Block() {
	this._points = null;
	this._values = null;
	this._size = [0, 0, 0];
};

Block.prototype.clear = function clear () {
	this._points = null;
	this._values = null;
};

// @flow

function modulo(a, b) {
	var reminder = a % b;
	return reminder >= 0 ? reminder : reminder + b;
}

var GridArray = function GridArray(dim) {
	this.dim = dim; // dimensions of the grid for the entire unit cell
	this.values = new Float32Array(dim[0] * dim[1] * dim[2]);
};

GridArray.prototype.grid2index = function grid2index (i, j, k) {
	i = modulo(i, this.dim[0]);
	j = modulo(j, this.dim[1]);
	k = modulo(k, this.dim[2]);
	return this.dim[2] * (this.dim[1] * i + j) + k;
};

GridArray.prototype.grid2frac = function grid2frac (i, j, k) {
	return [i / this.dim[0], j / this.dim[1], k / this.dim[2]];
};

// return grid coordinates (rounded down) for the given fractional coordinates
GridArray.prototype.frac2grid = function frac2grid (xyz)
{
	return [Math.floor(xyz[0] * this.dim[0]) | 0,
			Math.floor(xyz[1] * this.dim[1]) | 0,
			Math.floor(xyz[2] * this.dim[2]) | 0];
};

GridArray.prototype.set_grid_value = function set_grid_value (i, j, k, value) {
	var idx = this.grid2index(i, j, k);
	this.values[idx] = value;
};

GridArray.prototype.get_grid_value = function get_grid_value (i, j, k) {
	var idx = this.grid2index(i, j, k);
	return this.values[idx];
};

function calculate_stddev(a, offset) {
	var sum = 0;
	var sq_sum = 0;
	var alen = a.length;
	for (var i = offset; i < alen; i++) {
		sum += a[i];
		sq_sum += a[i] * a[i];
	}
	var mean = sum / (alen - offset);
	var variance = sq_sum / (alen - offset) - mean * mean;
	return {mean: mean, rms: Math.sqrt(variance)};
}

// symop -> matrix ([x,y,z] = matrix * [x,y,z,1])
function parse_symop(symop) {
	var ops = symop.toLowerCase().replace(/\s+/g, '').split(',');
	if (ops.length !== 3) { throw Error('Unexpected symop: ' + symop); }
	var mat = [];
	for (var i = 0; i < 3; i++) {
		var terms = ops[i].split(/(?=[+-])/);
		var row = [0, 0, 0, 0];
		for (var j = 0; j < terms.length; j++) {
			var term = terms[j];
			var sign = (term[0] === '-' ? -1 : 1);
			var m = terms[j].match(/^[+-]?([xyz])$/);
			if (m) {
				var pos = {x: 0, y: 1, z: 2}[m[1]];
				row[pos] = sign;
			} else {
				m = terms[j].match(/^[+-]?(\d)\/(\d)$/);
				if (!m) { throw Error('What is ' + terms[j] + ' in ' + symop); }
				row[3] = sign * Number(m[1]) / Number(m[2]);
			}
		}
		mat.push(row);
	}
	return mat;
}

exports.ElMap = ElMap;

})));