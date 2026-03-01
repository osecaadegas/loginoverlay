import './LegalPage.css';

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: March 1, 2026</p>

        <section className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using <strong>https://www.osecaadegas.pt</strong> (the "Service"),
            you accept and agree to be bound by these Terms of Service. If you do not agree to
            these terms, please do not use the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Description of Service</h2>
          <p>
            osecaadegas.pt is a streaming community platform that provides entertainment features
            including, but not limited to:
          </p>
          <ul>
            <li>Community games and interactive features</li>
            <li>Giveaways and tournaments</li>
            <li>Points and loyalty system (via StreamElements)</li>
            <li>Stream overlay tools (Overlay Control Center — premium feature)</li>
            <li>Partner offers and promotions</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Account Registration</h2>
          <p>
            To access certain features of the Service, you must log in using your Twitch account.
            By doing so, you:
          </p>
          <ul>
            <li>Confirm you are at least 18 years of age</li>
            <li>Agree to provide accurate and complete information</li>
            <li>Are responsible for maintaining the security of your Twitch account</li>
            <li>Accept responsibility for all activities that occur through your account</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Premium Subscriptions</h2>
          <h3>4.1 Subscription Plans</h3>
          <p>
            We offer premium subscriptions that grant access to the Overlay Control Center and
            other premium features. Available plans include monthly, quarterly, semi-annual, and
            annual options.
          </p>

          <h3>4.2 Billing</h3>
          <p>
            Premium subscriptions are billed on a recurring basis according to the plan selected.
            Payments are processed securely through <strong>Stripe</strong>. By subscribing, you
            authorize us to charge your payment method on a recurring basis until you cancel.
          </p>

          <h3>4.3 Cancellation</h3>
          <p>
            You may cancel your subscription at any time. Upon cancellation:
          </p>
          <ul>
            <li>You will retain access until the end of your current billing period</li>
            <li>No further charges will be made</li>
            <li>No partial refunds are provided for the remaining period</li>
          </ul>

          <h3>4.4 Refunds</h3>
          <p>
            Refund requests may be considered on a case-by-case basis within 14 days of purchase,
            in accordance with EU consumer protection laws. To request a refund, please contact us.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. User Conduct</h2>
          <p>When using the Service, you agree not to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Impersonate any person or entity</li>
            <li>Harass, abuse, or threaten other users</li>
            <li>Attempt to gain unauthorized access to the Service or its systems</li>
            <li>Use bots, scripts, or automated tools to interact with the Service</li>
            <li>Exploit bugs or vulnerabilities instead of reporting them</li>
            <li>Share your premium access or account credentials with others</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service — including but not limited to
            text, graphics, logos, icons, software, and design — are owned by osecaadegas.pt and
            are protected by copyright and other intellectual property laws.
          </p>
          <p>
            You may not reproduce, distribute, modify, or create derivative works from any part
            of the Service without our prior written consent.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Games and Virtual Currency</h2>
          <p>
            Points and virtual currencies within the Service (including StreamElements points)
            have no real monetary value and cannot be exchanged for real currency. They are for
            entertainment purposes only within the platform.
          </p>
          <p>
            Games available on the platform are for entertainment purposes only. No real money
            gambling is offered through the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Giveaways and Tournaments</h2>
          <p>
            Giveaways and tournaments are subject to their own specific rules as stated at the
            time of the event. We reserve the right to modify, suspend, or cancel any giveaway
            or tournament at our discretion.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided on an "as is" and "as available" basis without warranties of
            any kind, either express or implied. We do not guarantee that the Service will be
            uninterrupted, secure, or error-free.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, osecaadegas.pt shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages resulting from your
            use of or inability to use the Service.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your access to the Service at any time,
            with or without cause, including for violation of these Terms. Upon termination, your
            right to use the Service will immediately cease.
          </p>
        </section>

        <section className="legal-section">
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of Portugal
            and the European Union. Any disputes arising from these Terms shall be subject to the
            exclusive jurisdiction of the courts of Portugal.
          </p>
        </section>

        <section className="legal-section">
          <h2>13. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of
            significant changes by updating the "Last updated" date. Continued use of the Service
            after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="legal-section">
          <h2>14. Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us:
          </p>
          <ul>
            <li>Website: <strong>https://www.osecaadegas.pt</strong></li>
            <li>Discord: <strong>https://discord.gg/ASvCcpp5b8</strong></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
