"use client";

import { ThumbsUp, ThumbsDown, BookPlus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface ChatMsg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  feedback?: "approved" | "flagged" | null;
}

interface ChatMessageProps {
  message: ChatMsg;
  onApprove?: (id: string) => void;
  onFlag?: (id: string) => void;
  onAddRule?: (id: string) => void;
}

export function ChatMessage({ message, onApprove, onFlag, onAddRule }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-4 py-3",
          isUser
            ? "bg-frankly-green-light text-frankly-dark"
            : "bg-surface border border-border text-frankly-dark"
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-frankly-dark prose-p:text-frankly-dark prose-strong:text-frankly-dark prose-td:text-sm prose-th:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Feedback buttons for assistant messages */}
        {!isUser && message.id && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border-subtle">
            {message.feedback === "approved" ? (
              <span className="text-xs text-frankly-green font-medium">Approved</span>
            ) : message.feedback === "flagged" ? (
              <span className="text-xs text-red-500 font-medium">Flagged</span>
            ) : (
              <>
                <FeedbackBtn
                  icon={<ThumbsUp className="h-3.5 w-3.5" />}
                  label="Approve"
                  onClick={() => onApprove?.(message.id!)}
                  className="text-frankly-green hover:bg-frankly-green-light"
                />
                <FeedbackBtn
                  icon={<ThumbsDown className="h-3.5 w-3.5" />}
                  label="Flag"
                  onClick={() => onFlag?.(message.id!)}
                  className="text-red-400 hover:bg-red-50"
                />
                <FeedbackBtn
                  icon={<BookPlus className="h-3.5 w-3.5" />}
                  label="Add Rule"
                  onClick={() => onAddRule?.(message.id!)}
                  className="text-frankly-gray hover:bg-frankly-gray-light"
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackBtn({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
