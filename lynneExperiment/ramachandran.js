function initRamachandran(allowedArray)
{
	function normalizedAngle(angle)
	{
		var returnValue = angle;
		while(returnValue<0)
			returnValue += TAU;
		while(returnValue >= TAU)
			returnValue -= TAU;
		return returnValue;
	}
	angleAllowed = function(tau, phi, psi)
	{
		var phiIndex = normalizedAngle(phi);
		phiIndex = Math.round(phiIndex * 360 / TAU / 5);
		var psiIndex = normalizedAngle(psi);
		psiIndex = Math.round(psiIndex * 360 / TAU / 5);
		
		var tauIndex = normalizedAngle(tau);
		tauIndex = Math.round(tauIndex * 360 / TAU / 5 );
		tauIndex -= 21;
		if( tauIndex < 0 || allowedArray.length-1 < tauIndex )
		{
//			console.log("received unknown tau: ", tau);
			return 0;
		}
		
		return allowedArray[ tauIndex ][ phiIndex ][ psiIndex ];
	}
	
	var ramachandran = new THREE.Object3D();
	ramachandran.horizontalSegments = 63;
	
	ramachandran.genus = 0;
	ramachandran.width = 1;
	ramachandran.position.z = -0.1;
	ramachandran.position.y = -0.1;
	ramachandran.scale.setScalar(0.09)
	
	scene.add(ramachandran);
	
	var positionOnCircle = function(arcLength, center, axis, angleZeroPosition )
	{
		var radiusVector = angleZeroPosition.clone();
		radiusVector.sub( center );
		
		var circumference = TAU * radiusVector.length();
		var angle = arcLength / circumference * TAU;
		
		var position = radiusVector.clone();
		position.applyAxisAngle(axis,angle); //or minus that angle?
		position.add(center);
		
		return position;
	}
	
	//accepts numbers from a 2x2 square centered at the origin. Returns that for genus = 0
	//gives 2x(2/3) donut in XZ plane for genus = 1
	var foldingDonutPosition = function( x, y, genus )
	{
		var innerRoundedness = genus < 0.5 ? genus * 2 : 1;
		var outerRoundedness = genus >= 0.5 ? (genus-0.5) * 2 : 0;
		
		var finalOuterRadius = 2 / TAU;
		var virtualOuterRadius = outerRoundedness === 0 ? Number.MAX_SAFE_INTEGER : finalOuterRadius / outerRoundedness;
		var virtualCircumferenceCenter = new THREE.Vector3(0,0,-virtualOuterRadius);
		var circumferenceComponent = positionOnCircle( x, virtualCircumferenceCenter, yAxis, new THREE.Vector3() );
		
		var finalMinorRadius = finalOuterRadius / 3;
		var virtualMinorRadius = innerRoundedness === 0 ? Number.MAX_SAFE_INTEGER : finalMinorRadius / innerRoundedness;
		
		var virtualTubeCenter = virtualCircumferenceCenter.clone();
		virtualTubeCenter.sub(circumferenceComponent);
		virtualTubeCenter.setLength( virtualMinorRadius );
		virtualTubeCenter.add(circumferenceComponent);
		
		var tubeCenterTangent = circumferenceComponent.clone().sub(virtualTubeCenter);
		tubeCenterTangent.cross(yAxis);
		tubeCenterTangent.normalize();
		
		var finalPosition = positionOnCircle( y / (1+2*innerRoundedness), virtualTubeCenter, tubeCenterTangent, circumferenceComponent );
		return finalPosition;
	}
	
	var plotMaterial = new THREE.MeshPhongMaterial({vertexColors:THREE.FaceColors, side: THREE.DoubleSide});
	
	ramachandran.plots = Array(4);	
	for(var i = 0; i < ramachandran.plots.length; i++)
	{
		ramachandran.plots[i] = new THREE.Mesh( new THREE.Geometry(), plotMaterial );
		if(i===0)
			ramachandran.plots[i].geometry.vertices = Array( Math.pow(ramachandran.horizontalSegments+1, 2 ) );
		else
			ramachandran.plots[i].geometry.vertices = ramachandran.plots[0].geometry.vertices;
		ramachandran.add( ramachandran.plots[i] );
		ramachandran.plots[i].visible = false;
	}
	
	for(var i = 0, il = ramachandran.plots[0].geometry.vertices.length; i < il; i++)
		ramachandran.plots[0].geometry.vertices[i] = new THREE.Vector3();
	ramachandran.update = function()
	{
		var visiblePlot = -1;
		for(var i = 0; i < this.plots.length; i++ )
			if(this.plots[i].visible )
				visiblePlot = i;
		if(visiblePlot === -1)
			return;
		
		for(var i = 0; i <= this.horizontalSegments; i++)
		{
			for(var j = 0; j <= this.horizontalSegments; j++)
				this.plots[visiblePlot].geometry.vertices[ i * (this.horizontalSegments+1) + j ].copy(
					foldingDonutPosition( (i / this.horizontalSegments) * 2 - 1, (j / this.horizontalSegments) * 2 - 1, this.genus ) );
		}
		ramachandran.plots[visiblePlot].geometry.computeFaceNormals();
		ramachandran.plots[visiblePlot].geometry.computeVertexNormals();
		ramachandran.plots[visiblePlot].geometry.verticesNeedUpdate = true;
	}
	ramachandran.update();
	
	ramachandran.plots[0].geometry.faces = Array( ramachandran.horizontalSegments * ramachandran.horizontalSegments * 2 );
	allowedColor = new THREE.Color(0x00FF00);
	disallowedColor = new THREE.Color(0xFF0000);
	var thisFaceColor = null;
	for(var i = 0; i < ramachandran.horizontalSegments; i++) //row
	{
		for(var j = 0; j < ramachandran.horizontalSegments; j++) //column
		{
			for(var k = 0; k < ramachandran.plots.length; k++)
			{
				thisFaceColor = angleAllowed( (100+k*5)/360*TAU,
					i / ramachandran.horizontalSegments * TAU,
					j / ramachandran.horizontalSegments * TAU) ?
					allowedColor : disallowedColor;
				
				var topLeft = i * (ramachandran.horizontalSegments+1) + j;
				var bottomLeft = (i+1) * (ramachandran.horizontalSegments+1) + j;
				
				ramachandran.plots[k].geometry.faces[(i*ramachandran.horizontalSegments+j)*2+0] = new THREE.Face3( 
					topLeft,
					topLeft + 1,
					bottomLeft,
					new THREE.Vector3(0,0,1),
					thisFaceColor
				);
				ramachandran.plots[k].geometry.faces[(i*ramachandran.horizontalSegments+j)*2+1] = new THREE.Face3( 
					bottomLeft,
					topLeft + 1,
					bottomLeft + 1,
					new THREE.Vector3(0,0,1),
					thisFaceColor
				);
			}
		}
	}
	
	ramachandran.indicator = new THREE.Mesh(new THREE.SphereGeometry(0.013), new THREE.MeshBasicMaterial({color:0x000000}));
	ramachandran.add( ramachandran.indicator );
	ramachandran.repositionIndicatorAndReturnAllowability = function(tau, phi, psi)
	{
		this.indicator.position.copy( foldingDonutPosition(
				phi / TAU * 2, psi / TAU * 2, this.genus
		));
		
		var visibleIndex = Math.round( ( ( tau * 360 / TAU ) - 105 ) / 5 );
		
		for(var i = 0; i < ramachandran.plots.length; i++)
		{
			ramachandran.plots[i].visible = false;
		}
		
		if( 1 <= visibleIndex && visibleIndex <= 3)
		{
			ramachandran.plots[visibleIndex].visible = true;
		}
		else
			ramachandran.plots[0].visible = true; //not allowed

		return angleAllowed( tau, phi, psi );
	}
	
	return ramachandran;
}