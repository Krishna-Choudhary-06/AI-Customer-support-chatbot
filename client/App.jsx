import React, { useEffect, useState } from "react";
import ChatWindow from "./components/ChatWindow.jsx";
import { ChatApiError, sendChatMessage } from "./services/chatService.js";
import "./styles/chat.css";

const createWelcomeMessage = () => ({
  id: crypto.randomUUID(),
  role: "assistant",
  content: "Hi! I’m here to help. What can I assist you with today?",
  createdAt: new Date().toISOString(),
});

const getInitialTheme = () => {
  try {
    const savedTheme = window.localStorage.getItem("support-chat-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch (error) {
    console.error("Could not read the saved chat theme preference:", error);
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [messages, setMessages] = useState(() => [createWelcomeMessage()]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [failedMessage, setFailedMessage] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("support-chat-theme", theme);
    } catch (error) {
      console.error("Could not save the chat theme preference:", error);
    }
  }, [theme]);

  const submitMessage = async (value, retryMessage = null) => {
    const content = value.trim();
    if (!content || isLoading) {
      return;
    }

    const customerMessage = retryMessage ?? {
      id: crypto.randomUUID(),
      role: "customer",
      content,
      createdAt: new Date().toISOString(),
    };

    if (!retryMessage) {
      setMessages((currentMessages) => [...currentMessages, customerMessage]);
      setDraft("");
    }

    setError("");
    setFailedMessage(null);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(content);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.reply,
          sources: response.sources,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (requestError) {
      if (requestError instanceof ChatApiError) {
        setError(requestError.message);
      } else if (requestError instanceof TypeError) {
        setError("We couldn’t connect to support. Check your connection and try again.");
      } else {
        console.error("Unexpected error while sending a chat message:", requestError);
        setError("Something went wrong while sending your message. Please try again.");
      }
      setFailedMessage(customerMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <ChatWindow
        theme={theme}
        onThemeToggle={() => setTheme((currentTheme) => currentTheme === "light" ? "dark" : "light")}
        messages={messages}
        draft={draft}
        isLoading={isLoading}
        error={error}
        canRetry={Boolean(failedMessage)}
        onDraftChange={setDraft}
        onSubmit={() => submitMessage(draft)}
        onRetry={() => {
          if (failedMessage) {
            submitMessage(failedMessage.content, failedMessage);
          }
        }}
      />
    </main>
  );
}