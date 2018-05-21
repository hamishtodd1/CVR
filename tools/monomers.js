/*
	Do you often put the same ligand into the same structure in many places?
		Assuming you're not doing a weird competition...
		Could make it so you can duplicate the things

	Could make it so you could make them! Buuuut they'd probably be all wrong if you did

	If you put it in place and then change your mind, wanna "undo", which puts it back in your hand
*/

function initMonomerReceiver()
{
	socket.commandReactions["monomerGotten"] = function(msg)
	{
		var monomer = makeModelFromCootString( modelDataString, visiBox.planes );

		monomer.scale.setScalar(getAngstrom())
		controllers[0].add(monomer);

		thingsToBeUpdated.push(monomer)
		monomer.update = function()
		{
			if(this.parent.button1)
			{
				THREE.SceneUtils.detach( this, this.parent, scene )
				THREE.SceneUtils.attach( this, scene, assemblage );

				thingsToBeUpdated.splice(thingsToBeUpdated.indexOf(this),1)
				delete this.update;
			}
		}
	}
}