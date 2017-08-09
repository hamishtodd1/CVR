function initSocket( cursor )
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
		var mapCoords = new Float32Array(messageContents.length-2); //-2 because "Map" at beginning and "" at end because of comma
		for( var i = 0; i < mapCoords.length; i++ )
		{
			mapCoords[i] = parseFloat( messageContents[i+1] );
		}
		
		var map = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x888888}));
		map.geometry.addAttribute( 'position', new THREE.BufferAttribute( mapCoords, 3 ) );
		map.geometry.applyMatrix( new THREE.Matrix4().makeScale( angstrom, angstrom, angstrom ) );
		
		map.updateBoundingSphere = updateBoundingSphere;
		map.pointInBoundingSphere = pointInBoundingSphere;
		
		scene.add( map );
	}
	
	socket.messageResponses["This is the server"] = function(messageContents)
	{}
	
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