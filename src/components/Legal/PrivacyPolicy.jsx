import './LegalPage.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: July 29, 2026</p>

        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            Streamers Center ("we", "us", "our") provides streamer tools, player tools,
            overlays, browser-source widgets, community features, subscriptions, and the Streamers
            Center Browser desktop application. This Privacy Policy explains what information we
            collect, how we use it, where it is stored, and what controls users have.
          </p>
          <p>
            This policy applies to <strong>https://streamerscenter.com</strong>, related Streamers
            Center web features, and <strong>Streamers Center Browser</strong> for Windows.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect From Website Users</h2>
          <h3>2.1 Account and Authentication Data</h3>
          <p>When you log in or connect services, we may receive and store:</p>
          <ul>
            <li>Twitch display name, username, profile picture, email address, and user ID</li>
            <li>StreamElements connection and loyalty-system information needed for points/tools</li>
            <li>Account role, subscription status, permissions, and feature access records</li>
          </ul>

          <h3>2.2 Product and Usage Data</h3>
          <p>When you use Streamers Center features, we may store data needed to operate them:</p>
          <ul>
            <li>Overlay, widget, theme, and browser-source configuration</li>
            <li>Slot requests, bonus hunt records, casino session tracking, and player dashboard data</li>
            <li>Giveaway, tournament, chat command, analytics, and moderation records</li>
            <li>Admin actions, audit-related records, support details, and abuse-prevention signals</li>
          </ul>

          <h3>2.3 Automatically Collected Data</h3>
          <p>We may automatically collect:</p>
          <ul>
            <li>IP address, browser type, device information, page route, and timestamps</li>
            <li>Performance, reliability, analytics, and security event information</li>
            <li>Cookie and local-storage identifiers needed for sessions and preferences</li>
          </ul>

          <h3>2.4 Billing Data</h3>
          <p>
            Paid subscriptions are processed by third-party payment providers such as Mollie and,
            where legacy records exist, Stripe. We do not store full card numbers on our servers.
            We store provider identifiers, subscription status, plan metadata, and related account
            information needed to manage premium access and billing support.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. Streamers Center Browser Desktop App</h2>
          <h3>3.1 Local Data Stored On Your Windows Device</h3>
          <p>
            Streamers Center Browser stores application and browser data in the standard Electron
            user data directory for the current Windows profile. Local data may include:
          </p>
          <ul>
            <li>Settings, startup preferences, window preferences, layout presets, and workspaces</li>
            <li>Browser panel URLs, page titles, mute state, zoom state, and panel positions</li>
            <li>Recent sites, favourites, download history, and website permission decisions</li>
            <li>Application logs used for troubleshooting</li>
            <li>Optional saved website logins if the user enables login saving and confirms the save prompt</li>
          </ul>
          <p>
            Website cookies, cache, local storage, IndexedDB, and login sessions are stored by
            Chromium/Electron session partitions. Optional saved login passwords are encrypted
            locally for the current Windows user profile using Electron safeStorage.
          </p>

          <h3>3.2 Optional Slot Detector Data</h3>
          <p>
            The Streamers Center detector inside the desktop app is optional. When paired and
            enabled, it may send detector events to Streamers Center for slot/game matching.
            Detector events may include:
          </p>
          <ul>
            <li>Panel ID, device ID, detector token, client event ID, timestamp, and app version</li>
            <li>Current page URL, page title, text hints, slot/game hints, and up to eight frame URLs</li>
            <li>The selected detector target, such as current slot, single slot, or bonus hunt</li>
          </ul>
          <p>
            The desktop app displays a separate detector disclosure before pairing or enabling this
            feature. Users can disable the detector and remove the detector token in app settings.
          </p>

          <h3>3.3 Third-Party Websites Inside Browser Panels</h3>
          <p>
            Websites loaded inside Streamers Center Browser panels are third-party websites. Their
            own privacy policies and data practices apply. Streamers Center Browser cannot control
            the information those websites collect when you use them.
          </p>

          <h3>3.4 Microsoft Store Data</h3>
          <p>
            If Streamers Center Browser is installed through Microsoft Store, Microsoft may provide
            acquisition, installation, analytics, crash, and error-reporting information to us. We
            use this data to understand reliability, improve the app, diagnose crashes, and support
            Store distribution requirements.
          </p>
        </section>

        <section className="legal-section">
          <h2>4. How We Use Information</h2>
          <p>We use information to:</p>
          <ul>
            <li>Provide, operate, secure, and maintain Streamers Center</li>
            <li>Authenticate users and manage account access, roles, subscriptions, and permissions</li>
            <li>Operate overlays, widgets, dashboards, player tools, streamer tools, and desktop app features</li>
            <li>Process subscriptions, billing status, support requests, refunds, and service messages</li>
            <li>Detect, investigate, and prevent fraud, abuse, security issues, and policy violations</li>
            <li>Improve product quality, performance, reliability, and user experience</li>
            <li>Comply with legal, tax, accounting, security, and platform obligations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Legal Bases</h2>
          <p>
            Where GDPR or similar laws apply, we process personal data based on one or more legal
            bases, including performance of a contract, consent, legitimate interests, compliance
            with legal obligations, and protection of users, the service, or third parties.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Third-Party Services</h2>
          <p>We use third-party providers that may process data for the purposes above, including:</p>
          <ul>
            <li><strong>Twitch</strong> - authentication and connected streamer account data</li>
            <li><strong>Supabase</strong> - database, authentication records, and application storage</li>
            <li><strong>StreamElements</strong> - points, loyalty, and streamer integration features</li>
            <li><strong>Vercel</strong> - website hosting, serverless functions, and speed insights</li>
            <li><strong>Mollie</strong> - payment processing and subscription management</li>
            <li><strong>Stripe</strong> - legacy or applicable payment and subscription processing</li>
            <li><strong>Microsoft Store</strong> - app distribution, certification, analytics, and error reporting</li>
          </ul>
          <p>
            These providers process information under their own terms and privacy policies.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Cookies and Local Storage</h2>
          <p>
            We use essential cookies and local storage to maintain authentication sessions,
            security, preferences, and product functionality. We do not use third-party advertising
            cookies in the core Streamers Center app.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. User Controls</h2>
          <p>Streamers Center users can control data in several ways:</p>
          <ul>
            <li>Use website account and product settings where available</li>
            <li>Disconnect integrations where supported</li>
            <li>Clear browser cookies and site storage through the browser</li>
            <li>In Streamers Center Browser, clear cookies, cache, saved logins, permissions, downloads, local privacy data, or factory reset local app data</li>
            <li>Disable Streamers Center Browser camera, microphone, geolocation, notifications, saved logins, and detector features</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>9. Your Rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, export,
            restrict, or object to the processing of your personal data. EU/EEA users have rights
            under GDPR. Some users may also have rights under other privacy laws such as the CCPA or
            similar local laws.
          </p>
          <p>
            To exercise privacy rights, contact us using the details below. We may need to verify
            your identity before fulfilling a request.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Data Retention</h2>
          <p>
            We retain personal data for as long as needed to provide the service, maintain security,
            comply with legal obligations, resolve disputes, enforce agreements, and support
            legitimate business purposes. Local desktop app data remains on the user's Windows
            profile until the user clears it, factory resets app data, uninstalls with data removal
            where available, or removes the app data directory.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Security</h2>
          <p>
            We use technical and organizational measures designed to protect personal data. The
            desktop app loads remote websites in sandboxed Chromium web contents with Node.js
            disabled for remote sites, context isolation enabled, IPC allowlisting, and unsafe user
            navigation protocols blocked. No system can be guaranteed completely secure.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Children's Privacy</h2>
          <p>
            Streamers Center is not intended for anyone under 18. We do not knowingly collect
            personal information from anyone under 18 years of age.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of changes by
            updating the "Last updated" date at the top of this page.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or wish to exercise privacy rights,
            contact us:
          </p>
          <ul>
            <li>Website: <strong>https://streamerscenter.com</strong></li>
            <li>Email: <strong>privacy@streamerscenter.com</strong></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
