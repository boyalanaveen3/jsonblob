import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
      content: string;
      selectedText?: string;
      language?: string;
      error?: string;
    }
  ) => Promise<void>;
}

export const useAiStore = create<AiState>((set, get) => ({
  isOpen: false,
  messages: [],
  isLoading: false,

  setIsOpen: (isOpen) => set({ isOpen }),

  clearHistory: () => set({ messages: [], isLoading: false }),

  sendMessage: async (prompt, context) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          module: context.module,
          content: context.content,
          selectedText: context.selectedText,
          language: context.language,
          error: context.error,
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

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${error.message || "Something went wrong while connecting to the AI Assistant."}`,
        timestamp: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },
}));
