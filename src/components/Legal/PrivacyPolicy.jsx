import './LegalPage.css';

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: March 1, 2026</p>

        <section className="legal-section">
          <h2>1. Introduction</h2>
          <p>
            Welcome to osecaadegas.pt ("we", "us", "our"). We are committed to protecting your
            personal information and your right to privacy. This Privacy Policy explains what
            information we collect, how we use it, and what rights you have in relation to it.
          </p>
          <p>
            By using our website at <strong>https://www.osecaadegas.pt</strong> (the "Service"),
            you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information from Twitch Authentication</h3>
          <p>When you log in using your Twitch account, we receive:</p>
          <ul>
            <li>Your Twitch display name and username</li>
            <li>Your Twitch profile picture</li>
            <li>Your Twitch account email address</li>
            <li>Your unique Twitch user ID</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <p>When you use our Service, we may automatically collect:</p>
          <ul>
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Pages visited and time spent on pages</li>
            <li>Device information</li>
          </ul>

          <h3>2.3 Payment Information</h3>
          <p>
            When you purchase a premium subscription, payment processing is handled entirely by
            <strong> Stripe</strong>. We do not store your credit card number, CVV, or full payment
            details on our servers. We only receive confirmation of payment status and your
            subscription details.
          </p>
        </section>

        <section className="legal-section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain our Service</li>
            <li>Manage your account and provide access to features</li>
            <li>Process payments and manage subscriptions</li>
            <li>Track points and community participation (via StreamElements)</li>
            <li>Communicate with you about your account or the Service</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Data Storage</h2>
          <p>
            Your data is stored securely using <strong>Supabase</strong> (hosted on AWS
            infrastructure within the EU). We implement appropriate technical and organizational
            measures to protect your personal data against unauthorized access, alteration,
            disclosure, or destruction.
          </p>
        </section>

        <section className="legal-section">
          <h2>5. Third-Party Services</h2>
          <p>We use the following third-party services that may process your data:</p>
          <ul>
            <li><strong>Twitch (Amazon)</strong> — Authentication</li>
            <li><strong>Supabase</strong> — Database and authentication</li>
            <li><strong>Stripe</strong> — Payment processing</li>
            <li><strong>StreamElements</strong> — Points and loyalty system</li>
            <li><strong>Vercel</strong> — Website hosting and analytics</li>
          </ul>
          <p>
            Each of these services has their own privacy policy governing how they handle your data.
          </p>
        </section>

        <section className="legal-section">
          <h2>6. Cookies</h2>
          <p>
            We use essential cookies and local storage to maintain your authentication session and
            preferences (such as language selection). We do not use third-party tracking cookies for
            advertising purposes.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Your Rights (GDPR)</h2>
          <p>
            As we operate from Portugal and serve users in the European Union, you have rights under
            the General Data Protection Regulation (GDPR), including:
          </p>
          <ul>
            <li><strong>Right of Access</strong> — Request a copy of your personal data</li>
            <li><strong>Right to Rectification</strong> — Request correction of inaccurate data</li>
            <li><strong>Right to Erasure</strong> — Request deletion of your personal data</li>
            <li><strong>Right to Restrict Processing</strong> — Request limitation of data processing</li>
            <li><strong>Right to Data Portability</strong> — Receive your data in a structured format</li>
            <li><strong>Right to Object</strong> — Object to processing of your personal data</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us using the details below.
          </p>
        </section>

        <section className="legal-section">
          <h2>8. Data Retention</h2>
          <p>
            We retain your personal data for as long as your account is active or as needed to
            provide you with the Service. If you wish to delete your account, contact us and we will
            remove your personal data within 30 days.
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Children's Privacy</h2>
          <p>
            Our Service is not intended for anyone under the age of 18. We do not knowingly collect
            personal information from anyone under 18 years of age.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by updating the "Last updated" date at the top of this page.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or wish to exercise your data rights,
            please contact us:
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
