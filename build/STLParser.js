require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"eqh7y1":[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};/**
 * @author aleeper / http://adamleeper.com/
 * @author mrdoob / http://mrdoob.com/
 * @author gero3 / https://github.com/gero3
 *
 * Description: A THREE parser for STL ASCII files, as created by Solidworks and other CAD programs.
 *
 * Supports both binary and ASCII encoded files, with automatic detection of type.
 *
 * Limitations:
 * 	Binary decoding ignores header. There doesn't seem to be much of a use for it.
 * 	There is perhaps some question as to how valid it is to always assume little-endian-ness.
 * 	ASCII decoding assumes file is UTF-8. Seems to work for the examples...
 *
 * Usage:
 * 	var parser = new THREE.STLParser();
 *	var loader = new THREE.XHRLoader( parser );
 * 	loader.addEventListener( 'load', function ( event ) {
 *
 * 		var geometry = event.content;
 * 		scene.add( new THREE.Mesh( geometry ) );
 *
 * 	} );
 * 	loader.load( './models/stl/slotted_disk.stl' );
 */

var isNode = typeof global !== "undefined" && {}.toString.call(global) == '[object global]';

if(isNode) THREE = require( 'three' ); 

THREE.STLParser = function () {
  this.outputs = ["geometry"]; //to be able to auto determine data type(s) fetched by parser
};

THREE.STLParser.prototype = {

	constructor: THREE.STLParser
};

THREE.STLParser.prototype.parse = function (data) {

	var isBinary = function () {

		var expect, face_size, n_faces, reader;
		reader = new DataView( binData );
		face_size = (32 / 8 * 3) + ((32 / 8 * 3) * 3) + (16 / 8);
		
		n_faces = reader.getUint32(80,true);
		expect = 80 + (32 / 8) + (n_faces * face_size);
		return expect === reader.byteLength;

	};

	var binData = this.ensureBinary( data );

	return isBinary()
		? this.parseBinary( binData )
		: this.parseASCII( this.ensureString( data ) );

};

THREE.STLParser.prototype.parseBinary = function (data) {

	var face, geometry, n_faces, reader, length, normal, i, dataOffset, faceLength, start, vertexstart;

	reader = new DataView( data );
	n_faces = reader.getUint32(80,true);
	geometry = new THREE.Geometry();
	dataOffset = 84;
	faceLength = 12 * 4 + 2;

	for (face = 0; face < n_faces; face++) {

		start = dataOffset + face * faceLength;
		normal = new THREE.Vector3(
			reader.getFloat32(start,true),
			reader.getFloat32(start + 4,true),
			reader.getFloat32(start + 8,true)
		);

		for (i = 1; i <= 3; i++) {

			vertexstart = start + i * 12;
			geometry.vertices.push(
				new THREE.Vector3(
					reader.getFloat32(vertexstart,true),
					reader.getFloat32(vertexstart +4,true),
					reader.getFloat32(vertexstart + 8,true)
				)
			);

		}

		length = geometry.vertices.length;
		geometry.faces.push(new THREE.Face3(length - 3, length - 2, length - 1, normal));

	}

	geometry.computeCentroids();
	geometry.computeBoundingSphere();

	return geometry;

};

THREE.STLParser.prototype.parseASCII = function (data) {

	var geometry, length, normal, patternFace, patternNormal, patternVertex, result, text;
	geometry = new THREE.Geometry();
	patternFace = /facet([\s\S]*?)endfacet/g;

	while (((result = patternFace.exec(data)) != null)) {

		text = result[0];
		patternNormal = /normal[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;

		while (((result = patternNormal.exec(text)) != null)) {

			normal = new THREE.Vector3(parseFloat(result[1]), parseFloat(result[3]), parseFloat(result[5]));

		}

		patternVertex = /vertex[\s]+([\-+]?[0-9]+\.?[0-9]*([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+[\s]+([\-+]?[0-9]*\.?[0-9]+([eE][\-+]?[0-9]+)?)+/g;

		while (((result = patternVertex.exec(text)) != null)) {

			geometry.vertices.push(new THREE.Vector3(parseFloat(result[1]), parseFloat(result[3]), parseFloat(result[5])));

		}

		length = geometry.vertices.length;
		geometry.faces.push(new THREE.Face3(length - 3, length - 2, length - 1, normal));

	}

	geometry.computeCentroids();
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();

	return geometry;

};

THREE.STLParser.prototype.ensureString = function (buf) {

	if (typeof buf !== "string"){
		var array_buffer = new Uint8Array(buf);
		var str = '';
		for(var i = 0; i < buf.byteLength; i++) {
			str += String.fromCharCode(array_buffer[i]); // implicitly assumes little-endian
		}
		return str;
	} else {
		return buf;
	}

};

THREE.STLParser.prototype.ensureBinary = function (buf) {

	if (typeof buf === "string"){
		var array_buffer = new Uint8Array(buf.length);
		for(var i = 0; i < buf.length; i++) {
			array_buffer[i] = buf.charCodeAt(i) & 0xff; // implicitly assumes little-endian
		}
		return array_buffer.buffer || array_buffer;
	} else {
		return buf;
	}

};

if ( typeof DataView === 'undefined'){

	DataView = function(buffer, byteOffset, byteLength){
	
		console.log("poue")

		this.buffer = buffer;
		this.byteOffset = byteOffset || 0;
		this.byteLength = byteLength || buffer.byteLength || buffer.length;
		this._isString = typeof buffer === "string";

	}

	DataView.prototype = {

		_getCharCodes:function(buffer,start,length){
			start = start || 0;
			length = length || buffer.length;
			var end = start + length;
			var codes = [];
			for (var i = start; i < end; i++) {
				codes.push(buffer.charCodeAt(i) & 0xff);
			}
			return codes;
		},

		_getBytes: function (length, byteOffset, littleEndian) {

			var result;

			// Handle the lack of endianness
			if (littleEndian === undefined) {

				littleEndian = this._littleEndian;

			}

			// Handle the lack of byteOffset
			if (byteOffset === undefined) {

				byteOffset = this.byteOffset;

			} else {

				byteOffset = this.byteOffset + byteOffset;

			}

			if (length === undefined) {

				length = this.byteLength - byteOffset;

			}

			// Error Checking
			if (typeof byteOffset !== 'number') {

				throw new TypeError('DataView byteOffset is not a number');

			}

			if (length < 0 || byteOffset + length > this.byteLength) {

				throw new Error('DataView length or (byteOffset+length) value is out of bounds');

			}

			if (this.isString){

				result = this._getCharCodes(this.buffer, byteOffset, byteOffset + length);

			} else {

				result = this.buffer.slice(byteOffset, byteOffset + length);

			}

			if (!littleEndian && length > 1) {

				if (!(result instanceof Array)) {

					result = Array.prototype.slice.call(result);

				}

				result.reverse();
			}

			return result;

		},

		// Compatibility functions on a String Buffer

		getFloat64: function (byteOffset, littleEndian) {

			var b = this._getBytes(8, byteOffset, littleEndian),

				sign = 1 - (2 * (b[7] >> 7)),
				exponent = ((((b[7] << 1) & 0xff) << 3) | (b[6] >> 4)) - ((1 << 10) - 1),

			// Binary operators such as | and << operate on 32 bit values, using + and Math.pow(2) instead
				mantissa = ((b[6] & 0x0f) * Math.pow(2, 48)) + (b[5] * Math.pow(2, 40)) + (b[4] * Math.pow(2, 32)) +
							(b[3] * Math.pow(2, 24)) + (b[2] * Math.pow(2, 16)) + (b[1] * Math.pow(2, 8)) + b[0];

			if (exponent === 1024) {
				if (mantissa !== 0) {
					return NaN;
				} else {
					return sign * Infinity;
				}
			}

			if (exponent === -1023) { // Denormalized
				return sign * mantissa * Math.pow(2, -1022 - 52);
			}

			return sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);

		},

		getFloat32: function (byteOffset, littleEndian) {

			var b = this._getBytes(4, byteOffset, littleEndian),

				sign = 1 - (2 * (b[3] >> 7)),
				exponent = (((b[3] << 1) & 0xff) | (b[2] >> 7)) - 127,
				mantissa = ((b[2] & 0x7f) << 16) | (b[1] << 8) | b[0];

			if (exponent === 128) {
				if (mantissa !== 0) {
					return NaN;
				} else {
					return sign * Infinity;
				}
			}

			if (exponent === -127) { // Denormalized
				return sign * mantissa * Math.pow(2, -126 - 23);
			}

			return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
		},

		getInt32: function (byteOffset, littleEndian) {
			var b = this._getBytes(4, byteOffset, littleEndian);
			return (b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0];
		},

		getUint32: function (byteOffset, littleEndian) {
			return this.getInt32(byteOffset, littleEndian) >>> 0;
		},

		getInt16: function (byteOffset, littleEndian) {
			return (this.getUint16(byteOffset, littleEndian) << 16) >> 16;
		},

		getUint16: function (byteOffset, littleEndian) {
			var b = this._getBytes(2, byteOffset, littleEndian);
			return (b[1] << 8) | b[0];
		},

		getInt8: function (byteOffset) {
			return (this.getUint8(byteOffset) << 24) >> 24;
		},

		getUint8: function (byteOffset) {
			return this._getBytes(1, byteOffset)[0];
		}

	 };

}

if (isNode) module.exports = THREE.STLParser;

},{"three":3}],"STLParser":[function(require,module,exports){
module.exports=require('eqh7y1');
},{}],3:[function(require,module,exports){

},{}]},{},[])
;