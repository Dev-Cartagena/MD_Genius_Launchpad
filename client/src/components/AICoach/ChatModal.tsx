import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Lightbulb, Code, TrendingUp, Target, Mic } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getApiErrorMessage } from "@/lib/utils";
import SimpleMarkdown from "./SimpleMarkdown";
import { BlockLoader, Logo } from "@/components/brand";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const chatModes = [
  { id: "process_guide", label: "Process guide", icon: Target, description: "Deadlines, steps, checklists" },
  { id: "ideation", label: "Ideation", icon: Lightbulb, description: "Problem framing, solution ideas" },
  { id: "technical", label: "Technical", icon: Code, description: "AI/ML fundamentals, implementation" },
  { id: "gtm", label: "Go-to-market", icon: TrendingUp, description: "Customer discovery, messaging" },
  { id: "pitch", label: "Pitch coach", icon: Mic, description: "Investor preparation, storytelling" },
];

// Server limits: user messages up to 4000 chars, at most 40 messages per request.
// Send only the most recent part of the conversation; the full list stays in the UI.
const MAX_USER_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 20;

// Keep the last MAX_HISTORY_MESSAGES, and make sure the history starts with a user turn.
function trimHistory(history: Message[]) {
  const recent = history.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return (firstUser === -1 ? [] : recent.slice(firstUser)).map(({ role, content }) => ({ role, content }));
}

const createWelcomeMessage = (): Message => ({
  role: "assistant",
  content: "Hello, I'm your AI Coach for MD Genius Launchpad. I can help you think through your venture at each step of the program. What would you like to focus on today?",
  timestamp: new Date(),
  sources: []
});

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>(() => [createWelcomeMessage()]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  // Bumped when the chat is reset so late responses from a closed chat are ignored
  const chatSessionRef = useRef(0);
  const [inputValue, setInputValue] = useState("");
  const [currentMode, setCurrentMode] = useState("process_guide");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async ({ messages: messageHistory, mode }: { messages: Message[], mode: string; session: number }) => {
      const response = await apiRequest("POST", "/api/ai-coach/chat", {
        // The first message is the local welcome greeting; only send the real exchange,
        // trimmed to the most recent messages.
        messages: trimHistory(messageHistory.slice(1)),
        mode,
        ...(conversationId ? { conversationId } : {}),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      if (variables.session !== chatSessionRef.current) return;
      setIsTyping(false);
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        sources: data.sources || []
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error, variables) => {
      if (variables.session !== chatSessionRef.current) return;
      setIsTyping(false);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "You have been signed out. Taking you to sign in.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "No response",
        description: getApiErrorMessage(error, "The AI Coach could not respond. Please try again."),
        variant: "destructive",
      });
    }
  });

  const handleSendMessage = () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.slice(0, MAX_USER_MESSAGE_LENGTH),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);

    chatMutation.mutate({
      messages: updatedMessages,
      mode: currentMode,
      session: chatSessionRef.current,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentModeInfo = chatModes.find(mode => mode.id === currentMode);

  const handleClose = () => {
    // Closing the coach ends the conversation; the next chat starts fresh
    chatSessionRef.current += 1;
    setMessages([createWelcomeMessage()]);
    setConversationId(undefined);
    setInputValue("");
    setIsTyping(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 w-full max-w-2xl h-[100dvh] max-sm:border-0 max-sm:rounded-none sm:h-[80vh]" hideClose>
        <DialogHeader className="shrink-0 bg-primary text-primary-foreground px-4 py-3 sm:px-6 sm:py-4 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Logo layout="symbol" tone="reversed" className="h-6 shrink-0" />
              <div className="min-w-0">
                <DialogTitle className="font-display text-lg font-medium text-primary-foreground">
                  AI Coach
                </DialogTitle>
                <p className="text-sm text-primary-foreground/70 truncate">
                  {currentModeInfo?.label} · {currentModeInfo?.description}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              aria-label="Close AI Coach"
              title="Close AI Coach"
              data-testid="button-close-chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Mode Selection */}
        <div className="shrink-0 px-4 sm:px-6 py-2 border-b border-border">
          <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 sm:pb-0">
            {chatModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Button
                  key={mode.id}
                  variant={currentMode === mode.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentMode(mode.id)}
                  className="flex shrink-0 items-center space-x-1"
                  data-testid={`button-mode-${mode.id}`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{mode.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`message-${message.role}-${index}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[80%] min-w-0 px-4 py-3 rounded-xl ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-accent/40 text-foreground"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <SimpleMarkdown content={message.content} className="text-sm leading-relaxed" />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-border pt-2">
                      <p className="font-display text-xs text-muted-foreground">Sources</p>
                      <div className="flex flex-wrap gap-1">
                        {message.sources.map((source, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start" data-testid="typing-indicator">
                <div className="bg-card border border-accent/40 px-4 py-3 rounded-xl">
                  <BlockLoader label="AI Coach is thinking" className="flex-row gap-3" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, MAX_USER_MESSAGE_LENGTH))}
              maxLength={MAX_USER_MESSAGE_LENGTH}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your startup or the program"
              aria-label="Message the AI Coach"
              className="flex-1 min-w-0"
              disabled={isTyping}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="px-4 shrink-0"
              aria-label="Send message"
              title="Send message"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send
            {inputValue.length > MAX_USER_MESSAGE_LENGTH - 500 && (
              <span className="ml-2">{inputValue.length}/{MAX_USER_MESSAGE_LENGTH} characters</span>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
