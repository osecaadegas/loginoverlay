import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";

const SUPPORT_EMAIL = "streamerscentertracker@gmail.com";
const DISCORD_INVITE_URL = "https://discord.gg/bkxAyTn73Y";

const INITIAL_FORM = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

export default function ContactFooter() {
  const [contactOpen, setContactOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitContact = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/contact-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Could not send your message.");
      setForm(INITIAL_FORM);
      setFeedback({ type: "success", text: payload.message });
    } catch (error) {
      setFeedback({ type: "error", text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="lp-footer">
      <div className="lp-footer__about">
        <span>Streamers Center</span>
        <p>
          Streaming and tracking software only. We do not operate gambling
          services, accept deposits or process wagers.
        </p>
        <nav aria-label="Footer">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <button
            type="button"
            className="lp-footer__contact-toggle"
            aria-expanded={contactOpen}
            aria-controls="footer-contact-form"
            onClick={() => setContactOpen((current) => !current)}
          >
            Contact
          </button>
        </nav>
      </div>

      <aside className="lp-footer__support" aria-label="Streamers Center support">
        <div className="lp-footer__support-copy">
          <strong>Need help or want to join the community?</strong>
          <span>Discord is the fastest way to contact Streamers Center.</span>
        </div>
        <div className="lp-footer__support-links">
          <a
            className="lp-footer__discord"
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <MessageCircle aria-hidden="true" />
            Join our Discord
            <ExternalLink aria-hidden="true" />
          </a>
          <a className="lp-footer__email" href={`mailto:${SUPPORT_EMAIL}`}>
            <Mail aria-hidden="true" />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </aside>

      {contactOpen && (
        <form
          id="footer-contact-form"
          className="lp-footer-contact"
          onSubmit={submitContact}
        >
          <div className="lp-footer-contact__heading">
            <Mail aria-hidden="true" />
            <div>
              <strong>Contact us</strong>
              <p>
                Use Discord for the fastest help, or send a message directly to
                the Streamers Center admin team.
              </p>
            </div>
          </div>
          <div className="lp-footer-contact__fields">
            <label>
              <span>Name</span>
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                minLength={2}
                maxLength={100}
                required
                autoComplete="name"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                maxLength={254}
                required
                autoComplete="email"
              />
            </label>
            <label className="lp-footer-contact__subject">
              <span>Subject</span>
              <input
                name="subject"
                value={form.subject}
                onChange={updateField}
                minLength={3}
                maxLength={160}
                required
              />
            </label>
            <label className="lp-footer-contact__message">
              <span>Message</span>
              <textarea
                name="message"
                value={form.message}
                onChange={updateField}
                minLength={10}
                maxLength={5000}
                rows={4}
                required
              />
            </label>
            <label className="lp-footer-contact__website" aria-hidden="true">
              <span>Website</span>
              <input
                name="website"
                value={form.website}
                onChange={updateField}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="lp-footer-contact__actions">
            {feedback && (
              <output
                className={`lp-footer-contact__feedback lp-footer-contact__feedback--${feedback.type}`}
              >
                {feedback.type === "success" && (
                  <CheckCircle2 aria-hidden="true" />
                )}
                {feedback.text}
              </output>
            )}
            <button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2
                  className="lp-footer-contact__spinner"
                  aria-hidden="true"
                />
              ) : (
                <Send aria-hidden="true" />
              )}
              {submitting ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>
      )}
    </footer>
  );
}
