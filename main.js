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

// Paypal PDT payments.
handlers.paypalNotify = function(args, context) {
  var env = server.GetTitleInternalData({});
  var host = env.Data.PAYPAL_HOSTNAME;
  var url = host + '/cgi-bin/webscr'
  var paypalIdentityToken = env.Data.PAYPAL_IDENTITY_TOKEN;
  var paypalTransactionId = args.tx;

  var response = http.request(url, "post", formUrlencoded({
    cmd: '_notify-sync',
    tx: paypalTransactionId,
    at: paypalIdentityToken,
  }), 'application/x-www-form-urlencoded');
  return {paypalResponse: response}
};
