$(function() {
  // Make WebSocket connection
  var ws = new WebSocket('ws://localhost:3000');

  // When connection is made
  ws.onopen = () => {
    console.log("Connected to server!");
  }

  $('form').submit( () => {
    msg = $('#input_message').val();
    var data = {
      type: "chat",
      source: "WebSocket Client App",
      message: msg
    };
    ws.send(JSON.stringify(data));
    $('#input_message').val('');
    return false;
  });

  // When arrow keys are pressed, send a message to the server
  $(document).keydown(function(e){
    if(e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40){
      var data = {
        type: "position",
        source: "WebSocket Client App",
        position_x: 10,
        position_y: 1
      };
      ws.send(JSON.stringify(data));
    }
  });

  // Handle message passed from server
  ws.onmessage = (msg) => {
    try {
      var json = JSON.parse(msg.data);
    } catch (e) {
      console.log('Invalid JSON: ', msg.data);
      return;
    }
    var passed_msg = JSON.parse(json);

    if(passed_msg.type == "chat"){
      var chatmsg = passed_msg.message;
      $('#chat-history').append($('<li>').text(chatmsg));
    }

    else if(passed_msg.type == "position"){
      var position_x = passed_msg.position_x;
      var position_y = passed_msg.position_y;
      console.log(position_x);
      console.log(position_y);
    }

  };

  // Close WebSocket connection before window resources + documents are unloaded
  window.addEventListener('beforeunload', () => {
    ws.close();
  });
});
