/**
 * Ticket Sales
 */
;(function(){

  $('#payment-form select[name=quantity]').bind('change keyup', function(event){
    var price = $(this).find('option:selected').data('price');
    $('#payment-form button[type=submit]').text('Pay ARS '+ price);
  }).trigger('change');


  $('#payment-form').submit(function(event){
    event.preventDefault();

    if( $(this).hasClass('loading') ) {
      return false;
    }

    $(this).addClass('loading');

    ga( 'send', 'event', 'purchase', 'begin', 'regular' );

    $.ajax({
      'method': 'POST',
      'url': '/tickets/authorization',
      'data': { 
        'name': $('#payment-form input[name=name]').val(),
        'email': $('#payment-form input[name=email]').val(),
        'cardtype': $('#payment-form input[name=cardtype]:checked').val(),
        'paymenttype': $('#payment-form select[name=paymenttype]').val(),
        'quantity': $('#payment-form select[name=quantity]').val()
      },
      'success': function(data){

        if( typeof data.salesError !== 'undefined' ) {
          // Something went wrong (there are no tickets available or the sale hasn't started yet)
          showError( data.salesError );
          ga( 'send', 'event', 'error', 'purchase', data.salesError );
          return;
        }
        
        initPayment(data);

      },
      'error': function(data){
        showError("There are some connectivity issues and we can't get started with your payment.<br/>Try again in 30 seconds!");
        ga( 'send', 'event', 'error', 'connectivity', 'authorization-request' );
      }
    });
  });

  var authorizationUid;
  function initPayment(data) {

    JsConfPayments({
      'api_key': 'public_live_mwhz6e34hvukjc5q', 
      'authorization_uid': data.uid
    }, function(error){

      if(error) {
        //handle error
        showError("We had an issue while setting up your payment. Try again!");
        ga( 'send', 'event', 'error', 'payment', 'authorization' );
        return;
      }

      // Hide the input modal and show the Checkout one
      showCheckoutBackground();

      authorizationUid = data.uid;
      this.charge(confirmPayment);

      ga( 'send', 'event', 'purchase', 'creditcard' );
    });
  }

  function confirmPayment(error, data) {

    if(error) {
      // Todo: handle error
      showError("There was an issue when processing your payment. Your card has not been charged.");
      return;
    }

    $.ajax({
      'method': 'POST',
      'url': '/tickets/confirm',
      'data': { 'charge_uid': data.charge_uid, 'authorization_uid': authorizationUid },
      'success': function(res) {
        if(res === 'ok') {
          showSuccess("Yay! I'm yours to take home :D");

          // Tracking
          ga( 'send', 'event', 'purchase', 'success' );

          ga('ecommerce:addTransaction', {
            'id': authorizationUid,
            'affiliation': 'JSConf Argentina',
            'revenue': '1499.00'
          });
          ga('ecommerce:addItem', {
            'id': authorizationUid,
            'name': 'Regular Ticket',
            'sku': 'regular',
            'category': 'Tickets',
            'price': '1499.00',
            'quantity': '1'
          });
          ga('ecommerce:send');

        } else {

          if( typeof res.salesError === 'string' ) {
            showError(res.salesError);
            ga( 'send', 'event', 'purchase', 'failed', res.salesError );
          } else {
            showError("There was an issue with your payment info. Your card has not been charged.<br/>Try again with another card.");
            ga( 'send', 'event', 'purchase', 'failed', 'payment-info' );
          }
        }
      },
      'error': function() {
        showError("There are some connectivity issues and we can't verify if your payment was made. Contact us at <a href=\"mailto:support@jsconfar.com\">support@jsconfar.com</a>.");
        ga( 'send', 'event', 'error', 'connectivity', 'payment-confirmation' );
      }
    });
  }


  function showCheckoutBackground() {
    $('#modal-holder > .modal').hide();

    $('#modal-holder > .modal-loading').show();
    $('#modal-holder').show();
  }


  function showSuccess(message) {
    $('#payment-form').removeClass('loading');
    $('#modal-holder > .modal').hide();

    $('#modal-holder > .modal-success h2').html(message);
    $('#modal-holder > .modal-success').show();
    $('#modal-holder').show();
  }


  function showError(message) {
    $('#payment-form').removeClass('loading');
    $('#modal-holder > .modal').hide();

    $('#modal-holder > .modal-error h2').html(message);
    $('#modal-holder > .modal-error').show();
    $('#modal-holder').show();
  }



  $('.button-get-tickets').click(function(event){
    event.preventDefault();
    $('#modal-holder > .modal').hide();
    $('#modal-holder > .modal-payment').show();
    $('.modal-holder').fadeIn(200);
  });


  $('.modal-close').click(function(event){
    event.preventDefault();
    if( $('#payment-form').hasClass('loading') ) {
      // Don't close
      alert("Hold on, we're setting up the payment. Wait 30 seconds and refresh the page if it's still loading.");
    } else {
      $('#modal-holder > .modal').hide();
      $('#modal-holder > .modal-payment').show();
      $('#modal-holder').hide();
    }
  });

  $('.cardtype .card-select input').on('change keyup', function(event){
    var $holder = $(this).closest('.cardtype');
    $holder.find('.card-select').removeClass('selected');
    $holder.find('input:checked').parent().addClass('selected');
  });

  $('.cardtype .card-select input:checked').trigger('change');


  $('.modal-success button, .modal-error button').click(function(event){
    $('.modal-close').trigger('click');
  });


  // Prevent closing the tab if the payment form is processing
  window.onbeforeunload = function (event) {
      var event = event || window.event;

      if( $('#payment-form').hasClass('loading') ) {
        return "If you close the tab while processing the payment you'll have to start again.";
      }
  };



})();
