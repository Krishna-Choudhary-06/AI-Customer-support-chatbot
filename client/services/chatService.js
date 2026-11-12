export class ChatApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "ChatApiError";
  }
}

const chatEndpoint = import.meta.env.VITE_CHAT_API_URL || "/api/chat";

export async function sendChatMessage(message) {
  const response = await fetch(chatEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ChatApiError(
        "Support service returned an unreadable response. Please try again later.",
      );
    }
    throw error;
  }

  if (!response.ok) {
    const apiMessage =
      typeof payload?.error === "string" && payload.error.trim()
        ? payload.error.trim()
        : `Support service returned an error (HTTP ${response.status}). Please try again.`;
    throw new ChatApiError(apiMessage);
  }

  if (typeof payload?.reply !== "string" || !payload.reply.trim()) {
    throw new ChatApiError(
      "Support service returned no answer. Please try again in a moment.",
    );
  }

  return {
    reply: payload.reply.trim(),
    sources: Array.isArray(payload.sources) ? payload.sources : [],
  };
}
