"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageSquarePlus, Download, BookOpen, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatMessage, type ChatMsg } from "@/components/train/chat-message";
import { ChatInput } from "@/components/train/chat-input";
import { TypingIndicator } from "@/components/train/typing-indicator";
import { FeedbackModal } from "@/components/train/feedback-modal";
import { RuleModal } from "@/components/train/rule-modal";
import { SidebarPanel } from "@/components/train/sidebar-panel";

interface DomainRule {
  id: string;
  rule_name: string;
  rule_text: string;
  importance: string;
  applies_to: string;
}

interface ApprovedOutput {
  id: string;
  user_query: string;
  query_type: string;
  created_at: string;
}

interface Correction {
  id: string;
  field_name: string;
  original_value: string | null;
  corrected_value: string | null;
  created_at: string;
}

export default function TrainPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<DomainRule[]>([]);
  const [approvedOutputs, setApprovedOutputs] = useState<ApprovedOutput[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [feedbackTarget, setFeedbackTarget] = useState<string | null>(null);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load sidebar data
  const loadSidebarData = useCallback(async () => {
    const [rulesRes, outputsRes, correctionsRes] = await Promise.all([
      fetch("/api/rules").then((r) => r.json()).catch(() => ({ rules: [] })),
      fetch("/api/approved-outputs").then((r) => r.json()).catch(() => ({ outputs: [] })),
      fetch("/api/review?status=all").then((r) => r.json()).catch(() => ({ benefits: [] })),
    ]);
    setRules(rulesRes.rules ?? []);
    setApprovedOutputs(outputsRes.outputs ?? []);
    // Use corrections from the review endpoint stats or a dedicated one
    // For now, gather from the response
    setCorrections(correctionsRes.corrections ?? []);
  }, []);

  useEffect(() => {
    loadSidebarData();
  }, [loadSidebarData]);

  async function handleSend(message: string) {
    const userMsg: ChatMsg = { role: "user", content: message };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to get response");
      }

      const data = await res.json();
      if (!sessionId) setSessionId(data.sessionId);

      const assistantMsg: ChatMsg = {
        id: data.messageId,
        role: "assistant",
        content: data.content,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setSessionId(null);
  }

  function handleExportChat() {
    if (messages.length === 0) {
      toast.error("No messages to export");
      return;
    }
    const md = messages
      .map((m) => `**${m.role === "user" ? "You" : "Lydia"}:**\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lydia-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat exported");
  }

  async function handleApproveMessage(messageId: string) {
    try {
      const res = await fetch("/api/feedback/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, queryType: "general" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: "approved" as const } : m))
      );
      toast.success("Response saved as approved output");
      loadSidebarData();
    } catch {
      toast.error("Failed to approve response");
    }
  }

  async function handleFlagSubmit(data: { fieldName: string; issue: string; correction: string }) {
    if (!feedbackTarget) return;
    try {
      const res = await fetch("/api/feedback/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: feedbackTarget, ...data }),
      });
      if (!res.ok) throw new Error("Failed to flag");
      setMessages((prev) =>
        prev.map((m) => (m.id === feedbackTarget ? { ...m, feedback: "flagged" as const } : m))
      );
      setFeedbackTarget(null);
      toast.success("Issue flagged — correction saved");
      loadSidebarData();
    } catch {
      toast.error("Failed to flag issue");
    }
  }

  async function handleAddRule(data: {
    ruleName: string;
    ruleText: string;
    importance: string;
    appliesTo: string;
  }) {
    try {
      const res = await fetch("/api/feedback/add-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add rule");
      setRuleModalOpen(false);
      toast.success("Domain rule added");
      loadSidebarData();
    } catch {
      toast.error("Failed to add rule");
    }
  }

  const importanceBadge = (imp: string) => {
    switch (imp) {
      case "critical": return <Badge variant="rejected">{imp}</Badge>;
      case "high": return <Badge variant="pending">{imp}</Badge>;
      default: return <Badge variant="uploaded">{imp}</Badge>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h1 className="text-lg font-semibold text-frankly-dark">Train Lydia</h1>
            <p className="text-xs text-frankly-gray">
              Test queries and provide feedback to improve responses
            </p>
          </div>
          <Button variant="outline" onClick={handleNewChat} className="gap-1.5 text-xs">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New Chat
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="h-12 w-12 rounded-full bg-frankly-green-light flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-frankly-dark">Start a conversation</h3>
              <p className="mt-1 text-sm text-frankly-gray max-w-sm">
                Ask Lydia to compare insurance products, explain benefits, or answer advisor questions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                  "Compare terminal illness benefits across Discovery and BrightRock",
                  "What are the key exclusions for income protection?",
                  "Explain the difference between accelerated and standalone dread disease cover",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="text-xs text-frankly-gray border border-gray-200 rounded-full px-3 py-1.5 hover:bg-frankly-gray-light hover:text-frankly-dark transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage
              key={i}
              message={msg}
              onApprove={handleApproveMessage}
              onFlag={(id) => setFeedbackTarget(id)}
              onAddRule={() => setRuleModalOpen(true)}
            />
          ))}

          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={loading} />
      </div>

      {/* Sidebar */}
      <div className="w-72 shrink-0 space-y-3 overflow-y-auto">
        {/* Domain Rules */}
        <SidebarPanel title="Domain Rules" count={rules.length} badgeVariant="processing" defaultOpen>
          {rules.length === 0 ? (
            <p className="text-xs text-frankly-gray/60">No rules yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {rules.map((rule) => (
                <div key={rule.id} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Shield className="h-3 w-3 text-frankly-gray" />
                    <span className="font-medium text-frankly-dark truncate">{rule.rule_name}</span>
                    {importanceBadge(rule.importance)}
                  </div>
                  <p className="text-frankly-gray line-clamp-2 ml-[18px]">{rule.rule_text}</p>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => setRuleModalOpen(true)}
            className="w-full mt-2 text-xs gap-1"
          >
            <BookOpen className="h-3 w-3" />
            Add Rule
          </Button>
        </SidebarPanel>

        {/* Approved Outputs */}
        <SidebarPanel title="Approved Outputs" count={approvedOutputs.length} badgeVariant="approved">
          {approvedOutputs.length === 0 ? (
            <p className="text-xs text-frankly-gray/60">No approved outputs yet. Approve good responses to build examples.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {approvedOutputs.map((ao) => (
                <div key={ao.id} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <CheckCircle className="h-3 w-3 text-frankly-green" />
                    <span className="font-medium text-frankly-dark truncate">{ao.user_query}</span>
                  </div>
                  <span className="text-frankly-gray/60 ml-[18px]">{ao.query_type}</span>
                </div>
              ))}
            </div>
          )}
        </SidebarPanel>

        {/* Recent Corrections */}
        <SidebarPanel title="Recent Corrections" count={corrections.length} badgeVariant="pending">
          {corrections.length === 0 ? (
            <p className="text-xs text-frankly-gray/60">No corrections yet. Flag issues to improve accuracy.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {corrections.slice(0, 5).map((c) => (
                <div key={c.id} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="font-medium text-frankly-dark truncate">{c.field_name}</span>
                  </div>
                  {c.corrected_value && (
                    <p className="text-frankly-gray line-clamp-1 ml-[18px]">{c.corrected_value}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SidebarPanel>

        {/* Quick Actions */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
          <h4 className="text-xs font-semibold text-frankly-gray uppercase tracking-wider mb-2">
            Quick Actions
          </h4>
          <button
            onClick={handleNewChat}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-frankly-dark hover:bg-frankly-gray-light transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4 text-frankly-gray" />
            New Chat
          </button>
          <button
            onClick={handleExportChat}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-frankly-dark hover:bg-frankly-gray-light transition-colors"
          >
            <Download className="h-4 w-4 text-frankly-gray" />
            Export Chat
          </button>
        </div>
      </div>

      {/* Modals */}
      {feedbackTarget && (
        <FeedbackModal
          onSubmit={handleFlagSubmit}
          onCancel={() => setFeedbackTarget(null)}
        />
      )}
      {ruleModalOpen && (
        <RuleModal
          onSubmit={handleAddRule}
          onCancel={() => setRuleModalOpen(false)}
        />
      )}
    </div>
  );
}
