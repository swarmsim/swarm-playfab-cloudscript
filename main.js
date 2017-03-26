handlers.helloWorld = function(args, context) {
  var env = server.GetTitleInternalData({});
  var message = "Hello " + currentPlayerId + "! inputvalue: " + (args || {}).inputValue + "; titleInternalData.ENV: " + env.Data.ENV;
  log.info(message);
  return { messageValue: message };
};

// Paypal PDT payments.
handlers.paypalNotify = function(args, context) {
  var env = server.GetTitleInternalData({});
  var host = env.Data.PAYPAL_HOSTNAME;
  var url = host + '/cgi-bin/webscr'
  var paypalIdentityToken = env.Data.PAYPAL_IDENTITY_TOKEN;
  var paypalTransactionId = args.tx;
  var response = http.request(url, {
    cmd: '_notify-sync',
    tx: paypalTransactionId,
    at: paypalIdentityToken,
  });
  return {paypalResponse: response}
};
