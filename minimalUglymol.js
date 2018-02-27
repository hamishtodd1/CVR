/*
 * UglyMol v0.5.7. Macromolecular Viewer for Crystallographers.
 * Copyright 2014 Nat Echols
 * Copyright 2016 Diamond Light Source Ltd
 * Copyright 2016 Marcin Wojdyr
 * Released under the MIT License.
 * Modified by Hamish Todd
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
	typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
	(factory((global.UM = {}),global.THREE));
}(this, (function (exports,THREE) { 'use strict'; 

function marchingCubes(dims, values, points, isolevel, method)
{
	var seg_table = (method === 'squarish' ? segTable2 : segTable);
	var vlist = new Array(12);
	var vert_offsets = calculateVertOffsets(dims);
	var p0 = [0, 0, 0];
	var cornerPositions = [p0, p0, p0, p0, p0, p0, p0, p0];
	var cornerValues = new Float32Array(8);
	var size_x = dims[0];
	var size_y = dims[1];
	var size_z = dims[2];
	if (values == null || points == null)
	{
		return;
	}

	var vertices = [];
	var segments = [];
	var faces = [];
	var vertex_count = 0;
	for (var x = 0; x < size_x - 1; x++) {
	for (var y = 0; y < size_y - 1; y++) {
	for (var z = 0; z < size_z - 1; z++) {
		// polygonize( fx, fy, fz, q, isolevel );
		/*
			Bring in polygonize
			No scope.delta
			vlist does not have same meaning
			adding nlist as well

		*/


		var offset0 = z + size_z * (y + size_y * x);
		var i = (void 0);
		var j = (void 0);
		var cubeindex = 0;
		for (i = 0; i < 8; ++i)
		{
			j = offset0 + vert_offsets[i];
			cornerPositions[i] = points[j];
			cornerValues[i] = values[j];
			cubeindex |= (cornerValues[i] < isolevel) ? 1 << i : 0;
		}
		if (cubeindex === 0 || cubeindex === 255) { continue; }


		// 12 bit number, indicates which edges are crossed by the isosurface
		var edge_mask = edgeTable[cubeindex];

		// check which edges are crossed, and estimate the point location
		// using a weighted average of scalar values at edge endpoints.
		for (i = 0; i < 12; ++i) 
		{
			if ((edge_mask & (1 << i)) !== 0)
			{
				var e = edgeIndex[i];
				var mu = (isolevel - cornerValues[e[0]]) /
							(cornerValues[e[1]] - cornerValues[e[0]]);
				var p1 = cornerPositions[e[0]];
				var p2 = cornerPositions[e[1]];

				vertices.push(	p1[0] + (p2[0] - p1[0]) * mu,
								p1[1] + (p2[1] - p1[1]) * mu,
								p1[2] + (p2[2] - p1[2]) * mu);
				vlist[i] = vertex_count++;
			}
		}
		var t = seg_table[cubeindex];
		for (i = 0; i < t.length; i++) {
			segments.push(vlist[t[i]]);
		}
	}
	}
	}
	return { vertices: vertices, segments: segments, faces: faces };
}

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
		points.push(orth); //so these things could well be in an imperfect grid. Could ask Paul
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

ElMap.prototype.isomesh_in_block = function isomesh_in_block (sigma/*:number*/, method/*:string*/)
{
	var abs_level = sigma * this.stats.rms + this.stats.mean;
	return marchingCubes(this.block._size, this.block._values, this.block._points,
											 abs_level, method);
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

UnitCell.prototype.orthogonalize = function orthogonalize (xyz /*:[number,number,number]*/) {
  return multiply(xyz, this.orth);
};

// A cube with 3 edges (for x, y, z axes) colored in red, green and blue.
UnitCell.prototype.getMesh = function getMesh()
{
	var orthogonalMatrix = this.orth;
	var vertices = CUBE_EDGES.map(function (a) {
		return { xyz: multiply(a, orthogonalMatrix) };
	});
	var colors = [
		new THREE.Color(0xff0000), new THREE.Color(0xffaa00),
		new THREE.Color(0x00ff00), new THREE.Color(0xaaff00),
		new THREE.Color(0x0000ff), new THREE.Color(0x00aaff) ];
	for (var j = 6; j < CUBE_EDGES.length; j++) {
		colors.push({r:1,g:1,b:1});
	}
	var material = makeLineMaterial({
		gl_lines: true,
		linewidth: 1,
		segments: true,
	});
	// $FlowFixMe: the type of vertices confuses flow
	return makeLineSegments(material, vertices, colors);
}

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

Block.prototype.empty = function empty () /*:boolean*/ {
	return this._values === null;
};

// return offsets relative to vertex [0,0,0]
function calculateVertOffsets(dims) {
	var vert_offsets = [];
	for (var i = 0; i < 8; ++i) {
		var v = cubeVerts[i];
		vert_offsets.push(v[0] + dims[2] * (v[1] + dims[1] * v[2]));
	}
	return vert_offsets;
}

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

GridArray.prototype.grid2index_unchecked = function grid2index_unchecked (i, j, k) {
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

var CUBE_EDGES = [[0, 0, 0], [1, 0, 0],
										[0, 0, 0], [0, 1, 0],
										[0, 0, 0], [0, 0, 1],
										[1, 0, 0], [1, 1, 0],
										[1, 0, 0], [1, 0, 1],
										[0, 1, 0], [1, 1, 0],
										[0, 1, 0], [0, 1, 1],
										[0, 0, 1], [1, 0, 1],
										[0, 0, 1], [0, 1, 1],
										[1, 0, 1], [1, 1, 1],
										[1, 1, 0], [1, 1, 1],
										[0, 1, 1], [1, 1, 1]];

function makeCube(size /*:number*/,
				 ctr /*:Vector3*/,
				 options /*:{[key:string]: any}*/) {
	var vertices = CUBE_EDGES.map(function (a) {
		return {
			x: ctr.x + size * (a[0] - 0.5),
			y: ctr.y + size * (a[1] - 0.5),
			z: ctr.z + size * (a[2] - 0.5)};
	});
	var material = makeLineMaterial({
		gl_lines: true,
		color: options.color,
		linewidth: options.linewidth,
		win_size: options.win_size,
		segments: true,
	});
	return makeLineSegments(material, vertices);
}

function makeSimpleLineMaterial(options) {
	var mparams = {};
	mparams.linewidth = options.linewidth;
	if (options.color === undefined) {
		mparams.vertexColors = THREE.VertexColors;
	} else {
		mparams.color = options.color;
	}
	return new THREE.LineBasicMaterial(mparams);
}

function makeThickLineMaterial(options) {
	var uniforms = makeUniforms({
		linewidth: options.linewidth,
		win_size: options.win_size,
	});
	return new THREE.ShaderMaterial({
		uniforms: uniforms,
		vertexShader: options.segments ? wide_segments_vert : wide_line_vert,
		fragmentShader: wide_line_frag,
		fog: true,
		vertexColors: THREE.VertexColors,
	});
}

function makeLineMaterial(options /*:{[key: string]: mixed}*/) {
	return options.gl_lines ? makeSimpleLineMaterial(options)
													: makeThickLineMaterial(options);
}

function makeSimpleGeometry(vertices /*:Vector3[] | AtomT[]*/,
														colors /*:?Color[]*/) {
	var geometry = new THREE.BufferGeometry();
	var pos = new Float32Array(vertices.length * 3);
	var i;
	if (vertices && vertices[0].xyz) {
		for (i = 0; i < vertices.length; i++) {
			// $FlowFixMe: disjoint unions not smart enough
			var xyz /*:Num3*/ = vertices[i].xyz;
			pos[3*i] = xyz[0];
			pos[3*i+1] = xyz[1];
			pos[3*i+2] = xyz[2];
		}
	} else {
		for (i = 0; i < vertices.length; i++) {
			// $FlowFixMe
			var v /*:Vector3*/ = vertices[i];
			pos[3*i] = v.x;
			pos[3*i+1] = v.y;
			pos[3*i+2] = v.z;
		}
	}
	geometry.addAttribute('position', new THREE.BufferAttribute(pos, 3));
	if (colors != null) {
		var col = new Float32Array(colors.length * 3);
		for (i = 0; i < colors.length; i++) {
			var c = colors[i];
			col[3*i] = c.r;
			col[3*i+1] = c.g;
			col[3*i+2] = c.b;
		}
		geometry.addAttribute('color', new THREE.BufferAttribute(col, 3));
	}
	return geometry;
}

function makeLineSegments(material /*:THREE.Material*/,
																 vertices /*:Vector3[] | AtomT[]*/,
																 colors /*:?Color[]*/) {
	if (material.isShaderMaterial) {
		return makeThickLineSegments(material, vertices, colors);
	} else {
		return new THREE.LineSegments(makeSimpleGeometry(vertices, colors),
																	material);
	}
}



var edgeTable = new Int32Array([
	0x0  , 0x0  , 0x202, 0x302, 0x406, 0x406, 0x604, 0x704,
	0x804, 0x805, 0xa06, 0xa06, 0xc0a, 0xd03, 0xe08, 0xf00,
	0x90 , 0x98 , 0x292, 0x292, 0x496, 0x49e, 0x694, 0x694,
	0x894, 0x894, 0xa96, 0xa96, 0xc9a, 0xc92, 0xe91, 0xe90,
	0x230, 0x230, 0x33 , 0x13a, 0x636, 0x636, 0x434, 0x43c,
	0xa34, 0xa35, 0x837, 0x936, 0xe3a, 0xf32, 0xc31, 0xd30,
	0x2a0, 0x2a8, 0xa3 , 0xaa , 0x6a6, 0x6af, 0x5a4, 0x4ac,
	0xaa4, 0xaa4, 0x9a6, 0x8a6, 0xfaa, 0xea3, 0xca1, 0xca0,
	0x460, 0x460, 0x662, 0x762, 0x66 , 0x66 , 0x265, 0x364,
	0xc64, 0xc65, 0xe66, 0xe66, 0x86a, 0x863, 0xa69, 0xa60,
	0x4f0, 0x4f8, 0x6f2, 0x6f2, 0xf6 , 0xfe , 0x2f5, 0x2fc,
	0xcf4, 0xcf4, 0xef6, 0xef6, 0x8fa, 0x8f3, 0xaf9, 0xaf0,
	0x650, 0x650, 0x453, 0x552, 0x256, 0x256, 0x54 , 0x154,
	0xe54, 0xf54, 0xc57, 0xd56, 0xa5a, 0xb52, 0x859, 0x950,
	0x7c0, 0x6c1, 0x5c2, 0x4c2, 0x3c6, 0x2ce, 0xc5 , 0xc4 ,
	0xfc4, 0xec5, 0xdc6, 0xcc6, 0xbca, 0xac2, 0x8c1, 0x8c0,
	0x8c0, 0x8c0, 0xac2, 0xbc2, 0xcc6, 0xcc6, 0xec4, 0xfcc,
	0xc4 , 0xc5 , 0x2c6, 0x3c6, 0x4c2, 0x5c2, 0x6c1, 0x7c0,
	0x950, 0x859, 0xb52, 0xa5a, 0xd56, 0xc57, 0xe54, 0xe5c,
	0x154, 0x54 , 0x25e, 0x256, 0x552, 0x453, 0x658, 0x650,
	0xaf0, 0xaf0, 0x8f3, 0x8fa, 0xef6, 0xef6, 0xcf4, 0xcfc,
	0x2f4, 0x3f5, 0xff , 0x1f6, 0x6f2, 0x6f3, 0x4f9, 0x5f0,
	0xa60, 0xa69, 0x863, 0x86a, 0xe66, 0xe67, 0xd65, 0xc6c,
	0x364, 0x265, 0x166, 0x66 , 0x76a, 0x663, 0x460, 0x460,
	0xca0, 0xca0, 0xea2, 0xfa2, 0x8a6, 0x8a6, 0xaa4, 0xba4,
	0x4ac, 0x5a4, 0x6ae, 0x7a6, 0xaa , 0xa3 , 0x2a8, 0x2a0,
	0xd30, 0xc31, 0xf32, 0xe3a, 0x936, 0x837, 0xb35, 0xa34,
	0x43c, 0x434, 0x73e, 0x636, 0x13a, 0x33 , 0x339, 0x230,
	0xe90, 0xe90, 0xc92, 0xc9a, 0xa96, 0xa96, 0x894, 0x89c,
	0x694, 0x695, 0x49f, 0x496, 0x292, 0x392, 0x98 , 0x90 ,
	0xf00, 0xe08, 0xd03, 0xc0a, 0xa06, 0xa0e, 0x805, 0x804,
	0x704, 0x604, 0x506, 0x406, 0x302, 0x202, 0x0  , 0x0]);

var triTable = [
      [],
      [0, 8, 3],
      [0, 1, 9],
      [1, 8, 3, 9, 8, 1],
      [1, 2, 10],
      [0, 8, 3, 1, 2, 10],
      [9, 2, 10, 0, 2, 9],
      [2, 8, 3, 2, 10, 8, 10, 9, 8],
      [3, 11, 2],
      [0, 11, 2, 8, 11, 0],
      [1, 9, 0, 2, 3, 11],
      [1, 11, 2, 1, 9, 11, 9, 8, 11],
      [3, 10, 1, 11, 10, 3],
      [0, 10, 1, 0, 8, 10, 8, 11, 10],
      [3, 9, 0, 3, 11, 9, 11, 10, 9],
      [9, 8, 10, 10, 8, 11],
      [4, 7, 8],
      [4, 3, 0, 7, 3, 4],
      [0, 1, 9, 8, 4, 7],
      [4, 1, 9, 4, 7, 1, 7, 3, 1],
      [1, 2, 10, 8, 4, 7],
      [3, 4, 7, 3, 0, 4, 1, 2, 10],
      [9, 2, 10, 9, 0, 2, 8, 4, 7],
      [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4],
      [8, 4, 7, 3, 11, 2],
      [11, 4, 7, 11, 2, 4, 2, 0, 4],
      [9, 0, 1, 8, 4, 7, 2, 3, 11],
      [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1],
      [3, 10, 1, 3, 11, 10, 7, 8, 4],
      [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4],
      [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3],
      [4, 7, 11, 4, 11, 9, 9, 11, 10],
      [9, 5, 4],
      [9, 5, 4, 0, 8, 3],
      [0, 5, 4, 1, 5, 0],
      [8, 5, 4, 8, 3, 5, 3, 1, 5],
      [1, 2, 10, 9, 5, 4],
      [3, 0, 8, 1, 2, 10, 4, 9, 5],
      [5, 2, 10, 5, 4, 2, 4, 0, 2],
      [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8],
      [9, 5, 4, 2, 3, 11],
      [0, 11, 2, 0, 8, 11, 4, 9, 5],
      [0, 5, 4, 0, 1, 5, 2, 3, 11],
      [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5],
      [10, 3, 11, 10, 1, 3, 9, 5, 4],
      [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10],
      [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3],
      [5, 4, 8, 5, 8, 10, 10, 8, 11],
      [9, 7, 8, 5, 7, 9],
      [9, 3, 0, 9, 5, 3, 5, 7, 3],
      [0, 7, 8, 0, 1, 7, 1, 5, 7],
      [1, 5, 3, 3, 5, 7],
      [9, 7, 8, 9, 5, 7, 10, 1, 2],
      [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3],
      [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2],
      [2, 10, 5, 2, 5, 3, 3, 5, 7],
      [7, 9, 5, 7, 8, 9, 3, 11, 2],
      [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11],
      [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7],
      [11, 2, 1, 11, 1, 7, 7, 1, 5],
      [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11],
      [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0],
      [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0],
      [11, 10, 5, 7, 11, 5],
      [10, 6, 5],
      [0, 8, 3, 5, 10, 6],
      [9, 0, 1, 5, 10, 6],
      [1, 8, 3, 1, 9, 8, 5, 10, 6],
      [1, 6, 5, 2, 6, 1],
      [1, 6, 5, 1, 2, 6, 3, 0, 8],
      [9, 6, 5, 9, 0, 6, 0, 2, 6],
      [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8],
      [2, 3, 11, 10, 6, 5],
      [11, 0, 8, 11, 2, 0, 10, 6, 5],
      [0, 1, 9, 2, 3, 11, 5, 10, 6],
      [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11],
      [6, 3, 11, 6, 5, 3, 5, 1, 3],
      [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6],
      [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9],
      [6, 5, 9, 6, 9, 11, 11, 9, 8],
      [5, 10, 6, 4, 7, 8],
      [4, 3, 0, 4, 7, 3, 6, 5, 10],
      [1, 9, 0, 5, 10, 6, 8, 4, 7],
      [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4],
      [6, 1, 2, 6, 5, 1, 4, 7, 8],
      [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7],
      [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6],
      [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9],
      [3, 11, 2, 7, 8, 4, 10, 6, 5],
      [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11],
      [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6],
      [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6],
      [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6],
      [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11],
      [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7],
      [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9],
      [10, 4, 9, 6, 4, 10],
      [4, 10, 6, 4, 9, 10, 0, 8, 3],
      [10, 0, 1, 10, 6, 0, 6, 4, 0],
      [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10],
      [1, 4, 9, 1, 2, 4, 2, 6, 4],
      [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4],
      [0, 2, 4, 4, 2, 6],
      [8, 3, 2, 8, 2, 4, 4, 2, 6],
      [10, 4, 9, 10, 6, 4, 11, 2, 3],
      [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6],
      [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10],
      [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1],
      [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3],
      [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1],
      [3, 11, 6, 3, 6, 0, 0, 6, 4],
      [6, 4, 8, 11, 6, 8],
      [7, 10, 6, 7, 8, 10, 8, 9, 10],
      [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10],
      [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0],
      [10, 6, 7, 10, 7, 1, 1, 7, 3],
      [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7],
      [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9],
      [7, 8, 0, 7, 0, 6, 6, 0, 2],
      [7, 3, 2, 6, 7, 2],
      [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7],
      [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7],
      [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11],
      [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1],
      [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6],
      [0, 9, 1, 11, 6, 7],
      [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0],
      [7, 11, 6],
      [7, 6, 11],
      [3, 0, 8, 11, 7, 6],
      [0, 1, 9, 11, 7, 6],
      [8, 1, 9, 8, 3, 1, 11, 7, 6],
      [10, 1, 2, 6, 11, 7],
      [1, 2, 10, 3, 0, 8, 6, 11, 7],
      [2, 9, 0, 2, 10, 9, 6, 11, 7],
      [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8],
      [7, 2, 3, 6, 2, 7],
      [7, 0, 8, 7, 6, 0, 6, 2, 0],
      [2, 7, 6, 2, 3, 7, 0, 1, 9],
      [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6],
      [10, 7, 6, 10, 1, 7, 1, 3, 7],
      [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8],
      [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7],
      [7, 6, 10, 7, 10, 8, 8, 10, 9],
      [6, 8, 4, 11, 8, 6],
      [3, 6, 11, 3, 0, 6, 0, 4, 6],
      [8, 6, 11, 8, 4, 6, 9, 0, 1],
      [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6],
      [6, 8, 4, 6, 11, 8, 2, 10, 1],
      [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6],
      [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9],
      [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3],
      [8, 2, 3, 8, 4, 2, 4, 6, 2],
      [0, 4, 2, 4, 6, 2],
      [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8],
      [1, 9, 4, 1, 4, 2, 2, 4, 6],
      [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1],
      [10, 1, 0, 10, 0, 6, 6, 0, 4],
      [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3],
      [10, 9, 4, 6, 10, 4],
      [4, 9, 5, 7, 6, 11],
      [0, 8, 3, 4, 9, 5, 11, 7, 6],
      [5, 0, 1, 5, 4, 0, 7, 6, 11],
      [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5],
      [9, 5, 4, 10, 1, 2, 7, 6, 11],
      [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5],
      [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2],
      [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6],
      [7, 2, 3, 7, 6, 2, 5, 4, 9],
      [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7],
      [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0],
      [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8],
      [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7],
      [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4],
      [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10],
      [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10],
      [6, 9, 5, 6, 11, 9, 11, 8, 9],
      [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5],
      [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11],
      [6, 11, 3, 6, 3, 5, 5, 3, 1],
      [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6],
      [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10],
      [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5],
      [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3],
      [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2],
      [9, 5, 6, 9, 6, 0, 0, 6, 2],
      [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8],
      [1, 5, 6, 2, 1, 6],
      [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6],
      [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0],
      [0, 3, 8, 5, 6, 10],
      [10, 5, 6],
      [11, 5, 10, 7, 5, 11],
      [11, 5, 10, 11, 7, 5, 8, 3, 0],
      [5, 11, 7, 5, 10, 11, 1, 9, 0],
      [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1],
      [11, 1, 2, 11, 7, 1, 7, 5, 1],
      [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11],
      [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7],
      [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2],
      [2, 5, 10, 2, 3, 5, 3, 7, 5],
      [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5],
      [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2],
      [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2],
      [1, 3, 5, 3, 7, 5],
      [0, 8, 7, 0, 7, 1, 1, 7, 5],
      [9, 0, 3, 9, 3, 5, 5, 3, 7],
      [9, 8, 7, 5, 9, 7],
      [5, 8, 4, 5, 10, 8, 10, 11, 8],
      [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0],
      [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5],
      [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4],
      [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8],
      [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11],
      [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5],
      [9, 4, 5, 2, 11, 3],
      [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4],
      [5, 10, 2, 5, 2, 4, 4, 2, 0],
      [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9],
      [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2],
      [8, 4, 5, 8, 5, 3, 3, 5, 1],
      [0, 4, 5, 1, 0, 5],
      [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5],
      [9, 4, 5],
      [4, 11, 7, 4, 9, 11, 9, 10, 11],
      [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11],
      [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11],
      [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4],
      [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2],
      [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3],
      [11, 7, 4, 11, 4, 2, 2, 4, 0],
      [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4],
      [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9],
      [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7],
      [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10],
      [1, 10, 2, 8, 7, 4],
      [4, 9, 1, 4, 1, 7, 7, 1, 3],
      [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1],
      [4, 0, 3, 7, 4, 3],
      [4, 8, 7],
      [9, 10, 8, 10, 11, 8],
      [3, 0, 9, 3, 9, 11, 11, 9, 10],
      [0, 1, 10, 0, 10, 8, 8, 10, 11],
      [3, 1, 10, 11, 3, 10],
      [1, 2, 11, 1, 11, 9, 9, 11, 8],
      [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9],
      [0, 2, 11, 8, 0, 11],
      [3, 2, 11],
      [2, 3, 8, 2, 8, 10, 10, 8, 9],
      [9, 10, 2, 0, 9, 2],
      [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8],
      [1, 10, 2],
      [1, 3, 8, 9, 1, 8],
      [0, 9, 1],
      [0, 3, 8],
      []];

// generated from classical triTable by tools/isolut.py
var segTable = [
	[],
	[],
	[1, 9],
	[1, 8, 1, 9],
	[2, 10, 10, 1],
	[2, 10, 10, 1],
	[9, 2, 2, 10, 10, 9],
	[2, 8, 2, 10, 10, 8, 10, 9],
	[11, 2],
	[0, 11, 11, 2],
	[1, 9, 11, 2],
	[1, 11, 11, 2, 1, 9, 9, 11],
	[3, 10, 10, 1, 11, 10],
	[0, 10, 10, 1, 8, 10, 11, 10],
	[3, 9, 11, 9, 11, 10, 10, 9],
	[8, 10, 10, 9, 11, 10],
	[4, 7],
	[4, 3, 4, 7],
	[1, 9, 4, 7],
	[4, 1, 1, 9, 4, 7, 7, 1],
	[2, 10, 10, 1, 4, 7],
	[3, 4, 4, 7, 2, 10, 10, 1],
	[9, 2, 2, 10, 10, 9, 4, 7],
	[2, 10, 10, 9, 9, 2, 9, 7, 7, 2, 4, 7],
	[4, 7, 11, 2],
	[11, 4, 4, 7, 11, 2, 2, 4],
	[1, 9, 4, 7, 11, 2],
	[4, 7, 11, 4, 11, 9, 11, 2, 2, 9, 1, 9],
	[3, 10, 10, 1, 11, 10, 4, 7],
	[1, 11, 11, 10, 10, 1, 1, 4, 4, 11, 4, 7],
	[4, 7, 0, 11, 11, 9, 11, 10, 10, 9],
	[4, 7, 11, 4, 11, 9, 11, 10, 10, 9],
	[9, 5, 5, 4],
	[9, 5, 5, 4],
	[0, 5, 5, 4, 1, 5],
	[8, 5, 5, 4, 3, 5, 1, 5],
	[2, 10, 10, 1, 9, 5, 5, 4],
	[2, 10, 10, 1, 9, 5, 5, 4],
	[5, 2, 2, 10, 10, 5, 5, 4, 4, 2],
	[2, 10, 10, 5, 5, 2, 5, 3, 5, 4, 4, 3],
	[9, 5, 5, 4, 11, 2],
	[0, 11, 11, 2, 9, 5, 5, 4],
	[0, 5, 5, 4, 1, 5, 11, 2],
	[1, 5, 5, 2, 5, 8, 8, 2, 11, 2, 5, 4],
	[10, 3, 11, 10, 10, 1, 9, 5, 5, 4],
	[9, 5, 5, 4, 8, 1, 8, 10, 10, 1, 11, 10],
	[5, 4, 0, 5, 0, 11, 11, 5, 11, 10, 10, 5],
	[5, 4, 8, 5, 8, 10, 10, 5, 11, 10],
	[9, 7, 5, 7, 9, 5],
	[9, 3, 9, 5, 5, 3, 5, 7],
	[0, 7, 1, 7, 1, 5, 5, 7],
	[1, 5, 5, 3, 5, 7],
	[9, 7, 9, 5, 5, 7, 10, 1, 2, 10],
	[10, 1, 2, 10, 9, 5, 5, 0, 5, 3, 5, 7],
	[2, 8, 2, 5, 5, 8, 5, 7, 10, 5, 2, 10],
	[2, 10, 10, 5, 5, 2, 5, 3, 5, 7],
	[7, 9, 9, 5, 5, 7, 11, 2],
	[9, 5, 5, 7, 7, 9, 7, 2, 2, 9, 11, 2],
	[11, 2, 1, 8, 1, 7, 1, 5, 5, 7],
	[11, 2, 1, 11, 1, 7, 1, 5, 5, 7],
	[9, 5, 5, 8, 5, 7, 10, 1, 3, 10, 11, 10],
	[5, 7, 7, 0, 0, 5, 9, 5, 11, 0, 0, 10, 10, 1, 11, 10],
	[11, 10, 10, 0, 0, 11, 10, 5, 5, 0, 0, 7, 5, 7],
	[11, 10, 10, 5, 5, 11, 5, 7],
	[10, 6, 6, 5, 5, 10],
	[5, 10, 10, 6, 6, 5],
	[1, 9, 5, 10, 10, 6, 6, 5],
	[1, 8, 1, 9, 5, 10, 10, 6, 6, 5],
	[1, 6, 6, 5, 5, 1, 2, 6],
	[1, 6, 6, 5, 5, 1, 2, 6],
	[9, 6, 6, 5, 5, 9, 0, 6, 2, 6],
	[5, 9, 8, 5, 8, 2, 2, 5, 2, 6, 6, 5],
	[11, 2, 10, 6, 6, 5, 5, 10],
	[11, 0, 11, 2, 10, 6, 6, 5, 5, 10],
	[1, 9, 11, 2, 5, 10, 10, 6, 6, 5],
	[5, 10, 10, 6, 6, 5, 1, 9, 9, 2, 9, 11, 11, 2],
	[6, 3, 11, 6, 6, 5, 5, 3, 5, 1],
	[11, 0, 11, 5, 5, 0, 5, 1, 11, 6, 6, 5],
	[11, 6, 6, 3, 6, 0, 6, 5, 5, 0, 5, 9],
	[6, 5, 5, 9, 9, 6, 9, 11, 11, 6],
	[5, 10, 10, 6, 6, 5, 4, 7],
	[4, 3, 4, 7, 6, 5, 5, 10, 10, 6],
	[1, 9, 5, 10, 10, 6, 6, 5, 4, 7],
	[10, 6, 6, 5, 5, 10, 1, 9, 9, 7, 7, 1, 4, 7],
	[6, 1, 2, 6, 6, 5, 5, 1, 4, 7],
	[2, 5, 5, 1, 2, 6, 6, 5, 4, 3, 4, 7],
	[4, 7, 0, 5, 5, 9, 0, 6, 6, 5, 2, 6],
	[3, 9, 9, 7, 4, 7, 2, 9, 5, 9, 9, 6, 6, 5, 2, 6],
	[11, 2, 4, 7, 10, 6, 6, 5, 5, 10],
	[5, 10, 10, 6, 6, 5, 4, 7, 7, 2, 2, 4, 11, 2],
	[1, 9, 4, 7, 11, 2, 5, 10, 10, 6, 6, 5],
	[9, 2, 1, 9, 9, 11, 11, 2, 4, 11, 4, 7, 5, 10, 10, 6, 6, 5],
	[4, 7, 11, 5, 5, 3, 5, 1, 11, 6, 6, 5],
	[5, 1, 1, 11, 11, 5, 11, 6, 6, 5, 0, 11, 11, 4, 4, 7],
	[0, 5, 5, 9, 0, 6, 6, 5, 3, 6, 11, 6, 4, 7],
	[6, 5, 5, 9, 9, 6, 9, 11, 11, 6, 4, 7, 7, 9],
	[10, 4, 9, 10, 6, 4, 10, 6],
	[4, 10, 10, 6, 6, 4, 9, 10],
	[10, 0, 1, 10, 10, 6, 6, 0, 6, 4],
	[1, 8, 1, 6, 6, 8, 6, 4, 1, 10, 10, 6],
	[1, 4, 9, 1, 2, 4, 2, 6, 6, 4],
	[2, 9, 9, 1, 2, 4, 2, 6, 6, 4],
	[2, 4, 2, 6, 6, 4],
	[2, 8, 2, 4, 2, 6, 6, 4],
	[10, 4, 9, 10, 10, 6, 6, 4, 11, 2],
	[8, 2, 11, 2, 9, 10, 10, 4, 10, 6, 6, 4],
	[11, 2, 1, 6, 6, 0, 6, 4, 1, 10, 10, 6],
	[6, 4, 4, 1, 1, 6, 1, 10, 10, 6, 8, 1, 1, 11, 11, 2],
	[9, 6, 6, 4, 9, 3, 3, 6, 9, 1, 11, 6],
	[11, 1, 1, 8, 11, 6, 6, 1, 9, 1, 1, 4, 6, 4],
	[11, 6, 6, 3, 6, 0, 6, 4],
	[6, 4, 8, 6, 11, 6],
	[7, 10, 10, 6, 6, 7, 8, 10, 9, 10],
	[0, 7, 0, 10, 10, 7, 9, 10, 6, 7, 10, 6],
	[10, 6, 6, 7, 7, 10, 1, 10, 7, 1, 8, 1],
	[10, 6, 6, 7, 7, 10, 7, 1, 1, 10],
	[2, 6, 6, 1, 6, 8, 8, 1, 9, 1, 6, 7],
	[2, 6, 6, 9, 9, 2, 9, 1, 6, 7, 7, 9, 9, 3],
	[0, 7, 0, 6, 6, 7, 2, 6],
	[2, 7, 6, 7, 2, 6],
	[11, 2, 10, 6, 6, 8, 8, 10, 9, 10, 6, 7],
	[0, 7, 7, 2, 11, 2, 9, 7, 6, 7, 7, 10, 10, 6, 9, 10],
	[1, 8, 1, 7, 1, 10, 10, 7, 6, 7, 10, 6, 11, 2],
	[11, 2, 1, 11, 1, 7, 10, 6, 6, 1, 1, 10, 6, 7],
	[9, 6, 6, 8, 6, 7, 9, 1, 1, 6, 11, 6, 6, 3],
	[9, 1, 11, 6, 6, 7],
	[0, 7, 0, 6, 6, 7, 11, 0, 11, 6],
	[11, 6, 6, 7],
	[7, 6, 6, 11],
	[7, 6, 6, 11],
	[1, 9, 7, 6, 6, 11],
	[8, 1, 1, 9, 7, 6, 6, 11],
	[10, 1, 2, 10, 6, 11, 7, 6],
	[2, 10, 10, 1, 6, 11, 7, 6],
	[2, 9, 2, 10, 10, 9, 6, 11, 7, 6],
	[6, 11, 7, 6, 2, 10, 10, 3, 10, 8, 10, 9],
	[7, 2, 6, 2, 7, 6],
	[7, 0, 7, 6, 6, 0, 6, 2],
	[2, 7, 7, 6, 6, 2, 1, 9],
	[1, 6, 6, 2, 1, 8, 8, 6, 1, 9, 7, 6],
	[10, 7, 7, 6, 6, 10, 10, 1, 1, 7],
	[10, 7, 7, 6, 6, 10, 1, 7, 10, 1, 1, 8],
	[7, 0, 7, 10, 10, 0, 10, 9, 6, 10, 7, 6],
	[7, 6, 6, 10, 10, 7, 10, 8, 10, 9],
	[6, 8, 4, 6, 6, 11],
	[3, 6, 6, 11, 0, 6, 4, 6],
	[8, 6, 6, 11, 4, 6, 1, 9],
	[4, 6, 6, 9, 6, 3, 3, 9, 1, 9, 6, 11],
	[6, 8, 4, 6, 6, 11, 2, 10, 10, 1],
	[2, 10, 10, 1, 0, 11, 0, 6, 6, 11, 4, 6],
	[4, 11, 4, 6, 6, 11, 2, 9, 2, 10, 10, 9],
	[10, 9, 9, 3, 3, 10, 2, 10, 4, 3, 3, 6, 6, 11, 4, 6],
	[8, 2, 4, 2, 4, 6, 6, 2],
	[4, 2, 4, 6, 6, 2],
	[1, 9, 3, 4, 4, 2, 4, 6, 6, 2],
	[1, 9, 4, 1, 4, 2, 4, 6, 6, 2],
	[8, 1, 8, 6, 6, 1, 4, 6, 6, 10, 10, 1],
	[10, 1, 0, 10, 0, 6, 6, 10, 4, 6],
	[4, 6, 6, 3, 3, 4, 6, 10, 10, 3, 3, 9, 10, 9],
	[10, 9, 4, 10, 6, 10, 4, 6],
	[9, 5, 5, 4, 7, 6, 6, 11],
	[9, 5, 5, 4, 7, 6, 6, 11],
	[5, 0, 1, 5, 5, 4, 7, 6, 6, 11],
	[7, 6, 6, 11, 3, 4, 3, 5, 5, 4, 1, 5],
	[9, 5, 5, 4, 10, 1, 2, 10, 7, 6, 6, 11],
	[6, 11, 7, 6, 2, 10, 10, 1, 9, 5, 5, 4],
	[7, 6, 6, 11, 5, 4, 4, 10, 10, 5, 4, 2, 2, 10],
	[3, 4, 3, 5, 5, 4, 2, 5, 10, 5, 2, 10, 7, 6, 6, 11],
	[7, 2, 7, 6, 6, 2, 5, 4, 9, 5],
	[9, 5, 5, 4, 8, 6, 6, 0, 6, 2, 7, 6],
	[3, 6, 6, 2, 7, 6, 1, 5, 5, 0, 5, 4],
	[6, 2, 2, 8, 8, 6, 7, 6, 1, 8, 8, 5, 5, 4, 1, 5],
	[9, 5, 5, 4, 10, 1, 1, 6, 6, 10, 1, 7, 7, 6],
	[1, 6, 6, 10, 10, 1, 1, 7, 7, 6, 0, 7, 9, 5, 5, 4],
	[0, 10, 10, 4, 10, 5, 5, 4, 3, 10, 6, 10, 10, 7, 7, 6],
	[7, 6, 6, 10, 10, 7, 10, 8, 5, 4, 4, 10, 10, 5],
	[6, 9, 9, 5, 5, 6, 6, 11, 11, 9],
	[3, 6, 6, 11, 0, 6, 0, 5, 5, 6, 9, 5],
	[0, 11, 0, 5, 5, 11, 1, 5, 5, 6, 6, 11],
	[6, 11, 3, 6, 3, 5, 5, 6, 1, 5],
	[2, 10, 10, 1, 9, 5, 5, 11, 11, 9, 5, 6, 6, 11],
	[0, 11, 0, 6, 6, 11, 9, 6, 5, 6, 9, 5, 2, 10, 10, 1],
	[8, 5, 5, 11, 5, 6, 6, 11, 0, 5, 10, 5, 5, 2, 2, 10],
	[6, 11, 3, 6, 3, 5, 5, 6, 2, 10, 10, 3, 10, 5],
	[5, 8, 9, 5, 5, 2, 2, 8, 5, 6, 6, 2],
	[9, 5, 5, 6, 6, 9, 6, 0, 6, 2],
	[1, 5, 5, 8, 8, 1, 5, 6, 6, 8, 8, 2, 6, 2],
	[1, 5, 5, 6, 6, 1, 6, 2],
	[3, 6, 6, 1, 6, 10, 10, 1, 8, 6, 5, 6, 6, 9, 9, 5],
	[10, 1, 0, 10, 0, 6, 6, 10, 9, 5, 5, 0, 5, 6],
	[5, 6, 6, 10, 10, 5],
	[10, 5, 5, 6, 6, 10],
	[11, 5, 5, 10, 10, 11, 7, 5],
	[11, 5, 5, 10, 10, 11, 7, 5],
	[5, 11, 7, 5, 5, 10, 10, 11, 1, 9],
	[10, 7, 7, 5, 5, 10, 10, 11, 8, 1, 1, 9],
	[11, 1, 2, 11, 7, 1, 7, 5, 5, 1],
	[2, 7, 7, 1, 7, 5, 5, 1, 2, 11],
	[9, 7, 7, 5, 5, 9, 9, 2, 2, 7, 2, 11],
	[7, 5, 5, 2, 2, 7, 2, 11, 5, 9, 9, 2, 2, 8],
	[2, 5, 5, 10, 10, 2, 3, 5, 7, 5],
	[8, 2, 8, 5, 5, 2, 7, 5, 10, 2, 5, 10],
	[1, 9, 5, 10, 10, 3, 3, 5, 7, 5, 10, 2],
	[8, 2, 2, 9, 1, 9, 7, 2, 10, 2, 2, 5, 5, 10, 7, 5],
	[3, 5, 5, 1, 7, 5],
	[7, 0, 7, 1, 7, 5, 5, 1],
	[3, 9, 3, 5, 5, 9, 7, 5],
	[7, 9, 5, 9, 7, 5],
	[5, 8, 4, 5, 5, 10, 10, 8, 10, 11],
	[5, 0, 4, 5, 5, 11, 11, 0, 5, 10, 10, 11],
	[1, 9, 4, 10, 10, 8, 10, 11, 4, 5, 5, 10],
	[10, 11, 11, 4, 4, 10, 4, 5, 5, 10, 3, 4, 4, 1, 1, 9],
	[2, 5, 5, 1, 2, 8, 8, 5, 2, 11, 4, 5],
	[4, 11, 11, 0, 4, 5, 5, 11, 2, 11, 11, 1, 5, 1],
	[2, 5, 5, 0, 5, 9, 2, 11, 11, 5, 4, 5, 5, 8],
	[4, 5, 5, 9, 2, 11],
	[2, 5, 5, 10, 10, 2, 3, 5, 3, 4, 4, 5],
	[5, 10, 10, 2, 2, 5, 2, 4, 4, 5],
	[3, 10, 10, 2, 3, 5, 5, 10, 8, 5, 4, 5, 1, 9],
	[5, 10, 10, 2, 2, 5, 2, 4, 4, 5, 1, 9, 9, 2],
	[4, 5, 5, 8, 5, 3, 5, 1],
	[4, 5, 5, 0, 5, 1],
	[4, 5, 5, 8, 5, 3, 0, 5, 5, 9],
	[4, 5, 5, 9],
	[4, 11, 7, 4, 9, 11, 9, 10, 10, 11],
	[9, 7, 7, 4, 9, 11, 9, 10, 10, 11],
	[1, 10, 10, 11, 11, 1, 11, 4, 4, 1, 7, 4],
	[1, 4, 4, 3, 1, 10, 10, 4, 7, 4, 4, 11, 10, 11],
	[4, 11, 7, 4, 9, 11, 9, 2, 2, 11, 9, 1],
	[9, 7, 7, 4, 9, 11, 9, 1, 1, 11, 2, 11],
	[7, 4, 4, 11, 4, 2, 2, 11],
	[7, 4, 4, 11, 4, 2, 2, 11, 3, 4],
	[2, 9, 9, 10, 10, 2, 2, 7, 7, 9, 7, 4],
	[9, 10, 10, 7, 7, 9, 7, 4, 10, 2, 2, 7, 7, 0],
	[7, 10, 10, 3, 10, 2, 7, 4, 4, 10, 1, 10, 10, 0],
	[1, 10, 10, 2, 7, 4],
	[9, 1, 1, 4, 1, 7, 7, 4],
	[9, 1, 1, 4, 1, 7, 7, 4, 8, 1],
	[3, 4, 7, 4],
	[7, 4],
	[9, 10, 10, 8, 10, 11],
	[9, 3, 9, 11, 9, 10, 10, 11],
	[1, 10, 10, 0, 10, 8, 10, 11],
	[1, 10, 10, 3, 10, 11],
	[2, 11, 11, 1, 11, 9, 9, 1],
	[9, 3, 9, 11, 2, 9, 9, 1, 2, 11],
	[2, 11, 11, 0],
	[2, 11],
	[8, 2, 8, 10, 10, 2, 9, 10],
	[9, 10, 10, 2, 2, 9],
	[8, 2, 8, 10, 10, 2, 1, 8, 1, 10],
	[1, 10, 10, 2],
	[8, 1, 9, 1],
	[9, 1],
	[],
	[]];

var segTable2 = [
	[],
	[],
	[1, 9],
	[1, 9],
	[2, 10, 10, 1],
	[2, 10, 10, 1],
	[2, 10, 10, 9],
	[2, 10, 10, 9],
	[11, 2],
	[11, 2],
	[1, 9, 11, 2],
	[11, 2, 1, 9],
	[10, 1, 11, 10],
	[10, 1, 11, 10],
	[11, 10, 10, 9],
	[10, 9, 11, 10],
	[4, 7],
	[4, 7],
	[1, 9, 4, 7],
	[1, 9, 4, 7],
	[2, 10, 10, 1, 4, 7],
	[4, 7, 2, 10, 10, 1],
	[2, 10, 10, 9, 4, 7],
	[2, 10, 10, 9, 4, 7],
	[4, 7, 11, 2],
	[4, 7, 11, 2],
	[1, 9, 4, 7, 11, 2],
	[4, 7, 11, 2, 1, 9],
	[10, 1, 11, 10, 4, 7],
	[11, 10, 10, 1, 4, 7],
	[4, 7, 11, 10, 10, 9],
	[4, 7, 11, 10, 10, 9],
	[9, 5, 5, 4],
	[9, 5, 5, 4],
	[5, 4, 1, 5],
	[5, 4, 1, 5],
	[2, 10, 10, 1, 9, 5, 5, 4],
	[2, 10, 10, 1, 9, 5, 5, 4],
	[2, 10, 10, 5, 5, 4],
	[2, 10, 10, 5, 5, 4],
	[9, 5, 5, 4, 11, 2],
	[11, 2, 9, 5, 5, 4],
	[5, 4, 1, 5, 11, 2],
	[1, 5, 11, 2, 5, 4],
	[11, 10, 10, 1, 9, 5, 5, 4],
	[9, 5, 5, 4, 10, 1, 11, 10],
	[5, 4, 11, 10, 10, 5],
	[5, 4, 10, 5, 11, 10],
	[5, 7, 9, 5],
	[9, 5, 5, 7],
	[1, 5, 5, 7],
	[1, 5, 5, 7],
	[9, 5, 5, 7, 10, 1, 2, 10],
	[10, 1, 2, 10, 9, 5, 5, 7],
	[5, 7, 10, 5, 2, 10],
	[2, 10, 10, 5, 5, 7],
	[9, 5, 5, 7, 11, 2],
	[9, 5, 5, 7, 11, 2],
	[11, 2, 1, 5, 5, 7],
	[11, 2, 1, 5, 5, 7],
	[9, 5, 5, 7, 10, 1, 11, 10],
	[5, 7, 9, 5, 10, 1, 11, 10],
	[11, 10, 10, 5, 5, 7],
	[11, 10, 10, 5, 5, 7],
	[10, 6, 6, 5, 5, 10],
	[5, 10, 10, 6, 6, 5],
	[1, 9, 5, 10, 10, 6, 6, 5],
	[1, 9, 5, 10, 10, 6, 6, 5],
	[6, 5, 5, 1, 2, 6],
	[6, 5, 5, 1, 2, 6],
	[6, 5, 5, 9, 2, 6],
	[5, 9, 2, 6, 6, 5],
	[11, 2, 10, 6, 6, 5, 5, 10],
	[11, 2, 10, 6, 6, 5, 5, 10],
	[1, 9, 11, 2, 5, 10, 10, 6, 6, 5],
	[5, 10, 10, 6, 6, 5, 1, 9, 11, 2],
	[11, 6, 6, 5, 5, 1],
	[5, 1, 11, 6, 6, 5],
	[11, 6, 6, 5, 5, 9],
	[6, 5, 5, 9, 11, 6],
	[5, 10, 10, 6, 6, 5, 4, 7],
	[4, 7, 6, 5, 5, 10, 10, 6],
	[1, 9, 5, 10, 10, 6, 6, 5, 4, 7],
	[10, 6, 6, 5, 5, 10, 1, 9, 4, 7],
	[2, 6, 6, 5, 5, 1, 4, 7],
	[5, 1, 2, 6, 6, 5, 4, 7],
	[4, 7, 5, 9, 6, 5, 2, 6],
	[4, 7, 5, 9, 6, 5, 2, 6],
	[11, 2, 4, 7, 10, 6, 6, 5, 5, 10],
	[5, 10, 10, 6, 6, 5, 4, 7, 11, 2],
	[1, 9, 4, 7, 11, 2, 5, 10, 10, 6, 6, 5],
	[1, 9, 11, 2, 4, 7, 5, 10, 10, 6, 6, 5],
	[4, 7, 5, 1, 11, 6, 6, 5],
	[5, 1, 11, 6, 6, 5, 4, 7],
	[5, 9, 6, 5, 11, 6, 4, 7],
	[6, 5, 5, 9, 11, 6, 4, 7],
	[9, 10, 6, 4, 10, 6],
	[10, 6, 6, 4, 9, 10],
	[1, 10, 10, 6, 6, 4],
	[6, 4, 1, 10, 10, 6],
	[9, 1, 2, 6, 6, 4],
	[9, 1, 2, 6, 6, 4],
	[2, 6, 6, 4],
	[2, 6, 6, 4],
	[9, 10, 10, 6, 6, 4, 11, 2],
	[11, 2, 9, 10, 10, 6, 6, 4],
	[11, 2, 6, 4, 1, 10, 10, 6],
	[6, 4, 1, 10, 10, 6, 11, 2],
	[6, 4, 9, 1, 11, 6],
	[11, 6, 9, 1, 6, 4],
	[11, 6, 6, 4],
	[6, 4, 11, 6],
	[10, 6, 6, 7, 9, 10],
	[9, 10, 6, 7, 10, 6],
	[10, 6, 6, 7, 1, 10],
	[10, 6, 6, 7, 1, 10],
	[2, 6, 9, 1, 6, 7],
	[2, 6, 9, 1, 6, 7],
	[6, 7, 2, 6],
	[6, 7, 2, 6],
	[11, 2, 10, 6, 9, 10, 6, 7],
	[11, 2, 6, 7, 10, 6, 9, 10],
	[1, 10, 6, 7, 10, 6, 11, 2],
	[11, 2, 10, 6, 1, 10, 6, 7],
	[6, 7, 9, 1, 11, 6],
	[9, 1, 11, 6, 6, 7],
	[6, 7, 11, 6],
	[11, 6, 6, 7],
	[7, 6, 6, 11],
	[7, 6, 6, 11],
	[1, 9, 7, 6, 6, 11],
	[1, 9, 7, 6, 6, 11],
	[10, 1, 2, 10, 6, 11, 7, 6],
	[2, 10, 10, 1, 6, 11, 7, 6],
	[2, 10, 10, 9, 6, 11, 7, 6],
	[6, 11, 7, 6, 2, 10, 10, 9],
	[6, 2, 7, 6],
	[7, 6, 6, 2],
	[7, 6, 6, 2, 1, 9],
	[6, 2, 1, 9, 7, 6],
	[7, 6, 6, 10, 10, 1],
	[7, 6, 6, 10, 10, 1],
	[10, 9, 6, 10, 7, 6],
	[7, 6, 6, 10, 10, 9],
	[4, 6, 6, 11],
	[6, 11, 4, 6],
	[6, 11, 4, 6, 1, 9],
	[4, 6, 1, 9, 6, 11],
	[4, 6, 6, 11, 2, 10, 10, 1],
	[2, 10, 10, 1, 6, 11, 4, 6],
	[4, 6, 6, 11, 2, 10, 10, 9],
	[10, 9, 2, 10, 6, 11, 4, 6],
	[4, 6, 6, 2],
	[4, 6, 6, 2],
	[1, 9, 4, 6, 6, 2],
	[1, 9, 4, 6, 6, 2],
	[4, 6, 6, 10, 10, 1],
	[10, 1, 6, 10, 4, 6],
	[4, 6, 6, 10, 10, 9],
	[10, 9, 6, 10, 4, 6],
	[9, 5, 5, 4, 7, 6, 6, 11],
	[9, 5, 5, 4, 7, 6, 6, 11],
	[1, 5, 5, 4, 7, 6, 6, 11],
	[7, 6, 6, 11, 5, 4, 1, 5],
	[9, 5, 5, 4, 10, 1, 2, 10, 7, 6, 6, 11],
	[6, 11, 7, 6, 2, 10, 10, 1, 9, 5, 5, 4],
	[7, 6, 6, 11, 5, 4, 10, 5, 2, 10],
	[5, 4, 10, 5, 2, 10, 7, 6, 6, 11],
	[7, 6, 6, 2, 5, 4, 9, 5],
	[9, 5, 5, 4, 6, 2, 7, 6],
	[6, 2, 7, 6, 1, 5, 5, 4],
	[6, 2, 7, 6, 5, 4, 1, 5],
	[9, 5, 5, 4, 10, 1, 6, 10, 7, 6],
	[6, 10, 10, 1, 7, 6, 9, 5, 5, 4],
	[10, 5, 5, 4, 6, 10, 7, 6],
	[7, 6, 6, 10, 5, 4, 10, 5],
	[9, 5, 5, 6, 6, 11],
	[6, 11, 5, 6, 9, 5],
	[1, 5, 5, 6, 6, 11],
	[6, 11, 5, 6, 1, 5],
	[2, 10, 10, 1, 9, 5, 5, 6, 6, 11],
	[6, 11, 5, 6, 9, 5, 2, 10, 10, 1],
	[5, 6, 6, 11, 10, 5, 2, 10],
	[6, 11, 5, 6, 2, 10, 10, 5],
	[9, 5, 5, 6, 6, 2],
	[9, 5, 5, 6, 6, 2],
	[1, 5, 5, 6, 6, 2],
	[1, 5, 5, 6, 6, 2],
	[6, 10, 10, 1, 5, 6, 9, 5],
	[10, 1, 6, 10, 9, 5, 5, 6],
	[5, 6, 6, 10, 10, 5],
	[10, 5, 5, 6, 6, 10],
	[5, 10, 10, 11, 7, 5],
	[5, 10, 10, 11, 7, 5],
	[7, 5, 5, 10, 10, 11, 1, 9],
	[7, 5, 5, 10, 10, 11, 1, 9],
	[2, 11, 7, 5, 5, 1],
	[7, 5, 5, 1, 2, 11],
	[7, 5, 5, 9, 2, 11],
	[7, 5, 2, 11, 5, 9],
	[5, 10, 10, 2, 7, 5],
	[7, 5, 10, 2, 5, 10],
	[1, 9, 5, 10, 7, 5, 10, 2],
	[1, 9, 10, 2, 5, 10, 7, 5],
	[5, 1, 7, 5],
	[7, 5, 5, 1],
	[5, 9, 7, 5],
	[5, 9, 7, 5],
	[4, 5, 5, 10, 10, 11],
	[4, 5, 5, 10, 10, 11],
	[1, 9, 10, 11, 4, 5, 5, 10],
	[10, 11, 4, 5, 5, 10, 1, 9],
	[5, 1, 2, 11, 4, 5],
	[4, 5, 2, 11, 5, 1],
	[5, 9, 2, 11, 4, 5],
	[4, 5, 5, 9, 2, 11],
	[5, 10, 10, 2, 4, 5],
	[5, 10, 10, 2, 4, 5],
	[10, 2, 5, 10, 4, 5, 1, 9],
	[5, 10, 10, 2, 4, 5, 1, 9],
	[4, 5, 5, 1],
	[4, 5, 5, 1],
	[4, 5, 5, 9],
	[4, 5, 5, 9],
	[7, 4, 9, 10, 10, 11],
	[7, 4, 9, 10, 10, 11],
	[1, 10, 10, 11, 7, 4],
	[1, 10, 7, 4, 10, 11],
	[7, 4, 2, 11, 9, 1],
	[7, 4, 9, 1, 2, 11],
	[7, 4, 2, 11],
	[7, 4, 2, 11],
	[9, 10, 10, 2, 7, 4],
	[9, 10, 7, 4, 10, 2],
	[10, 2, 7, 4, 1, 10],
	[1, 10, 10, 2, 7, 4],
	[9, 1, 7, 4],
	[9, 1, 7, 4],
	[7, 4],
	[7, 4],
	[9, 10, 10, 11],
	[9, 10, 10, 11],
	[1, 10, 10, 11],
	[1, 10, 10, 11],
	[2, 11, 9, 1],
	[9, 1, 2, 11],
	[2, 11],
	[2, 11],
	[10, 2, 9, 10],
	[9, 10, 10, 2],
	[10, 2, 1, 10],
	[1, 10, 10, 2],
	[9, 1],
	[9, 1],
	[],
	[]];

var cubeVerts = [[0,0,0], [1,0,0], [1,1,0], [0,1,0],
									 [0,0,1], [1,0,1], [1,1,1], [0,1,1]];
var edgeIndex = [[0,1], [1,2], [2,3], [3,0], [4,5], [5,6],
									 [6,7], [7,4], [0,4], [1,5], [2,6], [3,7]];
// edge directions: [x, y, -x, -y, x, y, -x, -y, z, z, z, z]

exports.ElMap = ElMap;

})));