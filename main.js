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
  var txnHistory = user.Data.PaypalTxns ? JSON.parse(user.Data.PaypalTxns.Value) : {};
  var itemInstanceId = txnHistory[paypalTransactionId];
  if (!!itemInstanceId) {
    // this transaction already succeeded
    log.debug("already applied this transaction ", +JSON.stringify({tx: paypalTransactionId, currentPlayerId: currentPlayerId, itemInstanceId: itemInstanceId}));
  }
  else {
    log.debug("haven't yet applied this transaction "+JSON.stringify({tx: paypalTransactionId, currentPlayerId: currentPlayerId, txnHistory: txnHistory}));
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
    if (res.hasOwnProperty('SUCCESS')) {
      // non-duplicate success. add the item to the player's inventory
      var itemId = res.item_number
      log.debug("successful non-duplicate transaction. adding item to inventory "+JSON.stringify({itemId: itemId}));
      // careful here - if the grant succeeds and the update doesn't, it's re-applied on every reload - infinite crystals
      var grant = server.GrantItemsToUser({PlayFabId: currentPlayerId, Annotation: "paypal tx="+paypalTransactionId, ItemIds: [itemId]});
      if (grant.ItemGrantResults) {
        itemInstanceId = txnHistory[paypalTransactionId] = grant.ItemGrantResults[0].ItemInstanceId;
        log.debug("update txnHistory: "+JSON.stringify(txnHistory));
        var update = server.UpdateUserInternalData({PlayFabId: currentPlayerId, Data: {PaypalTxns: JSON.stringify(txnHistory)}});
        log.debug(update);
        // fall through to the success case at the end
      }
      else {
        log.debug("playfab item grant failed "+JSON.stringify(grant));
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
    itemInstanceId: itemInstanceId
  }
};
