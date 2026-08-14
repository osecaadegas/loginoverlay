import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";

const FILTERS = ["all", "new", "read", "resolved", "archived"];

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Your admin session has expired.");
  return token;
}

export default function ContactMessagesAdmin() {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await accessToken();
      const query =
        filter === "all" ? "" : `?status=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/contact-messages${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Could not load contact messages.");
      setMessages(payload.messages || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    setError("");
    try {
      const token = await accessToken();
      const response = await fetch("/api/contact-messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Could not update the message.");
      if (filter !== "all" && filter !== status) {
        setMessages((current) => current.filter((item) => item.id !== id));
      } else {
        setMessages((current) =>
          current.map((item) =>
            item.id === id ? { ...item, ...payload.message } : item,
          ),
        );
      }
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const newCount = messages.filter((item) => item.status === "new").length;

  return (
    <section className="contact-inbox" aria-labelledby="contact-inbox-title">
      <header className="contact-inbox__header">
        <div>
          <span className="admin-kicker">Public enquiries</span>
          <h2 id="contact-inbox-title">Contact messages</h2>
          <p>Messages submitted through the website footer appear here.</p>
        </div>
        <div className="contact-inbox__summary">
          <Inbox aria-hidden="true" />
          <strong>{newCount}</strong>
          <span>new</span>
        </div>
      </header>

      <div className="contact-inbox__toolbar">
        <div
          className="contact-inbox__filters"
          aria-label="Filter contact messages"
        >
          {FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              className={filter === status ? "is-active" : ""}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="contact-inbox__refresh"
          onClick={loadMessages}
          disabled={loading}
        >
          <RefreshCw aria-hidden="true" /> Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="contact-inbox__empty">
          <Loader2 className="contact-inbox__spinner" /> Loading messages...
        </div>
      ) : messages.length === 0 ? (
        <div className="contact-inbox__empty">
          <Mail aria-hidden="true" /> No messages in this view.
        </div>
      ) : (
        <div className="contact-inbox__list">
          {messages.map((item) => (
            <article
              key={item.id}
              className={`contact-message contact-message--${item.status}`}
            >
              <div className="contact-message__meta">
                <div>
                  <span
                    className={`contact-message__status contact-message__status--${item.status}`}
                  >
                    {item.status}
                  </span>
                  <strong>{item.subject}</strong>
                </div>
                <time dateTime={item.created_at}>
                  {formatDate(item.created_at)}
                </time>
              </div>
              <div className="contact-message__sender">
                <strong>{item.name}</strong>
                <a href={`mailto:${item.email}`}>{item.email}</a>
              </div>
              <p className="contact-message__body">{item.message}</p>
              <div className="contact-message__actions">
                <a
                  className="contact-message__reply"
                  href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`}
                >
                  <Mail aria-hidden="true" /> Reply by email
                </a>
                {item.status === "new" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "read")}
                    disabled={updatingId === item.id}
                  >
                    Mark read
                  </button>
                )}
                {item.status !== "resolved" && item.status !== "archived" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "resolved")}
                    disabled={updatingId === item.id}
                  >
                    <CheckCircle2 aria-hidden="true" /> Resolve
                  </button>
                )}
                {item.status !== "archived" && (
                  <button
                    type="button"
                    onClick={() => updateStatus(item.id, "archived")}
                    disabled={updatingId === item.id}
                  >
                    <Archive aria-hidden="true" /> Archive
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
