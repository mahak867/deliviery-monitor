function configuredProviders(config) {
  return {
    razorpay: Boolean(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET),
    phonepe: Boolean(config.PHONEPE_MERCHANT_ID && config.PHONEPE_SALT_KEY && config.PHONEPE_SALT_INDEX),
    paytm: Boolean(config.PAYTM_MID && config.PAYTM_MERCHANT_KEY)
  };
}

function simulatedIntent(method, amount, orderId, reason) {
  const fallbackGateways = {
    upi: ["Razorpay UPI", "PhonePe UPI", "Paytm UPI"],
    card: ["Razorpay Card", "Paytm Card"],
    wallet: ["SwiftSeva Wallet"],
    cod: ["Cash on Delivery"]
  };
  const list = fallbackGateways[method] || fallbackGateways.upi;
  const gateway = list[Math.floor(Math.random() * list.length)];
  return {
    method,
    gateway,
    fee: Number((method === "card" ? amount * 0.018 : method === "wallet" ? amount * 0.003 : 0).toFixed(2)),
    status: method === "cod" ? "pay_on_delivery" : "pending",
    externalOrderId: null,
    mode: "simulated",
    reason
  };
}

async function createRazorpayOrder(config, amount, orderId, phone) {
  const auth = Buffer.from(`${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`).toString("base64");
  const body = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: orderId,
    notes: {
      platform: "SwiftSeva",
      phone
    }
  };
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Razorpay error: ${response.status} ${text}`);
  }
  const data = await response.json();
  return {
    method: "upi_or_card",
    gateway: "Razorpay",
    fee: 0,
    status: "initiated",
    externalOrderId: data.id,
    mode: "live",
    raw: {
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: data.status
    }
  };
}

function createPhonePeInitiation(config, amount, orderId) {
  return {
    method: "upi",
    gateway: "PhonePe",
    fee: 0,
    status: "sdk_required",
    externalOrderId: `${config.PHONEPE_MERCHANT_ID || "PHONEPE"}-${orderId}`,
    mode: "integration_ready",
    nextStep: "Use PhonePe PG SDK/client flow with merchant credentials."
  };
}

function createPaytmInitiation(config, amount, orderId) {
  return {
    method: "upi_or_card",
    gateway: "Paytm",
    fee: 0,
    status: "sdk_required",
    externalOrderId: `${config.PAYTM_MID || "PAYTM"}-${orderId}`,
    mode: "integration_ready",
    nextStep: "Use Paytm checkout initiation from backend with checksum signing."
  };
}

async function createPaymentIntent(config, payload) {
  const method = payload.method;
  const amount = Number(payload.amount || 0);
  const orderId = payload.orderId || "ORDER-UNKNOWN";
  const phone = payload.phone || "";
  const providerFlags = configuredProviders(config);

  if (method === "cod") {
    return simulatedIntent(method, amount, orderId, "cod");
  }
  if (method === "wallet") {
    return simulatedIntent(method, amount, orderId, "internal_wallet");
  }

  if ((method === "upi" || method === "card") && providerFlags.razorpay) {
    try {
      const live = await createRazorpayOrder(config, amount, orderId, phone);
      live.method = method;
      return live;
    } catch (error) {
      return simulatedIntent(method, amount, orderId, `razorpay_failed:${error.message}`);
    }
  }
  if (method === "upi" && providerFlags.phonepe) {
    return createPhonePeInitiation(config, amount, orderId);
  }
  if ((method === "upi" || method === "card") && providerFlags.paytm) {
    return createPaytmInitiation(config, amount, orderId);
  }
  return simulatedIntent(method, amount, orderId, "no_gateway_keys");
}

module.exports = {
  configuredProviders,
  createPaymentIntent
};
