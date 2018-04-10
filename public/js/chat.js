$(function() {
  // Make WebSocket connection
  var ws = new WebSocket('ws://localhost:3000');

  // When connection is made
  ws.onopen = () => {
    console.log("Connected to server!");
  }

	let chat_hidden = true;
	$('#chat-history').click(function() {
		if (!chat_hidden) {
			$(this).height('5%');
		}
		else {
			$(this).height('50%');
		}
		chat_hidden = !chat_hidden;
	});

  $('form').submit( () => {
    msg = $('#input_message').val();
    var data = {
      source: "WebSocket Client App",
      message: msg
    };
    ws.send(JSON.stringify(data));
    $('#input_message').val('');
    return false;
  });

  // Handle message passed from server
  ws.onmessage = (msg) => {
    try {
      var json = JSON.parse(msg.data);
    } catch (e) {
      console.log('Invalid JSON: ', msg.data);
      return;
    }
    var chatmsg = JSON.parse(json).message;
    console.log(chatmsg);

    $('#chat-history').append($('<li>').text(chatmsg));
  };

  // Close WebSocket connection before window resources + documents are unloaded
  window.addEventListener('beforeunload', () => {
    ws.close();
  });
});
