const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { randomUUID, createHmac, timingSafeEqual } = require("crypto");

const { configFromEnv } = require("./lib/env");
const { signToken, verifyToken, normalizePhone, isValidIndianPhone, randomOtp, hashOtp } = require("./lib/auth");
const { configuredProviders, createPaymentIntent } = require("./lib/payments");
const { createStateStore } = require("./lib/state-store");

const config = configFromEnv(__dirname);
const PORT = config.PORT;
const PUBLIC_DIR = config.PUBLIC_DIR;

const paymentGateways = {
  upi: ["Razorpay UPI", "PhonePe UPI", "Paytm UPI"],
  card: ["Razorpay Card", "Paytm Card"],
  wallet: ["SwiftSeva Wallet"],
  cod: ["Cash on Delivery"]
};

const seedState = {
  settings: {
    minimumOwnFleetShare: 0.45,
    expressOwnPriority: true
  },
  cities: [
    { id: "BLR", name: "Bengaluru", prefixes: ["56"], tier: 1, ownFleetCapacity: 0.76, partnerNetworks: ["Shadowfax", "Porter"] },
    { id: "MUM", name: "Mumbai", prefixes: ["40"], tier: 1, ownFleetCapacity: 0.71, partnerNetworks: ["Dunzo", "Borzo"] },
    { id: "DEL", name: "Delhi NCR", prefixes: ["11"], tier: 1, ownFleetCapacity: 0.7, partnerNetworks: ["Shadowfax", "LoadShare"] },
    { id: "HYD", name: "Hyderabad", prefixes: ["50"], tier: 1, ownFleetCapacity: 0.66, partnerNetworks: ["Porter", "Dunzo"] },
    { id: "PUN", name: "Pune", prefixes: ["41"], tier: 1, ownFleetCapacity: 0.64, partnerNetworks: ["Borzo", "Shadowfax"] },
    { id: "CHE", name: "Chennai", prefixes: ["60"], tier: 1, ownFleetCapacity: 0.63, partnerNetworks: ["LoadShare", "Porter"] },
    { id: "KOL", name: "Kolkata", prefixes: ["70"], tier: 1, ownFleetCapacity: 0.58, partnerNetworks: ["Shadowfax", "Dunzo"] },
    { id: "AMD", name: "Ahmedabad", prefixes: ["38"], tier: 2, ownFleetCapacity: 0.52, partnerNetworks: ["Borzo", "Shadowfax"] },
    { id: "JPR", name: "Jaipur", prefixes: ["30"], tier: 2, ownFleetCapacity: 0.48, partnerNetworks: ["Porter", "LoadShare"] },
    { id: "LKO", name: "Lucknow", prefixes: ["22"], tier: 2, ownFleetCapacity: 0.44, partnerNetworks: ["Shadowfax", "Borzo"] }
  ],
  catalog: [
    { id: "P1001", name: "Chicken Dum Biryani", category: "Food", price: 249, eta: 28 },
    { id: "P1002", name: "Veg Thali Combo", category: "Food", price: 189, eta: 23 },
    { id: "P1003", name: "A2 Milk 1L", category: "Grocery", price: 72, eta: 16 },
    { id: "P1004", name: "Fresh Bananas 1kg", category: "Grocery", price: 58, eta: 14 },
    { id: "P1005", name: "Paracetamol 650", category: "Medicine", price: 42, eta: 19 },
    { id: "P1006", name: "Vitamin C Tablets", category: "Medicine", price: 299, eta: 24 },
    { id: "P1007", name: "USB-C Fast Charger", category: "Electronics", price: 599, eta: 35 },
    { id: "P1008", name: "Power Bank 10000mAh", category: "Electronics", price: 1199, eta: 41 },
    { id: "P1009", name: "Parcel Pickup Slot", category: "Parcel", price: 129, eta: 20 }
  ],
  vendors: [
    { id: "V-F-BLR", name: "Bengaluru Food Hub", cityId: "BLR", categories: ["Food"] },
    { id: "V-G-BLR", name: "Bengaluru Grocery Mart", cityId: "BLR", categories: ["Grocery", "Medicine"] },
    { id: "V-E-BLR", name: "Bengaluru Tech Stop", cityId: "BLR", categories: ["Electronics", "Parcel"] },
    { id: "V-F-MUM", name: "Mumbai Food Hub", cityId: "MUM", categories: ["Food"] },
    { id: "V-G-MUM", name: "Mumbai Grocery Mart", cityId: "MUM", categories: ["Grocery", "Medicine"] },
    { id: "V-E-MUM", name: "Mumbai Tech Stop", cityId: "MUM", categories: ["Electronics", "Parcel"] },
    { id: "V-F-DEL", name: "Delhi Food Hub", cityId: "DEL", categories: ["Food"] },
    { id: "V-G-DEL", name: "Delhi Grocery Mart", cityId: "DEL", categories: ["Grocery", "Medicine"] },
    { id: "V-E-DEL", name: "Delhi Tech Stop", cityId: "DEL", categories: ["Electronics", "Parcel"] }
  ],
  riders: [
    { id: "R-BLR-01", name: "Rahul K", cityId: "BLR", vehicle: "Bike KA-03", available: true, phone: "+91 90000 11101" },
    { id: "R-BLR-02", name: "Sita P", cityId: "BLR", vehicle: "Scooter KA-01", available: true, phone: "+91 90000 11102" },
    { id: "R-MUM-01", name: "Aman T", cityId: "MUM", vehicle: "Bike MH-04", available: true, phone: "+91 90000 11103" },
    { id: "R-DEL-01", name: "Neha R", cityId: "DEL", vehicle: "Bike DL-07", available: true, phone: "+91 90000 11104" }
  ],
  users: [],
  otpChallenges: [],
  orders: [],
  tickets: []
};

let store = null;
let state = null;

function mergeState(loadedState) {
  const clonedSeed = JSON.parse(JSON.stringify(seedState));
  if (!loadedState) return clonedSeed;
  return {
    ...clonedSeed,
    ...loadedState,
    settings: { ...clonedSeed.settings, ...(loadedState.settings || {}) },
    cities: Array.isArray(loadedState.cities) && loadedState.cities.length ? loadedState.cities : clonedSeed.cities,
    catalog: Array.isArray(loadedState.catalog) && loadedState.catalog.length ? loadedState.catalog : clonedSeed.catalog,
    vendors: Array.isArray(loadedState.vendors) && loadedState.vendors.length ? loadedState.vendors : clonedSeed.vendors,
    riders: Array.isArray(loadedState.riders) && loadedState.riders.length ? loadedState.riders : clonedSeed.riders,
    users: Array.isArray(loadedState.users) ? loadedState.users : [],
    otpChallenges: Array.isArray(loadedState.otpChallenges) ? loadedState.otpChallenges : [],
    orders: Array.isArray(loadedState.orders) ? loadedState.orders : [],
    tickets: Array.isArray(loadedState.tickets) ? loadedState.tickets : []
  };
}

function cleanupOtpChallenges() {
  const now = Date.now();
  state.otpChallenges = state.otpChallenges.filter((entry) => {
    return new Date(entry.expiresAt).getTime() > now && entry.attempts < config.OTP_MAX_ATTEMPTS;
  }).slice(-300);
}

async function persistState() {
  cleanupOtpChallenges();
  await store.write(state);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, contentType, text) {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(text);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function parseRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function chooseCityByPincode(pincode) {
  if (!/^\d{6}$/.test(pincode)) {
    return null;
  }
  const prefix = pincode.slice(0, 2);
  return state.cities.find((city) => city.prefixes.includes(prefix)) || null;
}

function categoryFrequency(items) {
  const map = {};
  items.forEach((item) => {
    map[item.category] = (map[item.category] || 0) + item.qty;
  });
  return map;
}

function pickVendor(cityId, itemDetails) {
  const freq = categoryFrequency(itemDetails);
  const dominantCategory = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  const cityVendors = state.vendors.filter((vendor) => vendor.cityId === cityId);
  return cityVendors.find((vendor) => vendor.categories.includes(dominantCategory)) || cityVendors[0] || null;
}

function pickDispatch(city, orderMeta) {
  const hasMedicine = orderMeta.itemDetails.some((item) => item.category === "Medicine");
  const isExpress = orderMeta.deliveryMode === "express";
  const distanceKm = Number(orderMeta.distanceKm || 5);
  const ownThreshold = Number(state.settings.minimumOwnFleetShare || 0.45);
  const preferOwn = state.settings.expressOwnPriority === true;
  let useOwnFleet = false;

  if (city.ownFleetCapacity >= ownThreshold) useOwnFleet = true;
  if (isExpress && preferOwn && city.ownFleetCapacity >= 0.3) useOwnFleet = true;
  if (hasMedicine && city.ownFleetCapacity >= 0.25) useOwnFleet = true;
  if (distanceKm > 12 || city.ownFleetCapacity < 0.2) useOwnFleet = false;

  const baseEta = isExpress ? 28 : orderMeta.deliveryMode === "scheduled" ? 65 : 38;
  if (useOwnFleet) {
    return {
      mode: "own_fleet",
      partnerName: null,
      promisedEtaMins: Math.max(12, baseEta - 6)
    };
  }
  const partner = city.partnerNetworks[state.orders.length % city.partnerNetworks.length];
  return {
    mode: "partner_network",
    partnerName: partner,
    promisedEtaMins: Math.max(15, baseEta + 4)
  };
}

function deliveryFee(subtotal, deliveryMode, plusMember) {
  let fee = deliveryMode === "express" ? 79 : deliveryMode === "scheduled" ? 49 : 39;
  if (deliveryMode === "standard" && subtotal >= 699) fee = 0;
  if (plusMember) {
    if (deliveryMode === "standard") fee = 0;
    if (deliveryMode === "express") fee = Math.max(0, fee - 35);
  }
  return fee;
}

function couponDiscount(subtotal, couponCode, plusMember) {
  if (!couponCode) return 0;
  const normalized = String(couponCode).toUpperCase();
  if (normalized === "SAVE120" && subtotal >= 1000) return 120;
  if (normalized === "FESTIVE10" && subtotal >= 499) return Math.min(300, subtotal * 0.1);
  if (normalized === "PLUS25" && plusMember && subtotal >= 399) return Math.min(150, subtotal * 0.25);
  return 0;
}

function computeOrderTotals(itemDetails, meta) {
  const subtotal = itemDetails.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = couponDiscount(subtotal, meta.couponCode, meta.plusMember);
  const delivery = deliveryFee(subtotal, meta.deliveryMode, meta.plusMember);
  const taxable = Math.max(0, subtotal - discount);
  const gst = taxable * 0.05;
  const total = taxable + delivery + gst;
  return {
    subtotal: roundCurrency(subtotal),
    discount: roundCurrency(discount),
    delivery: roundCurrency(delivery),
    gst: roundCurrency(gst),
    total: roundCurrency(total)
  };
}

function roundCurrency(value) {
  return Number(Number(value).toFixed(2));
}

function addTimeline(order, status, note) {
  order.timeline.push({
    at: new Date().toISOString(),
    status,
    note
  });
}

function addTimelineOnce(order, status, note) {
  const last = order.timeline[order.timeline.length - 1];
  if (last && last.status === status && last.note === note) {
    return;
  }
  addTimeline(order, status, note);
}

function hmacSha256Hex(secret, message) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function safeEqualString(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function findOrderByRazorpayOrderId(razorpayOrderId) {
  if (!razorpayOrderId) return null;
  return state.orders.find((order) => order.payment && order.payment.externalOrderId === razorpayOrderId) || null;
}

function markOrderPaymentCaptured(order, paymentEntity, source) {
  order.payment.status = "success";
  order.payment.mode = order.payment.mode || "live";
  order.payment.paymentId = paymentEntity?.id || order.payment.paymentId || null;
  order.payment.razorpayOrderId = paymentEntity?.order_id || order.payment.razorpayOrderId || order.payment.externalOrderId || null;
  order.payment.lastEvent = source;
  order.updatedAt = new Date().toISOString();
  addTimelineOnce(order, "PAYMENT_CAPTURED", `${source}: payment captured (${order.payment.paymentId || "unknown"}).`);
}

function markOrderPaymentFailed(order, paymentEntity, source) {
  order.payment.status = "failed";
  order.payment.mode = order.payment.mode || "live";
  order.payment.paymentId = paymentEntity?.id || order.payment.paymentId || null;
  order.payment.razorpayOrderId = paymentEntity?.order_id || order.payment.razorpayOrderId || order.payment.externalOrderId || null;
  order.payment.errorCode = paymentEntity?.error_code || order.payment.errorCode || null;
  order.payment.errorDescription = paymentEntity?.error_description || order.payment.errorDescription || null;
  order.payment.lastEvent = source;
  order.updatedAt = new Date().toISOString();
  addTimelineOnce(order, "PAYMENT_FAILED", `${source}: payment failed (${order.payment.paymentId || "unknown"}).`);
}

function summarizeOrder(order) {
  return {
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    city: order.cityName,
    pincode: order.pincode,
    customerStatus: order.customerStatus,
    vendorStatus: order.vendorStatus,
    riderStatus: order.riderStatus,
    deliveryMode: order.deliveryMode,
    dispatchMode: order.dispatch.mode,
    partnerName: order.dispatch.partnerName,
    riderId: order.riderId,
    vendorId: order.vendorId,
    createdAt: order.createdAt,
    totals: order.totals,
    payment: order.payment
  };
}

function summarizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

function notFound(res) {
  sendJson(res, 404, { ok: false, message: "Not found" });
}

function extractBearerToken(req, urlObject) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const queryToken = urlObject.searchParams.get("token");
  return queryToken ? String(queryToken).trim() : "";
}

function authorize(req, res, urlObject, allowedRoles = []) {
  const token = extractBearerToken(req, urlObject);
  if (!token) {
    if (config.ENFORCE_AUTH) {
      sendJson(res, 401, { ok: false, message: "Authorization token required." });
      return { ok: false, user: null };
    }
    return { ok: true, user: null };
  }
  try {
    const payload = verifyToken(token, config.JWT_SECRET);
    if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
      sendJson(res, 403, { ok: false, message: "Forbidden for current role." });
      return { ok: false, user: null };
    }
    return { ok: true, user: payload };
  } catch (error) {
    sendJson(res, 401, { ok: false, message: error.message || "Invalid token." });
    return { ok: false, user: null };
  }
}

function enforceRole(req, res, urlObject, roles) {
  const auth = authorize(req, res, urlObject, roles);
  if (!auth.ok) return null;
  if (!auth.user && config.ENFORCE_AUTH) return null;
  return auth.user;
}

async function sendOtpSms(phone, otp) {
  if (!config.MSG91_AUTH_KEY || !config.MSG91_TEMPLATE_ID) {
    return { sent: false, provider: "dev", reason: "MSG91 not configured" };
  }
  const mobile = normalizePhone(phone).replace(/^\+/, "");
  const payload = {
    template_id: config.MSG91_TEMPLATE_ID,
    mobile,
    authkey: config.MSG91_AUTH_KEY,
    otp,
    sender: config.MSG91_SENDER
  };
  try {
    const response = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      return { sent: false, provider: "msg91", reason: `HTTP ${response.status} ${text}` };
    }
    return { sent: true, provider: "msg91" };
  } catch (error) {
    return { sent: false, provider: "msg91", reason: error.message };
  }
}

async function handleApi(req, res, urlObject) {
  const pathname = urlObject.pathname;
  const method = req.method || "GET";

  if (method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, now: new Date().toISOString() });
    return;
  }

  if (method === "GET" && pathname === "/api/system/config") {
    sendJson(res, 200, {
      ok: true,
      persistenceMode: config.PERSISTENCE_MODE,
      authEnforced: config.ENFORCE_AUTH,
      paymentProviders: configuredProviders(config),
      webhookConfigured: Boolean(config.RAZORPAY_WEBHOOK_SECRET)
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/request-otp") {
    const body = await parseBody(req);
    const phone = normalizePhone(body.phone);
    const role = String(body.role || "customer").toLowerCase();
    const allowedRoles = ["customer", "vendor", "rider", "admin"];
    if (!isValidIndianPhone(phone)) {
      sendJson(res, 400, { ok: false, message: "Invalid Indian phone number." });
      return;
    }
    if (!allowedRoles.includes(role)) {
      sendJson(res, 400, { ok: false, message: "Invalid role." });
      return;
    }
    const otp = randomOtp();
    const nonce = randomUUID();
    const expiresAt = new Date(Date.now() + config.OTP_TTL_SECONDS * 1000).toISOString();
    const challenge = {
      id: "OTP-" + Math.floor(Date.now() / 1000) + "-" + Math.floor(Math.random() * 1000),
      phone,
      role,
      codeHash: hashOtp(otp, nonce),
      nonce,
      attempts: 0,
      expiresAt,
      createdAt: new Date().toISOString()
    };
    state.otpChallenges.push(challenge);
    cleanupOtpChallenges();
    await persistState();
    const smsResult = await sendOtpSms(phone, otp);
    sendJson(res, 200, {
      ok: true,
      challengeId: challenge.id,
      expiresAt,
      channel: smsResult.provider,
      smsSent: smsResult.sent,
      devOtp: smsResult.sent ? undefined : otp,
      message: smsResult.sent ? "OTP sent." : "OTP generated in dev mode."
    });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/verify-otp") {
    const body = await parseBody(req);
    const phone = normalizePhone(body.phone);
    const role = String(body.role || "customer").toLowerCase();
    const code = String(body.code || "").trim();
    const challengeId = String(body.challengeId || "").trim();
    if (!isValidIndianPhone(phone) || !code) {
      sendJson(res, 400, { ok: false, message: "phone and code are required." });
      return;
    }
    cleanupOtpChallenges();
    const challenge = state.otpChallenges.find((entry) => {
      return entry.phone === phone && entry.role === role && (!challengeId || entry.id === challengeId);
    });
    if (!challenge) {
      sendJson(res, 400, { ok: false, message: "OTP challenge not found or expired." });
      return;
    }
    challenge.attempts += 1;
    const hash = hashOtp(code, challenge.nonce);
    if (hash !== challenge.codeHash) {
      await persistState();
      sendJson(res, 401, { ok: false, message: "Invalid OTP code." });
      return;
    }

    state.otpChallenges = state.otpChallenges.filter((entry) => entry.id !== challenge.id);
    let user = state.users.find((entry) => entry.phone === phone && entry.role === role);
    if (!user) {
      user = {
        id: "USR-" + Math.floor(Date.now() / 1000) + "-" + Math.floor(Math.random() * 1000),
        name: body.name ? String(body.name).trim() : role.toUpperCase() + " User",
        phone,
        role,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      state.users.push(user);
    } else {
      user.lastLoginAt = new Date().toISOString();
      if (body.name) user.name = String(body.name).trim();
    }
    await persistState();
    const token = signToken({
      sub: user.id,
      role: user.role,
      phone: user.phone,
      name: user.name
    }, config.JWT_SECRET);
    sendJson(res, 200, { ok: true, token, user: summarizeUser(user) });
    return;
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    const auth = authorize(req, res, urlObject, []);
    if (!auth.ok) return;
    if (!auth.user) {
      sendJson(res, 200, { ok: true, authenticated: false });
      return;
    }
    const user = state.users.find((entry) => entry.id === auth.user.sub) || auth.user;
    sendJson(res, 200, { ok: true, authenticated: true, user: summarizeUser(user) });
    return;
  }

  if (method === "GET" && pathname === "/api/bootstrap") {
    sendJson(res, 200, {
      ok: true,
      cities: state.cities.map((city) => ({
        id: city.id,
        name: city.name,
        prefixes: city.prefixes,
        tier: city.tier,
        ownFleetCapacity: city.ownFleetCapacity
      })),
      categories: [...new Set(state.catalog.map((item) => item.category))],
      payments: paymentGateways,
      auth: {
        enforced: config.ENFORCE_AUTH
      }
    });
    return;
  }

  if (method === "GET" && pathname === "/api/catalog") {
    const category = (urlObject.searchParams.get("category") || "").trim();
    const query = (urlObject.searchParams.get("q") || "").trim().toLowerCase();
    const items = state.catalog.filter((item) => {
      const categoryMatch = !category || category === "All" || item.category === category;
      const queryMatch = !query || item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
      return categoryMatch && queryMatch;
    });
    sendJson(res, 200, { ok: true, items });
    return;
  }

  if (method === "GET" && pathname === "/api/customer/serviceability") {
    const pincode = String(urlObject.searchParams.get("pincode") || "");
    const city = chooseCityByPincode(pincode);
    if (!city) {
      sendJson(res, 200, { ok: true, serviceable: false, message: "Pincode not serviceable yet." });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      serviceable: true,
      city: city.name,
      tier: city.tier,
      recommendedMode: city.tier === 1 ? "express" : "standard"
    });
    return;
  }

  if (method === "GET" && pathname === "/api/payments/options") {
    sendJson(res, 200, {
      ok: true,
      gateways: paymentGateways,
      providers: configuredProviders(config)
    });
    return;
  }

  if (method === "GET" && pathname === "/api/payments/providers") {
    sendJson(res, 200, {
      ok: true,
      providers: configuredProviders(config),
      webhookConfigured: Boolean(config.RAZORPAY_WEBHOOK_SECRET)
    });
    return;
  }

  if (method === "POST" && pathname === "/api/payments/quote") {
    const body = await parseBody(req);
    const methodName = body.method || "upi";
    const amount = Number(body.amount || 0);
    const orderId = body.orderId || "QUOTE-" + Math.floor(Date.now() / 1000);
    const quote = await createPaymentIntent(config, {
      method: methodName,
      amount,
      orderId,
      phone: body.phone || ""
    });
    sendJson(res, 200, { ok: true, quote });
    return;
  }

  if (method === "POST" && pathname === "/api/payments/razorpay/verify-signature") {
    const body = await parseBody(req);
    const orderId = String(body.orderId || "").trim();
    const razorpayPaymentId = String(body.razorpay_payment_id || "").trim();
    const razorpayOrderId = String(body.razorpay_order_id || "").trim();
    const razorpaySignature = String(body.razorpay_signature || "").trim();

    if (!config.RAZORPAY_KEY_SECRET) {
      sendJson(res, 503, { ok: false, message: "Razorpay key secret is not configured on server." });
      return;
    }
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      sendJson(res, 400, { ok: false, message: "razorpay_payment_id, razorpay_order_id and razorpay_signature are required." });
      return;
    }

    const order = (orderId ? state.orders.find((entry) => entry.id === orderId) : null) || findOrderByRazorpayOrderId(razorpayOrderId);
    if (!order) {
      sendJson(res, 404, { ok: false, message: "Local order not found for signature verification." });
      return;
    }
    const serverRazorpayOrderId = order.payment?.externalOrderId || "";
    if (!serverRazorpayOrderId) {
      sendJson(res, 400, { ok: false, message: "Order does not have a Razorpay order id to verify against." });
      return;
    }
    if (serverRazorpayOrderId !== razorpayOrderId) {
      sendJson(res, 400, { ok: false, message: "Razorpay order id mismatch for this local order." });
      return;
    }

    const expected = hmacSha256Hex(config.RAZORPAY_KEY_SECRET, `${serverRazorpayOrderId}|${razorpayPaymentId}`);
    const valid = safeEqualString(expected, razorpaySignature);
    if (!valid) {
      sendJson(res, 401, { ok: false, message: "Invalid Razorpay signature." });
      return;
    }

    markOrderPaymentCaptured(order, {
      id: razorpayPaymentId,
      order_id: razorpayOrderId
    }, "checkout_signature");
    await persistState();
    sendJson(res, 200, {
      ok: true,
      verified: true,
      order: summarizeOrder(order)
    });
    return;
  }

  if (method === "POST" && pathname === "/api/payments/razorpay/webhook") {
    if (!config.RAZORPAY_WEBHOOK_SECRET) {
      sendJson(res, 503, { ok: false, message: "RAZORPAY_WEBHOOK_SECRET is not configured." });
      return;
    }

    const signature = String(req.headers["x-razorpay-signature"] || "");
    if (!signature) {
      sendJson(res, 400, { ok: false, message: "Missing X-Razorpay-Signature header." });
      return;
    }

    const rawBody = await parseRawBody(req);
    const expectedSignature = hmacSha256Hex(config.RAZORPAY_WEBHOOK_SECRET, rawBody);
    if (!safeEqualString(expectedSignature, signature)) {
      sendJson(res, 401, { ok: false, message: "Invalid webhook signature." });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      sendJson(res, 400, { ok: false, message: "Invalid webhook JSON payload." });
      return;
    }

    const event = String(payload.event || "");
    const paymentEntity = payload?.payload?.payment?.entity || null;
    const razorpayOrderId = paymentEntity?.order_id || payload?.payload?.order?.entity?.id || null;
    const localOrder = findOrderByRazorpayOrderId(razorpayOrderId);

    if (!localOrder) {
      sendJson(res, 202, {
        ok: true,
        accepted: true,
        message: "Webhook accepted but no matching local order found.",
        event
      });
      return;
    }

    if (event === "payment.captured" || event === "order.paid") {
      markOrderPaymentCaptured(localOrder, paymentEntity, event);
      await persistState();
      sendJson(res, 200, { ok: true, processed: true, event, order: summarizeOrder(localOrder) });
      return;
    }

    if (event === "payment.failed") {
      markOrderPaymentFailed(localOrder, paymentEntity, event);
      await persistState();
      sendJson(res, 200, { ok: true, processed: true, event, order: summarizeOrder(localOrder) });
      return;
    }

    addTimelineOnce(localOrder, "PAYMENT_WEBHOOK_IGNORED", `Ignored webhook event ${event}.`);
    await persistState();
    sendJson(res, 200, { ok: true, processed: true, event, ignored: true });
    return;
  }

  if (method === "POST" && pathname === "/api/customer/orders") {
    const authUser = enforceRole(req, res, urlObject, ["customer", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;

    const body = await parseBody(req);
    const required = ["customerName", "phone", "pincode", "address", "paymentMethod", "deliveryMode", "items"];
    const missing = required.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
    if (missing.length) {
      sendJson(res, 400, { ok: false, message: `Missing fields: ${missing.join(", ")}` });
      return;
    }

    if (!Array.isArray(body.items) || !body.items.length) {
      sendJson(res, 400, { ok: false, message: "items should be a non-empty array." });
      return;
    }

    const city = chooseCityByPincode(String(body.pincode));
    if (!city) {
      sendJson(res, 400, { ok: false, message: "Pincode not serviceable currently." });
      return;
    }

    const itemDetails = [];
    for (const item of body.items) {
      const product = state.catalog.find((catalogItem) => catalogItem.id === item.productId);
      const qty = Number(item.qty || 1);
      if (!product || !Number.isInteger(qty) || qty <= 0) {
        sendJson(res, 400, { ok: false, message: "Invalid product or quantity in items." });
        return;
      }
      itemDetails.push({
        productId: product.id,
        name: product.name,
        category: product.category,
        qty,
        price: product.price
      });
    }

    const vendor = pickVendor(city.id, itemDetails);
    if (!vendor) {
      sendJson(res, 400, { ok: false, message: "No vendor available in selected city." });
      return;
    }

    const dispatch = pickDispatch(city, {
      deliveryMode: body.deliveryMode,
      distanceKm: Number(body.distanceKm || 5),
      itemDetails
    });
    const totals = computeOrderTotals(itemDetails, {
      deliveryMode: body.deliveryMode,
      couponCode: body.couponCode || "",
      plusMember: Boolean(body.plusMember)
    });

    const orderId = "SV-" + Math.floor(Date.now() / 1000) + "-" + Math.floor(Math.random() * 900 + 100);
    const payment = await createPaymentIntent(config, {
      method: body.paymentMethod,
      amount: totals.total,
      orderId,
      phone: body.phone
    });
    const order = {
      id: orderId,
      customerName: String(body.customerName),
      phone: normalizePhone(String(body.phone)),
      pincode: String(body.pincode),
      cityId: city.id,
      cityName: city.name,
      address: String(body.address),
      items: itemDetails,
      deliveryMode: body.deliveryMode,
      scheduledAt: body.deliveryMode === "scheduled" ? body.scheduledAt || null : null,
      couponCode: body.couponCode || "",
      plusMember: Boolean(body.plusMember),
      totals,
      payment,
      vendorId: vendor.id,
      dispatch,
      riderId: null,
      customerStatus: "PLACED",
      vendorStatus: "PENDING",
      riderStatus: "UNASSIGNED",
      timeline: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    addTimeline(order, "PLACED", "Order placed by customer.");
    addTimeline(order, "ASSIGNED_VENDOR", `Assigned to ${vendor.name}.`);
    if (dispatch.mode === "partner_network") {
      addTimeline(order, "PARTNER_ROUTED", `Routed via ${dispatch.partnerName}.`);
    }
    if (payment.mode === "live" && payment.externalOrderId) {
      addTimeline(order, "PAYMENT_INITIATED", `${payment.gateway} order ${payment.externalOrderId} created.`);
    }

    state.orders.unshift(order);
    await persistState();
    sendJson(res, 201, {
      ok: true,
      order: summarizeOrder(order),
      promise: {
        etaMins: dispatch.promisedEtaMins,
        dispatchMode: dispatch.mode,
        partnerName: dispatch.partnerName
      }
    });
    return;
  }

  if (method === "GET" && pathname === "/api/customer/orders") {
    const authUser = enforceRole(req, res, urlObject, ["customer", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const phone = normalizePhone((urlObject.searchParams.get("phone") || "").trim());
    let orders = state.orders;
    if (phone) {
      orders = orders.filter((order) => order.phone === phone);
    }
    sendJson(res, 200, { ok: true, orders: orders.map(summarizeOrder) });
    return;
  }

  const customerOrderMatch = pathname.match(/^\/api\/customer\/orders\/([^/]+)$/);
  if (method === "GET" && customerOrderMatch) {
    const authUser = enforceRole(req, res, urlObject, ["customer", "admin", "vendor", "rider"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const id = customerOrderMatch[1];
    const order = state.orders.find((entry) => entry.id === id);
    if (!order) {
      sendJson(res, 404, { ok: false, message: "Order not found." });
      return;
    }
    sendJson(res, 200, { ok: true, order });
    return;
  }

  const cancelMatch = pathname.match(/^\/api\/customer\/orders\/([^/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    const authUser = enforceRole(req, res, urlObject, ["customer", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const id = cancelMatch[1];
    const order = state.orders.find((entry) => entry.id === id);
    if (!order) {
      sendJson(res, 404, { ok: false, message: "Order not found." });
      return;
    }
    if (["OUT_FOR_DELIVERY", "DELIVERED"].includes(order.customerStatus)) {
      sendJson(res, 400, { ok: false, message: "Order cannot be cancelled at this stage." });
      return;
    }
    order.customerStatus = "CANCELLED";
    order.vendorStatus = "CANCELLED";
    order.riderStatus = "CANCELLED";
    order.updatedAt = new Date().toISOString();
    addTimeline(order, "CANCELLED", "Cancelled by customer.");
    await persistState();
    sendJson(res, 200, { ok: true, order: summarizeOrder(order) });
    return;
  }

  if (method === "POST" && pathname === "/api/customer/reorder") {
    const authUser = enforceRole(req, res, urlObject, ["customer", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const body = await parseBody(req);
    const existing = state.orders.find((order) => order.id === body.orderId);
    if (!existing) {
      sendJson(res, 404, { ok: false, message: "Original order not found." });
      return;
    }
    const reorderPayload = {
      customerName: existing.customerName,
      phone: existing.phone,
      pincode: existing.pincode,
      address: existing.address,
      paymentMethod: existing.payment.method,
      deliveryMode: "standard",
      items: existing.items.map((item) => ({ productId: item.productId, qty: item.qty })),
      plusMember: existing.plusMember,
      couponCode: ""
    };
    sendJson(res, 200, { ok: true, reorderPayload });
    return;
  }

  if (method === "GET" && pathname === "/api/vendor/orders") {
    const authUser = enforceRole(req, res, urlObject, ["vendor", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const vendorId = (urlObject.searchParams.get("vendorId") || "").trim();
    if (!vendorId) {
      sendJson(res, 400, { ok: false, message: "vendorId is required." });
      return;
    }
    const orders = state.orders.filter((order) => order.vendorId === vendorId && !["DELIVERED", "CANCELLED"].includes(order.customerStatus));
    sendJson(res, 200, { ok: true, orders });
    return;
  }

  const vendorStatusMatch = pathname.match(/^\/api\/vendor\/orders\/([^/]+)\/status$/);
  if (method === "POST" && vendorStatusMatch) {
    const authUser = enforceRole(req, res, urlObject, ["vendor", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const body = await parseBody(req);
    const status = body.status;
    const allowed = ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "REJECTED"];
    if (!allowed.includes(status)) {
      sendJson(res, 400, { ok: false, message: "Invalid vendor status." });
      return;
    }
    const order = state.orders.find((entry) => entry.id === vendorStatusMatch[1]);
    if (!order) {
      sendJson(res, 404, { ok: false, message: "Order not found." });
      return;
    }
    order.vendorStatus = status;
    if (status === "CONFIRMED") order.customerStatus = "CONFIRMED";
    if (status === "PREPARING") order.customerStatus = "PREPARING";
    if (status === "READY_FOR_PICKUP") order.customerStatus = "READY_FOR_PICKUP";
    if (status === "REJECTED") order.customerStatus = "CANCELLED";
    order.updatedAt = new Date().toISOString();
    addTimeline(order, status, `Vendor updated status to ${status}.`);
    await persistState();
    sendJson(res, 200, { ok: true, order });
    return;
  }

  if (method === "GET" && pathname === "/api/rider/orders") {
    const authUser = enforceRole(req, res, urlObject, ["rider", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const riderId = (urlObject.searchParams.get("riderId") || "").trim();
    const scope = (urlObject.searchParams.get("scope") || "available").trim();
    if (scope === "assigned" && riderId) {
      const assigned = state.orders.filter((order) => order.riderId === riderId && !["DELIVERED", "CANCELLED"].includes(order.customerStatus));
      sendJson(res, 200, { ok: true, orders: assigned });
      return;
    }
    const available = state.orders.filter((order) => order.dispatch.mode === "own_fleet" && order.customerStatus === "READY_FOR_PICKUP" && !order.riderId);
    sendJson(res, 200, { ok: true, orders: available });
    return;
  }

  const riderAcceptMatch = pathname.match(/^\/api\/rider\/orders\/([^/]+)\/accept$/);
  if (method === "POST" && riderAcceptMatch) {
    const authUser = enforceRole(req, res, urlObject, ["rider", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const body = await parseBody(req);
    const riderId = body.riderId;
    const rider = state.riders.find((entry) => entry.id === riderId);
    if (!rider) {
      sendJson(res, 404, { ok: false, message: "Rider not found." });
      return;
    }
    if (!rider.available) {
      sendJson(res, 400, { ok: false, message: "Rider already on an active order." });
      return;
    }
    const order = state.orders.find((entry) => entry.id === riderAcceptMatch[1]);
    if (!order) {
      sendJson(res, 404, { ok: false, message: "Order not found." });
      return;
    }
    if (order.dispatch.mode !== "own_fleet") {
      sendJson(res, 400, { ok: false, message: "Partner-routed orders are not rider-assignable here." });
      return;
    }
    if (order.customerStatus !== "READY_FOR_PICKUP") {
      sendJson(res, 400, { ok: false, message: "Order not ready for rider pickup." });
      return;
    }
    order.riderId = rider.id;
    order.riderStatus = "ASSIGNED";
    order.customerStatus = "OUT_FOR_DELIVERY";
    order.updatedAt = new Date().toISOString();
    rider.available = false;
    addTimeline(order, "RIDER_ASSIGNED", `Assigned to rider ${rider.name}.`);
    addTimeline(order, "OUT_FOR_DELIVERY", "Rider picked up parcel.");
    await persistState();
    sendJson(res, 200, { ok: true, order, rider });
    return;
  }

  const riderStatusMatch = pathname.match(/^\/api\/rider\/orders\/([^/]+)\/status$/);
  if (method === "POST" && riderStatusMatch) {
    const authUser = enforceRole(req, res, urlObject, ["rider", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const body = await parseBody(req);
    const status = body.status;
    const riderId = body.riderId;
    const order = state.orders.find((entry) => entry.id === riderStatusMatch[1]);
    if (!order) {
      sendJson(res, 404, { ok: false, message: "Order not found." });
      return;
    }
    if (order.riderId !== riderId) {
      sendJson(res, 403, { ok: false, message: "Order is not assigned to this rider." });
      return;
    }
    const allowed = ["OUT_FOR_DELIVERY", "DELIVERED"];
    if (!allowed.includes(status)) {
      sendJson(res, 400, { ok: false, message: "Invalid rider status." });
      return;
    }
    order.riderStatus = status;
    order.customerStatus = status;
    order.updatedAt = new Date().toISOString();
    addTimeline(order, status, `Rider updated status to ${status}.`);
    if (status === "DELIVERED") {
      const rider = state.riders.find((entry) => entry.id === riderId);
      if (rider) rider.available = true;
      order.vendorStatus = "COMPLETED";
      order.payment.status = order.payment.method === "cod" ? "collected" : "success";
    }
    await persistState();
    sendJson(res, 200, { ok: true, order });
    return;
  }

  if (method === "POST" && pathname === "/api/support/tickets") {
    const authUser = enforceRole(req, res, urlObject, ["customer", "vendor", "rider", "admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const body = await parseBody(req);
    const required = ["phone", "issue", "channel"];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      sendJson(res, 400, { ok: false, message: `Missing fields: ${missing.join(", ")}` });
      return;
    }
    const ticket = {
      id: "TKT-" + Math.floor(Date.now() / 1000) + "-" + Math.floor(Math.random() * 100),
      orderId: body.orderId || null,
      phone: normalizePhone(body.phone),
      issue: body.issue,
      channel: body.channel,
      priority: body.priority || "normal",
      status: "OPEN",
      createdAt: new Date().toISOString()
    };
    state.tickets.unshift(ticket);
    await persistState();
    sendJson(res, 201, { ok: true, ticket });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/metrics") {
    const authUser = enforceRole(req, res, urlObject, ["admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const totalOrders = state.orders.length;
    const delivered = state.orders.filter((order) => order.customerStatus === "DELIVERED").length;
    const active = state.orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.customerStatus)).length;
    const partnerRouted = state.orders.filter((order) => order.dispatch.mode === "partner_network").length;
    const ownFleet = state.orders.filter((order) => order.dispatch.mode === "own_fleet").length;
    const revenue = state.orders
      .filter((order) => order.customerStatus !== "CANCELLED")
      .reduce((sum, order) => sum + Number(order.totals.total || 0), 0);
    sendJson(res, 200, {
      ok: true,
      metrics: {
        totalOrders,
        delivered,
        active,
        partnerRouted,
        ownFleet,
        revenue: roundCurrency(revenue),
        openTickets: state.tickets.filter((ticket) => ticket.status === "OPEN").length
      }
    });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/orders") {
    const authUser = enforceRole(req, res, urlObject, ["admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const status = (urlObject.searchParams.get("status") || "").trim();
    const city = (urlObject.searchParams.get("city") || "").trim();
    const orders = state.orders.filter((order) => {
      const statusMatch = !status || order.customerStatus === status;
      const cityMatch = !city || order.cityId === city;
      return statusMatch && cityMatch;
    });
    sendJson(res, 200, { ok: true, orders });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/fleet-policy") {
    const authUser = enforceRole(req, res, urlObject, ["admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    sendJson(res, 200, { ok: true, settings: state.settings });
    return;
  }

  if (method === "POST" && pathname === "/api/admin/fleet-policy") {
    const authUser = enforceRole(req, res, urlObject, ["admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    const body = await parseBody(req);
    const nextMinOwn = Number(body.minimumOwnFleetShare);
    if (!Number.isNaN(nextMinOwn) && nextMinOwn > 0 && nextMinOwn < 1) {
      state.settings.minimumOwnFleetShare = nextMinOwn;
    }
    if (typeof body.expressOwnPriority === "boolean") {
      state.settings.expressOwnPriority = body.expressOwnPriority;
    }
    await persistState();
    sendJson(res, 200, { ok: true, settings: state.settings });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/tickets") {
    const authUser = enforceRole(req, res, urlObject, ["admin"]);
    if (config.ENFORCE_AUTH && !authUser) return;
    sendJson(res, 200, { ok: true, tickets: state.tickets.slice(0, 200) });
    return;
  }

  notFound(res);
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "application/javascript; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  return "text/plain; charset=utf-8";
}

function safeFilePath(requestPath) {
  const normalized = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const candidate = path.join(PUBLIC_DIR, normalized);
  const resolved = path.resolve(candidate);
  if (!resolved.startsWith(path.resolve(PUBLIC_DIR))) {
    return null;
  }
  return resolved;
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const urlObject = new URL(req.url, `http://${host}`);

    if (urlObject.pathname.startsWith("/api/")) {
      await handleApi(req, res, urlObject);
      return;
    }

    if ((req.method || "GET") !== "GET") {
      sendJson(res, 405, { ok: false, message: "Method not allowed for static route." });
      return;
    }

    const filePath = safeFilePath(urlObject.pathname);
    if (!filePath || !fs.existsSync(filePath)) {
      sendText(res, 404, "text/plain; charset=utf-8", "404 - Page not found");
      return;
    }
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(data);
  } catch (error) {
    sendJson(res, 500, { ok: false, message: "Internal server error", error: error.message });
  }
});

async function start() {
  try {
    store = await createStateStore(config, seedState);
    const loaded = await store.read();
    state = mergeState(loaded);
    cleanupOtpChallenges();
    await persistState();
    server.listen(PORT, () => {
      console.log(`SwiftSeva server running on http://localhost:${PORT}`);
      console.log(`Persistence mode: ${config.PERSISTENCE_MODE}`);
      console.log(`Auth enforced: ${config.ENFORCE_AUTH}`);
    });
  } catch (error) {
    console.error("Failed to start SwiftSeva server:", error.message);
    process.exit(1);
  }
}

start();
