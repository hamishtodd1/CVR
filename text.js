function ceilPowerOfTwo( value )
{
	return Math.pow( 2, Math.ceil( Math.log( value ) / Math.LN2 ) );
}

function makeTextSign(originalText, twoSided, materialOnly, originCornered)
{
	if(twoSided == undefined)
	{
		twoSided = true;
	}

	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var material = new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(canvas)});

	material.setText = function(text)
	{
		var font = "Trebuchet"
		var textSize = 100;
		context.font = textSize + "pt " + font;
		var textWidth = context.measureText(text).width;
		canvas.height = ceilPowerOfTwo(textSize)
		canvas.width =  ceilPowerOfTwo(textWidth);

		context.font = textSize + "pt " + font;
		context.textAlign = "center";
		context.textBaseline = "middle";
		
		var backGroundColor = "#3F3D3F"
		context.fillStyle = backGroundColor;
		context.fillRect(0,0,canvas.width,canvas.height);
		
		var textColor = "#D3D1D3"
		context.fillStyle = textColor;
		context.fillText(text, canvas.width / 2, canvas.height / 2);

		this.map.needsUpdate = true;

		//the geometry isn't affected ofc
	}
	material.setText(originalText);

	if(materialOnly !== undefined && materialOnly === true)
	{
		return material;
	}

	if(originCornered===undefined|| originCornered === false)
	{
		var geo = new THREE.PlaneGeometry(canvas.width / canvas.height, 1)
	}
	else
	{
		var geo = new THREE.OriginCorneredPlaneGeometry(canvas.width / canvas.height, 1)
	}
	
	if(twoSided)
	{
		var firstSign = new THREE.Mesh( geo, material );
		var secondSign = firstSign.clone();
		secondSign.rotation.y = TAU / 2;
		var sign = new THREE.Group();
		sign.add(firstSign, secondSign);
	}
	else
	{
		var sign = new THREE.Mesh( geo, material );
	}

	return sign;
}