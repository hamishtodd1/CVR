function initSocket( maps, cursor )
{
	if ( !("WebSocket" in window) )
	{
		alert("Your browser does not support web sockets");
		return;
	}

	var socket = new WebSocket("ws://" + window.location.href.substring(7) + "ws");
	if(!socket)
	{
		console.log("invalid socket");
		return;
	}
	socket.onclose = function()
	{
		console.log("The connection has been closed. Small chance that you had no data loaded");
	}
	
	socket.messageResponses = {};
	
	socket.messageResponses["F5"] = function(messageContents)
	{
		if( parseInt( messageContents[1] ) )
			window.location.reload(true);
	}
	
	socket.messageResponses["Map"] = function(messageContents)
	{
		//wouldn't be hard to send map radius
		//hey shouldn't there be coloring for how far away from you surface is?
		//it's probably still worthwhile for user to have the slab thing, but you just control it with head
		//have two little grabbable things which you can move towards and away from you
		
		var mapCoords = new Float32Array(messageContents.length-2); //-2 because "Map" at beginning and "" at end because of comma
		for( var i = 0; i < mapCoords.length; i++ )
		{
			mapCoords[i] = parseFloat( messageContents[i+1] ) * angstrom;
		}
		
		var mapIndex = 0; //maps.length;
		maps[mapIndex] = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x888888}));
		maps[mapIndex].geometry.addAttribute( 'position', new THREE.BufferAttribute( mapCoords, 3 ) );
		
		maps[mapIndex].updateBoundingSphere = updateBoundingSphere;
		maps[mapIndex].pointInBoundingSphere = pointInBoundingSphere;
		
		scene.add( maps[mapIndex] );
	}
	
	socket.messageResponses["Didn't understand that"] = function(messageContents)
	{
		console.error("Server didn't understand our message")
	}
	
	socket.onmessage = function(msg)
	{
		var messageContents = (msg.data).split(",");
		
		if( typeof socket.messageResponses[ messageContents[0] ] === 'undefined' )
			console.error("unrecognized message header: ", messageContents[0] )
		else
			socket.messageResponses[ messageContents[0] ]( messageContents );
	}
	
	return socket;
}