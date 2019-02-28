function Atom(element,position,imol,chainId,resNo,insertionCode,name,altloc, occupancyAndTemperatureFactor)
{
	this.position = position;

	this.selected = false;

	this.bondPartners = [];
	this.bondFirstVertexIndices = [];

	this.extraBondPartners = [];
	this.extraBondFirstVertexIndices = [];

	if(occupancyAndTemperatureFactor === undefined)
	{
		occupancyAndTemperatureFactor = "  1.00 30.00           "
	}
	this.occupancyAndTemperatureFactor = occupancyAndTemperatureFactor

	this.imol = imol;
	this.chainId = chainId;
	this.resNo = resNo;
	this.insertionCode = insertionCode;
	this.name = name;
	this.altloc = altloc;

	if(typeof element === "number") //there are a lot of these things, best to keep it as a number
	{
		this.element = element;
	}
	else
	{
		this.element = elementToNumber[ element ];
	}

	if(this.element === undefined)
	{
		console.error("unrecognized element: ", element)
	}
}

Atom.prototype.assignAtomSpecToObject = function(msg)
{
	msg.imol = this.imol;
	msg.chainId = this.chainId;
	msg.resNo = this.resNo;
	msg.insertionCode = this.insertionCode;
	
	msg.name = this.name;
	msg.altloc = this.altloc;
}
Atom.prototype.assignResidueSpecToMessage = function(msg)
{
	msg.imol = this.imol;
	msg.chainId = this.chainId;
	msg.resNo = this.resNo;
	msg.insertionCode = this.insertionCode;
}
Atom.prototype.setLabelVisibility = function(labelVisibility)
{
	if( this.label === undefined && labelVisibility)
	{
		var labelString = "";
		labelString += this.imol + ",";
		labelString += this.chainId + ",";
		labelString += this.resNo + ",";
		labelString += this.insertionCode + ",";
		labelString += this.name + ",";
		labelString += this.altloc + ",";

		this.label = makeTextSign(labelString);
		this.label.position.copy(this.position);
		this.label.update = function()
		{
			this.scale.setScalar( 0.06 * Math.sqrt(this.position.distanceTo(camera.position)));
			
			this.parent.updateMatrixWorld()
			
			camera.updateMatrix();
			var cameraUp = yVector.clone().applyQuaternion(camera.quaternion);
			var parentWorldPosition = new THREE.Vector3();
			this.parent.getWorldPosition(parentWorldPosition);
			cameraUp.add(parentWorldPosition)
			this.parent.worldToLocal(cameraUp)
			this.up.copy(cameraUp);

			var localCameraPosition = camera.position.clone()
			this.parent.worldToLocal(localCameraPosition);
			this.lookAt(localCameraPosition);
		};

		var model = getModelWithImol(this.imol);
		model.add( this.label );
		objectsToBeUpdated.push(this.label.update);
	}
	
	if(this.label !== undefined)
	{
		this.label.visible = labelVisibility;
	}
}