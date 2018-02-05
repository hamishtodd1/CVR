//to be called every frame from the start
function checkForNewGlobals()
{
	var previouslyLoggedGlobals = Object.keys(window);
	console.error("if you want to use this, make the above global")
	if( previouslyLoggedGlobals.length < Object.keys(window).length)
	{
		var errorMessagePrinted = false;
		var currentGlobals = Object.keys(window);
		for(var i = 0, il = currentGlobals.length; i < il; i++ )
		{
			var alreadyKnewAboutThisOne = false;
			for(var j = 0, jl = previouslyLoggedGlobals.length; j < jl; j++)
			{
				if(currentGlobals[i] === previouslyLoggedGlobals[j])
				{
					alreadyKnewAboutThisOne = true;
				}
			}
			if(alreadyKnewAboutThisOne)
			{
				continue;
			}

			if( currentGlobals[i] !== "location" && //these ones are ok
				currentGlobals[i] !== "name" &&
				currentGlobals[i] !== "window" &&
				currentGlobals[i] !== "self" &&
				currentGlobals[i] !== "document" )
			{
				if(!errorMessagePrinted)
				{
					console.error("new global variable(s): ")
					errorMessagePrinted = true;
				}
				console.log( currentGlobals[i] );
			}
		}
		previouslyLoggedGlobals = currentGlobals;
	} 
}
//also nice would be "check for unused variables"

THREE.Object3D.prototype.getUnitVectorInObjectSpace = function(axis)
{
	return axis.clone().applyMatrix4(this.matrixWorld).sub(this.getWorldPosition()).normalize();
}

THREE.OriginCorneredPlaneGeometry = function(width,height)
{
	var g = new THREE.PlaneBufferGeometry(1,1);
	g.applyMatrix(new THREE.Matrix4().makeTranslation(0.5,0.5,0))

	if(width)
	{
		g.applyMatrix(new THREE.Matrix4().makeScale(width,1,1))
	}
	if(height)
	{
		g.applyMatrix(new THREE.Matrix4().makeScale(1,height,1))
	}

	return g;
}

function ArrayOfThisValueAndThisLength(value,length)
{
	var array = Array(length);
	for(var i = 0; i < length; i++)
	{
		array[i] = value;
	}
	return array;
}

function removeSingleElementFromArray(array, element)
{
	var index = array.indexOf(element);
	if (index > -1)
	{
	    array.splice(index, 1);
	    return;
	}
	else console.error("no such element");
}

THREE.CylinderBufferGeometryUncentered = function(radius, length, radiusSegments)
{
	if( !radiusSegments )
	{
		radiusSegments = 8;
	}
	var geometry = new THREE.CylinderBufferGeometry(radius, radius, length,radiusSegments,1,true);
	for(var i = 0, il = geometry.attributes.position.array.length / 3; i < il; i++)
	{
		geometry.attributes.position.array[i*3+1] += length / 2;
	}
	return geometry;
}

function refreshCylinderCoordsAndNormals(A,B, bufferGeometry, cylinderSides, firstVertexIndex, radius )
{
	var aToB = new THREE.Vector3().subVectors(B,A);
	aToB.normalize();
	var tickVector = randomPerpVector(aToB);
	tickVector.normalize(); 
	for( var i = 0; i < cylinderSides; i++)
	{
		bufferGeometry.attributes.position.setXYZ(  firstVertexIndex + i*2, tickVector.x*radius + A.x,tickVector.y*radius + A.y,tickVector.z*radius + A.z );
		bufferGeometry.attributes.position.setXYZ(firstVertexIndex + i*2+1, tickVector.x*radius + B.x,tickVector.y*radius + B.y,tickVector.z*radius + B.z );
		
		bufferGeometry.attributes.normal.setXYZ(  firstVertexIndex + i*2, tickVector.x,tickVector.y,tickVector.z );
		bufferGeometry.attributes.normal.setXYZ(firstVertexIndex + i*2+1, tickVector.x,tickVector.y,tickVector.z );
		
		tickVector.applyAxisAngle(aToB, TAU / cylinderSides);
	}
}

THREE.Quaternion.prototype.distanceTo = function(q2)
{
	var theta = Math.acos(this.w*q2.w + this.x*q2.x + this.y*q2.y + this.z*q2.z);
	if (theta>Math.PI/2) theta = Math.PI - theta;
	return theta;
}

THREE.Face3.prototype.getCorner = function(i)
{
	switch(i)
	{
	case 0:
		return this.a;
	case 1:
		return this.b;
	case 2:
		return this.c;
	}
}

function sq(x)
{
	return x*x;
}

THREE.EfficientSphereBufferGeometry = function(radius)
{
	return new THREE.IcosahedronBufferGeometry(radius, 1);
}
THREE.EfficientSphereGeometry = function(radius)
{
	return new THREE.IcosahedronGeometry(radius, 1);
}
THREE.Vector3.prototype.addArray = function(array)
{
	this.x += array[0];
	this.y += array[1];
	this.z += array[2];
}

THREE.Face3.prototype.addOffset = function(offset)
{
	this.a += offset;
	this.b += offset;
	this.c += offset;
}

function getStandardFunctionCallString(myFunc)
{
	return myFunc.toString().split("\n",1)[0].substring(9);
}

function randomPerpVector(ourVector){
	var perpVector = new THREE.Vector3();
	
	if( ourVector.equals(zVector))
	{
		perpVector.crossVectors(ourVector, yVector);
	}
	else
	{
		perpVector.crossVectors(ourVector, zVector);
	}
	
	return perpVector;
}