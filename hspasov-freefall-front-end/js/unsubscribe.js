function start () {
  const mainUtils = main();
  const trace = mainUtils.trace;
  const ApplicationError = mainUtils.ApplicationError;
  const PeerError = mainUtils.PeerError;
  const assertApp = mainUtils.assertApp;
  const assertPeer = mainUtils.assertPeer;
  const assertUser = mainUtils.assertUser;
  const sendRequest = mainUtils.sendRequest;
  const displayUserMessage = mainUtils.displayUserMessage;
  const SERVER_URL = mainUtils.SERVER_URL;
  const validateSubscriptionRes = validators.getValidateSubscriptionRes();
  const validateSubscriptionReq = validators.getValidateSubscriptionReq();
  const validateErrorRes = validators.getValidateErrorRes();
  const $unsubscribeForm = $('#unsubscribe-form');
  const $unsubscribeBtn = $('#unsubscribe-button');

  function unsubscribe (params, protocolName, callback) {
    trace('unsubscribe(' + JSON.stringify(params) + '), typeof arg=' + typeof params + ''); // eslint-disable-line prefer-template

    const { email } = params;

    assertApp(validateSubscriptionReq(params), {
      msg: 'Params do not adhere to subscriptionRequestSchema',
    });

    sendRequest({
      url: SERVER_URL,
      data: {
        method: 'unsubscribe',
        params: params,
      },
      protocolName: protocolName,
    }, function (result, error) { // eslint-disable-line prefer-arrow-callback
      if (error) {
        assertPeer(validateErrorRes(error), {
          msg: 'Params do not adhere to errorResponseSchema',
        });

        trace('Error in unsubscribe:' + JSON.stringify(error)); // eslint-disable-line prefer-template
        throw new PeerError({
          msg: error.message,
        });
      }

      assertPeer(validateSubscriptionRes(result), {
        msg: 'Params do not adhere to subscriptionResponseSchema',
      });
      assertUser(result.status_code >= 1000 && result.status_code < 2000, {
        userMessage: 'There was no subscription with email ' + email + '.', // eslint-disable-line prefer-template
        msg: 'Server returned ' + result.status_code + ' status code. Sent params: ' + params + '. Got result: ' + result + '', // eslint-disable-line prefer-template
      });

      callback(result);
    });
  }

  $(document).ready(function () { // eslint-disable-line prefer-arrow-callback
    $unsubscribeBtn.click(function (e) { // eslint-disable-line prefer-arrow-callback
      e.preventDefault();
      trace('Unsubscribe button clicked');

      // TODO - disable and enable button - in a closure
      $unsubscribeBtn.prop('disabled', true);

      const formParams = $unsubscribeForm
        .serializeArray()
        .reduce(function (acc, current) { // eslint-disable-line prefer-arrow-callback
          assertApp(_.isObject(current), 'Form parameter "' + current + '" not an object'); // eslint-disable-line prefer-template
          assertApp(typeof current.name === 'string', 'Expected name of form parameter to be string, but got ' + typeof current.name + ', name = ' + current.name + ''); // eslint-disable-line prefer-template
          assertApp(typeof current.value === 'string', 'Expected value of form parameter to be string, but got ' + typeof current.value + ', value = ' + current.value + ''); // eslint-disable-line prefer-template

          if (current.value.length <= 0) {
            return acc;
          }

          if (current.name === 'email') {
            acc.email = current.value;
          } else {
            throw new ApplicationError('Invalid unsubscribe form param ' + current.name + ''); // eslint-disable-line prefer-template
          }

          return acc;
        }, {});

      const params = formParams;
      params.v = '2.0';

      unsubscribe(params, 'jsonrpc', function (result) { // eslint-disable-line prefer-arrow-callback
        if (result.status_code >= 1000 && result.status_code < 2000) {
          displayUserMessage('Successfully unsubscribed!', 'success');
        } else if (result.status_code === 2000) {
          displayUserMessage('There is no information about this flight at the moment. Please come back in 15 minutes.', 'info');
        }

        $unsubscribeBtn.prop('disabled', false);
      });
    });
  });
}

start();
