handlers.helloWorld = function(args, context) {
  var env = server.GetTitleInternalData({});
  var message = "Hello " + currentPlayerId + "! inputvalue: " + (args || {}).inputValue + "; titleInternalData.ENV: " + env.Data.ENV;
  log.info(message);
  return { messageValue: message };
};

// This would be trivial with lodash/jquery
// Careful to encodeURIComponent everything to avoid injection
function formUrlencoded(obj) {
  var ret = [];
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      var val = obj[key];
      ret.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
  }
  return ret.join('&');
}
function parseResponse(text) {
  var ret = {};
  var lines = text.split('\n');
  for (var i=0; i < lines.length; i++) {
    var line = lines[i].split('=');
    var key = decodeURIComponent(line[0]);
    var val = decodeURIComponent(line[1]);
    ret[key] = val;
  }
  return ret
}

// Paypal PDT payments.
handlers.paypalNotify = function(args, context) {
  var env = server.GetTitleInternalData({});
  var host = env.Data.PAYPAL_HOSTNAME;
  var url = 'https://' + host + '/cgi-bin/webscr'
  var paypalIdentityToken = env.Data.PAYPAL_IDENTITY_TOKEN;
  var paypalTransactionId = args.tx;
  var body = formUrlencoded({
    cmd: '_notify-synch',
    tx: paypalTransactionId,
    at: paypalIdentityToken,
  });
  var headers = {Host: host};

  log.debug(body);
  var restext = http.request(url, "post", body, 'application/x-www-form-urlencoded', headers);
  var resjson = parseResponse(restext);
  // TODO: add the purchased crystals to currentPlayerId's acount
  return {response: restext, body: resjson};
};
