/*
	This is not necessarily what we want, but is the obvious idea
	Would prefer to manipulate things on the things themselves
	some equivalent of "right click"? But it's terribly hard to get that on a surface
	
	No, a physical tool that you touch on the thing you want to hide
		When you grab it all hidden things appear
*/

function initMenus()
{
	var visibilityPanel = new THREE.Mesh(new THREE.OriginCorneredPlaneGeometry(), new THREE.MeshBasicMaterial());
	visibilityPanel.rotation.y = -TAU/4
	visibilityPanel.position.x = ROOM_RADIUS - 0.0001;
	// visibilityPanel.position.y -= visibilityPanel.scale.y / 2;
	scene.add(visibilityPanel);

	var signs = [];
	signs.push(makeTextSign( "Visibilities",false ));
	signs.push(makeTextSign( "model",false ))
	signs.push(makeTextSign( "map",false ))

	var onColor = new THREE.Color(0x808080)
	var offColor = new THREE.Color(0xFFFFFF);
	
	for(var i = 0; i < signs.length; i++)
	{
		signs[i].scale.multiplyScalar(0.15)
		signs[i].position.x = 0.5;
		signs[i].position.y = (0.9 - 0.24 * i);
		signs[i].position.z = 0.01;
		
		visibilityPanel.add(signs[i]);

		if(i)
		{
			signs[i].material.color.copy(onColor)
			signs[i].onClick = function()
			{
				// var toSetTo = 

				// if(toSetTo)
				// {
				// 	this.material.color.copy(onColor)
				// }
				// else
				// {
				// 	this.material.color.copy(offColor)
				// }
			}
		}
	}
}