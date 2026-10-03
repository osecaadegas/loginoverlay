# Interactive landing page

## Landing-page polish — October 3, 2026

This refinement preserves the navy/cyan design, emotional hero headline, ambient shapes and real interactive Studio. It adds a single branded homepage header, a sticky mobile trial action and animated dropdown navigation, clearer iGaming/OBS copy, factual product proof, a primary Streamer presentation with a smaller Player alternative, three actual-widget use cases, and three setup steps.

The carousel now starts with Bonus Hunt, RTP Stats and Bets, followed by Giveaway, Tournament, Chat, Connect 4, Shoutout, Navbar, Slideshow and Background. All eleven existing entries remain. Slot Requests is described in the Streamer feature list; it is integrated into Bonus Hunt rather than registered as a separate renderer in this carousel. No standalone widget or usage statistic was invented.

Monthly equivalents and savings are calculated from the public pricing response. The annual landing card shows its monthly equivalent, full annual bill and Best value badge. The paid subscription page retains its existing presentation and checkout handlers. Trial terms come from the existing public API. The factual strip uses the real public slot count and the available showcase entries; unavailable counts are omitted.

An empty successful review response renders a compact community section with an expandable subscriber form. Published reviews automatically restore the full feed with verified product membership and visible reward disclosure. Loading, network failure, malformed response, retry, eligibility and reward behavior remain intact.

Widget rendering is now behind a lazy import. Below-the-fold previews activate near the viewport and retain the existing pause/reduced-motion handling and bounded preview geometry. This still uses the real widget registry; it is not a replacement screenshot or a separate overlay engine. Existing large widget bundles remain a performance limitation.

Created in this refinement:
- src/components/LandingPage/LandingHeader.jsx
- src/components/LandingPage/LandingWidgetRuntime.jsx
- src/components/LandingPage/pricingPresentation.js

Modified in this refinement:
- src/App.jsx
- src/components/LandingPage/LandingPage.jsx
- src/components/LandingPage/LandingModern.css
- src/components/LandingPage/LandingPlans.jsx
- src/components/LandingPage/SubscriberReviews.jsx
- src/components/LandingPage/SubscriberReviews.css
- src/components/Pricing/PricingCardContent.jsx
- scripts/test-global-navigation.mjs
- scripts/test-contact-messages.mjs
- scripts/test-subscriber-reviews-browser.mjs
- scripts/test-landing-experience-browser.mjs
- DOCs/LANDING_EXPERIENCE.md

Validation uses the live public-content preview on port 3011. Browser coverage includes 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024, 430×932, 390×844, 360×800 and an additional 320×800 check; desktop/mobile navigation, Escape/outside dismissal, 44px menu/trial targets, overflow, Studio bounds, all nine Studio widgets, three Bonus Hunt formats, themes, motion, actual pricing, Player/Streamer entry routes and guest sign-in redirects. The isolated review browser suite exercises empty/nonempty states and submissions with test-only responses; it never submits production reviews.

Checks: production build; global navigation; widget carousel; Stripe trials; all 18 subscriber-review API checks; review browser suite; landing browser suite; contact-message flow; whitespace diff check. Existing missing custom-font warnings come from unrelated local asset deletions, which were preserved. No migrations, dependencies, environment changes or manual configuration are needed. Authenticated live checkout was not performed. These checks were completed locally before publication; Git history records the subsequent publishing commit.


The existing `/` route now has a blue-lit visual design with ambient curved layers, floating accents, gentle pointer tilt, hover transitions, and section reveals.

The refinement adds two prominent blue/cyan and blue/violet gradient shapes, luminous curved section edges and brighter preview framing. The main guest actions now say **Start free trial**. The hero shows the API-provided trial duration and card requirement; a dedicated trial banner appears above pricing, with a matching FAQ answer. The public API was verified to offer seven days without a payment method on October 3, 2026.

The homepage and `/premium` now share the existing illustrated pricing-card renderer, currency/period formatting and plan presentation. The homepage has a Streamer/Player switch with live configured prices, savings and features. Streamer-specific features appear first in both places. Homepage cards link to plan review; the existing authenticated trial and paid checkout handlers are preserved.

The hero uses the existing Giveaway, Chat, Bets, Connect 4, Bonus Hunt, RTP Bar, Navbar, Tournament and Slideshow renderers. Bonus Hunt has selectable Vertical, Horizontal and Mainstream formats; the chosen format stays selected as the example session updates. The nine widget choices wrap into a responsive grid. Visitors can switch widgets and try Neon, Gold, Rose, and Arctic palettes from the existing colour registry. Slideshow uses actual images from the existing background library and pauses autoplay with the motion controls or when offscreen. Preview changes are local and never alter a saved overlay. Existing showcase example data is explicitly labelled. No new endorsements, testimonials, platform integrations, prices, audience counts, or product capabilities were invented.

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
