function initSocket()
{
	var socket = new WebSocket("ws://" + window.location.href.substring(7) + "ws");
	if(!socket)
	{
		console.log("invalid socket");
		return;
	}
	socket.onclose = function()
	{
		console.log("The connection has been closed. Maybe you had no data loaded?");
	}

	socket.messageReactions = {};
	
	socket.onmessage = function(msgAsString)
	{
		//speedup opportunity... hrmm... what if it's a massive one?
		//to be sure it would be nice if they came as json
		//parse and stringify together are linear time...
		var msg = JSON.parse(msgAsString)

		if(!msg.command)
		{
			console.log("received message without command: ", msg)
			return;
		}
		if(!socket.messageReactions[msg.command])
		{
			console.error("Mistyped header: ", msg.command)
			return;
		}

		socket.messageReactions[msg.command](msg);
	}

	return socket;
}