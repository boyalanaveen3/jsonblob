import { create } from "zustand";

const SESSION_STORAGE_KEY = "jsonblob.ai.chat.session";

function readStoredMessages(): Message[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: string }>;
    return parsed.map((message) => ({ ...message, timestamp: new Date(message.timestamp) }));
  } catch {
    return [];
  }
}

function writeStoredMessages(messages: Message[]) {
  if (typeof window === "undefined") return;

  try {
    const serializable = messages.map((message) => ({
      ...message,
      timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp,
    }));
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage failures and keep the in-memory experience intact.
  }
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface AIContext {
  editorCode: string;
  selectedCode?: string;
  language: string;
  activeFile: string;
  compilerErrors?: string;
  runtimeErrors?: string;
  consoleOutput?: string;
}

interface AiState {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  setIsOpen: (isOpen: boolean) => void;
  clearHistory: () => void;
  sendMessage: (
    prompt: string,
    context: {
      module: "json" | "playground";
      aiContext: AIContext;
    }
  ) => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  isOpen: false,
  messages: readStoredMessages(),
  isLoading: false,

  setIsOpen: (isOpen) => set({ isOpen }),

  clearHistory: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    set({ messages: [], isLoading: false });
  },

  sendMessage: async (prompt, context) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    const currentHistory = get().messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    set((state) => {
      const nextMessages = [...state.messages, userMessage];
      writeStoredMessages(nextMessages);
      return {
        messages: nextMessages,
        isLoading: true,
      };
    });

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          module: context.module,
          aiContext: context.aiContext,
          // Fallback legacy properties for backward compatibility
          content: context.aiContext.editorCode,
          selectedText: context.aiContext.selectedCode,
          language: context.aiContext.language,
          error: context.aiContext.compilerErrors || context.aiContext.runtimeErrors,
          history: currentHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed with status: ${response.status}`);
      }

      const data = (await response.json()) as any;
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant",
        content: data.response || "No response received.",
        timestamp: new Date(),
      };

      set((state) => {
        const nextMessages = [...state.messages, assistantMessage];
        writeStoredMessages(nextMessages);
        return {
          messages: nextMessages,
          isLoading: false,
        };
      });
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${error.message || "Something went wrong while connecting to the AI Assistant."}`,
        timestamp: new Date(),
      };

      set((state) => {
        const nextMessages = [...state.messages, errorMessage];
        writeStoredMessages(nextMessages);
        return {
          messages: nextMessages,
          isLoading: false,
        };
      });
    }
  },
}));
