# Interactive landing page

The existing `/` route now has a blue-lit visual design with ambient curved layers, floating accents, gentle pointer tilt, hover transitions, and section reveals.

The refinement adds two prominent blue/cyan and blue/violet gradient shapes, luminous curved section edges and brighter preview framing. The main guest actions now say **Start free trial**. The hero shows the API-provided trial duration and card requirement; a dedicated trial banner appears above pricing, with a matching FAQ answer. The public API was verified to offer seven days without a payment method on October 3, 2026.

The homepage and `/premium` now share the existing illustrated pricing-card renderer, currency/period formatting and plan presentation. The homepage has a Streamer/Player switch with live configured prices, savings and features. Streamer-specific features appear first in both places. Homepage cards link to plan review; the existing authenticated trial and paid checkout handlers are preserved.

The hero uses the existing Giveaway, Chat, Bets, and Connect 4 renderers. Visitors can switch widgets and try Neon, Gold, Rose, and Arctic palettes from the existing colour registry. Preview changes are local and never alter a saved overlay. Existing showcase example data is explicitly labelled. No new endorsements, testimonials, platform integrations, prices, audience counts, or product capabilities were invented.

The Streamer and Player entry points, authentication links, widget carousel, API-backed plans and reviews, age/cookie gates, FAQs, contact form, and legal links are preserved. A malformed successful response from the reviews endpoint now displays the existing retry state instead of crashing the homepage.

Motion can be paused. The page follows `prefers-reduced-motion`, avoids pointer tilt on touch devices, loads widget previews near the viewport, and pauses showcase updates and CSS animation offscreen. Pointer updates are scheduled with animation frames without triggering React renders.

## Files

Created:
- `src/components/LandingPage/useLandingMotion.js`
- `src/components/LandingPage/useLandingSubscriptions.js`
- `src/components/Pricing/PricingCardContent.jsx`
- `scripts/preview-landing-live.mjs`
- `scripts/test-landing-experience-browser.mjs`
- `DOCs/LANDING_EXPERIENCE.md`

Modified:
- `src/components/LandingPage/LandingPage.jsx`
- `src/components/LandingPage/LandingModern.css`
- `src/components/LandingPage/LandingPlans.jsx`
- `src/components/Pricing/PricingPage.jsx`
- `src/components/LandingPage/reviewApi.js`
- `scripts/test-subscriber-reviews-browser.mjs`

No new dependencies, database migrations, environment variables, permission changes, or production publication.

## Verification

- `npm.cmd run build`
- `npm.cmd run test:stripe-trials`
- `npm.cmd run test:landing-widget-carousel`
- `npm.cmd run test:global-navigation`
- `npm.cmd run test:subscriber-reviews` — 18 cases
- `npm.cmd run test:contact-messages`
- `TEST_BASE_URL=http://127.0.0.1:3010 node scripts/test-subscriber-reviews-browser.mjs` — includes malformed-response recovery
- `node scripts/test-landing-experience-browser.mjs` — actual local homepage; visible widget content, palette changes, pointer tilt, pause/resume, reduced motion, age/cookie interaction, scroll reveals, carousel, FAQs, contact UI, entry-point routes, and widths from 320 to 1440px
- `git diff --check`

Latest refinement: the browser suite also passed with `TEST_BASE_URL=http://127.0.0.1:3011` and `TEST_LIVE_PUBLIC_CONTENT=1`. It checked actual public prices, both product switches, the trial banner and links, card-content fit at 320/390/768/1024/1440px, and guest trial/paid-plan redirection to sign-in. No trial, checkout or review was submitted.

Desktop and mobile screenshots were reviewed. Browser checks found no page errors. The build retains existing missing-font and large-bundle warnings from the current working tree. Earlier background-editor work and unrelated asset deletions were preserved.

## Local live-content preview

Run `node scripts/preview-landing-live.mjs` and open `http://127.0.0.1:3011/`. This runs the existing Vite app and forwards only anonymous GETs for public pricing, public reviews and slot count to the production website. Cookies, authorization headers and request bodies are never forwarded. Trial creation, checkout, private APIs and submissions are not proxied. This is a preview helper, not a production routing change. It requires network access; the UI retains its loading/error/retry states if the public API is unavailable.

Plain Vite on port 3010 still lacks serverless routes. Use the 3011 preview to see the actual public data. Deployment and authenticated billing transactions have not been performed. No migration or additional production configuration is needed.
