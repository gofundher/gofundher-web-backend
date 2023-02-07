var ipn = require('paypal-ipn');
const paymentController = require("./payment.controller");

const ipnHandler = async (req, res) => {
  const params = req.body;
  console.log(req.body);
  res.send(200);
  // Build the body of the verification post message by prefixing 'cmd=_notify-validate'.
  ipn.verify(params, {
    allow_sandbox: true
  }, function callback(err) {
    if (err) {
      console.error(err, 'PAYPAL IPN ERROR');
    } else {
      if (params.payment_status == 'Completed') {
        // Payment has been confirmed as completed
        if (params.txn_type === "recurring_payment") {
          paymentController.recurringChargeWebhook({
            resource: {
              billing_agreement_id: params.recurring_payment_id,
              amount: {
                total: params.amount
              },
              transaction_fee: {
                value: params.payment_fee
              },
              id: params.txn_id,
              state: params.payment_status
            }
          });
        } else {
          paymentController.updatePaymentStatus(
            params.custom,
            params.txn_id,
            params.payment_fee
          );
        }
      }
    }
  });
};

module.exports = ipnHandler