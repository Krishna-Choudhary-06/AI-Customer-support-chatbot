import React from "react";

export default function Message({ message }) {
  const isCustomer = message.role === "customer";
  const timestamp = new Date(message.createdAt);

  return (
    <article className={`message-row ${isCustomer ? "customer-row" : "assistant-row"}`}>
      {!isCustomer && (
        <div className="message-avatar" aria-hidden="true">
          S
        </div>
      )}
      <div className="message-content">
        <div className={`message-bubble ${isCustomer ? "customer-bubble" : "assistant-bubble"}`}>
          {message.content}
        </div>
        {!isCustomer && message.sources?.length > 0 && (
          <div className="message-sources" aria-label="Answer sources">
            {message.sources.map((source) => (
              <div className="message-source" key={source.chunkId ?? source.source}>
                <span className="source-label">
                  {source.retrieval?.method === "cosine-similarity" ? "Semantic match" : "Knowledge source"}
                </span>
                <span>{source.title}</span>
                {source.retrieval?.method === "cosine-similarity" && (
                  <span className="source-score">
                    Similarity {(source.retrieval.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <time className="message-time" dateTime={timestamp.toISOString()}>
          {timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </time>
      </div>
    </article>
  );
}