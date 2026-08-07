import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkoutSource = readFileSync(
  new URL("../api/create-checkout-session.js", import.meta.url),
  "utf8",
);
const billingSource = readFileSync(
  new URL("../api/_lib/stripe-billing.js", import.meta.url),
  "utf8",
);
const premiumSource = readFileSync(
  new URL("../api/_lib/routes/premium.js", import.meta.url),
  "utf8",
);
const pricingSource = readFileSync(
  new URL("../src/components/Pricing/PricingPage.jsx", import.meta.url),
  "utf8",
);

assert.doesNotMatch(checkoutSource, /trialPeriodDays/);
assert.match(billingSource, /payment_method_collection = 'always'/);
assert.match(billingSource, /subscription_data\[trial_period_days\]/);
assert.match(premiumSource, /CARDLESS_TRIAL_DAYS = 7/);
assert.match(premiumSource, /action === "start_trial"/);
assert.match(premiumSource, /from\("user_trials"\)/);
assert.match(premiumSource, /error\.code === "23505"/);
assert.match(premiumSource, /trialRequiresPaymentMethod: false/);
assert.match(pricingSource, /Start 7-day free trial/);
assert.match(pricingSource, /you will not be charged automatically/);
assert.match(pricingSource, /never converts automatically/);
assert.doesNotMatch(pricingSource, /subscription or trial/);

console.log("Cardless seven-day trial checks passed.");
