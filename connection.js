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

	var timer = Infinity;
	var expectedCommand;

	socket.setTimerOnExpectedCommand = function(specificExpectedCommand,length)
	{
		if(timer !== Infinity)
		{
			console.error("already waiting on something!");
			return;
		}
		if(length === undefined)
		{
			length = 1;
		}
		timer = length;
		expectedCommand = specificExpectedCommand;
	}

	function resetCommandExpectation()
	{
		expectedCommand = "";
		timer = Infinity;
	}

	socket.checkOnExpectedCommands = function()
	{
		timer -= frameDelta;
		if( timer < 0 )
		{
			console.error( "request not granted: ", expectedCommand );
			resetCommandExpectation();
		}
	}

	socket.queryCommandTimer = function(specificExpectedCommand)
	{
		return expectedCommand === specificExpectedCommand;
	}
	
	socket.onmessage = function(msgContainer)
	{
		//speedup opportunity... hrmm... what if it's a massive one?
		//to be sure it would be nice if they came as json
		//parse and stringify are both linear in number of characters
		var msg = JSON.parse(msgContainer.data);

		if(msg.command === expectedCommand)
		{
			resetCommandExpectation();
		}

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