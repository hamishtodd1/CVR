function makeTextSign(text, twoSided)
{
	if(twoSided == undefined)
	{
		twoSided = true;
	}
	//"Context" is a persistent thing
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");

	var backgroundMargin = 50;
	var textSize = 100;
	context.font = textSize + "pt Arial";
	var textWidth = context.measureText(text).width;
	canvas.width = textWidth + backgroundMargin;
	canvas.height = textSize + backgroundMargin;

	context = canvas.getContext("2d");
	context.font = textSize + "pt Arial";
	context.textAlign = "center";
	context.textBaseline = "middle";
	
	var backGroundColor = "white"
	context.fillStyle = backGroundColor;
	context.fillRect(canvas.width / 2 - textWidth / 2 - backgroundMargin / 2, canvas.height / 2 - textSize / 2 - +backgroundMargin / 2, textWidth + backgroundMargin, textSize + backgroundMargin);
	
	var textColor = "black"
	context.fillStyle = textColor;
	context.fillText(text, canvas.width / 2, canvas.height / 2);

	if(twoSided)
	{
		var firstSign = new THREE.Mesh(
			new THREE.PlaneBufferGeometry( canvas.width / canvas.height, 1 ), 
			new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(canvas)})
			);
		var secondSign = firstSign.clone();
		secondSign.rotation.y = TAU / 2;
		var sign = new THREE.Group();
		sign.add(firstSign, secondSign);
	}
	else
	{
		var sign = new THREE.Mesh(
			new THREE.PlaneBufferGeometry( canvas.width / canvas.height, 1 ), 
			new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(canvas)})
			);
	}

	return sign;
}