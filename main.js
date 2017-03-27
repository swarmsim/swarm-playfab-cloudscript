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
  var paypalTransactionId = args.tx;
  var user = server.GetUserInternalData({PlayFabId: currentPlayerId, Keys: ['PaypalTxns']});
  var txnHistory = (user.Data.PaypalTxns || {})[paypalTransactionId];
  if (txnHistory[paypalTransactionId]) {
    // this transaction already succeeded
    itemId = txnHistory[paypalTransactionId];
    log.debug("already applied this transaction", {tx: paypalTransactionId, currentPlayerId});
  }
  else {
    log.debug("haven't yet applied this transaction", {tx: paypalTransactionId, currentPlayerId});
    // ask paypal if the transaction succeeded
    var env = server.GetTitleInternalData({});
    var host = env.Data.PAYPAL_HOSTNAME;
    var url = 'https://' + host + '/cgi-bin/webscr'
    var paypalIdentityToken = env.Data.PAYPAL_IDENTITY_TOKEN;
    var body = formUrlencoded({
      cmd: '_notify-synch',
      tx: paypalTransactionId,
      at: paypalIdentityToken,
    });
    var headers = {Host: host};

    log.debug({reqbody: body});
    var restext = http.request(url, "post", body, 'application/x-www-form-urlencoded', headers);
    var res = parseResponse(restext);
    if (json.hasOwnProperty('SUCCESS')) {
      // non-duplicate success. add the item to the player's inventory
      var itemId = res.item_number
      log.debug("successful non-duplicate transaction. adding item to inventory", {itemId: itemId});
      var grant = server.GrantItemsToUser({PlayFabId: currentPlayerId, Annotation: "paypal tx="+paypalTransactionId, ItemIds: [itemId]});
      if (grant.ItemGrantResults) {
        txnHistory[paypalTransactionId] = grant.ItemGrantResults[0].ItemInstanceId;
        server.UpdateUserInternalData({PlayFabId: currentPlayerId, Data: {PaypalTxns: txnHistory}});
        // fall through to the success case at the end
      }
      else {
        log.debug("playfab item grant failed", grant);
        return {
          state: 'error',
          playfabGrantItemResponse: grant
        }
      }
    }
    else {
      // paypal failed for some reason
      return {
        state: 'error',
        paypalResponse: res
      }
    }
  }
  // either we granted the item successfully this time, or this txn already succeeded
  return {
    state: 'success',
    tx: paypalTransactionId,
    playfabId: currentPlayerId,
    itemId: itemId
  }
};
