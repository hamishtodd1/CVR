function initSocket()
{
	function testWithString(str)
	{
		ourClock.getDelta();
		var o = {};
		o.str = str;
		var oAsString = JSON.stringify(o);
		var backToO = JSON.parse(oAsString);
		return ourClock.getDelta();
	}

	var numSamples = 500;

	function bench(numCharactersInString)
	{
		var str = Array(numCharactersInString+1).toString();
		var total = 0;
		for(var i = 0; i < numSamples; i++ )
		{
			total += testWithString(str)
		}
		return total/numSamples;
	}

	var goUpIn = 100000;
	for(var i = 0; i < 10; i++)
	{
		console.log(i*goUpIn, bench(i*goUpIn))
	}





	// var socket = new WebSocket("ws://" + window.location.href.substring(7) + "ws");
	// if(!socket)
	// {
	// 	console.log("invalid socket");
	// 	return;
	// }
	// socket.onclose = function()
	// {
	// 	console.log("The connection has been closed. Maybe you had no data loaded?");
	// }

	// socket.messageReactions = {};
	
	// socket.onmessage = function(msgAsString)
	// {
	// 	//speedup opportunity... hrmm... what if it's a massive one?
	// 	var msg = JSON.parse(msgAsString)

	// 	if(!msg.command)
	// 	{
	// 		console.log("received message without command: ", msg)
	// 		return;
	// 	}
	// 	if(!socket.messageReactions[msg.command])
	// 	{
	// 		console.error("Mistyped header: ", msg.command)
	// 	}

	// 	else socket.messageReactions[msg.command](messageContents);
	// }

	// return socket;
}