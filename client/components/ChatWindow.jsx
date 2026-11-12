import React, { useEffect, useRef } from "react";
import Message from "./Message.jsx";

export default function ChatWindow({
  theme,
  onThemeToggle,
  messages,
  draft,
  isLoading,
  error,
  canRetry,
  onDraftChange,
  onSubmit,
  onRetry,
}) {
  const messageEndRef = useRef(null);
  const canSubmit = draft.trim().length > 0 && !isLoading;

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, error]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    }
  };

  return (
    <section className="chat-card" aria-label="Customer support chat">
      <header className="chat-header">
        <div className="support-avatar" aria-hidden="true">
          <span />
        </div>
        <div className="header-copy">
          <h1>Customer support</h1>
          <p>We’re here to help</p>
        </div>
        <span className="support-badge">Chat</span>
        <button
          className="theme-toggle"
          type="button"
          onClick={onThemeToggle}
          aria-pressed={theme === "dark"}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v2m0 14v2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M3 12h2m14 0h2M5.64 18.36l1.42-1.42m9.88-9.88 1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.2 15.7A8.5 8.5 0 0 1 8.3 3.8 8.5 8.5 0 1 0 20.2 15.7Z" />
            </svg>
          )}
        </button>
      </header>

      <div className="conversation" role="log" aria-live="polite" aria-relevant="additions">
        <div className="conversation-date">Today</div>
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="message-row assistant-row" role="status" aria-label="Support is responding">
            <div className="typing-indicator" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="loading-label">Support is responding…</span>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <div className="composer-area">
        {error && (
          <div className="error-banner" role="alert">
            <p>{error}</p>
            {canRetry && (
              <button className="retry-button" type="button" onClick={onRetry} disabled={isLoading}>
                Try again
              </button>
            )}
          </div>
        )}

        <form className="composer" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="chat-message">
            Your message
          </label>
          <textarea
            id="chat-message"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            maxLength={2000}
            disabled={isLoading}
          />
          <button
            className="send-button"
            type="submit"
            disabled={!canSubmit}
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.4 20.2 21 12 3.4 3.8 3 10.2l12.1 1.8L3 13.8l.4 6.4Z" />
            </svg>
          </button>
        </form>
        <p className="composer-hint">Enter to send · Shift + Enter for a new line</p>
      </div>
    </section>
  );
}