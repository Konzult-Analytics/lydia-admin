"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface FeedbackModalProps {
  onSubmit: (data: { fieldName: string; issue: string; correction: string }) => void;
  onCancel: () => void;
}

export function FeedbackModal({ onSubmit, onCancel }: FeedbackModalProps) {
  const [issue, setIssue] = useState("");
  const [correction, setCorrection] = useState("");
  const [fieldName, setFieldName] = useState("chat_response");

  return (
    <Modal open onClose={onCancel} size="lg">
      <h3 className="text-lg font-semibold text-frankly-dark">Flag an Issue</h3>
      <p className="mt-1 text-sm text-frankly-gray">
        Help improve Lydia by describing what was wrong and what the correct answer should be.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-frankly-dark mb-1">
            Field / Area
          </label>
          <select
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-frankly-dark focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          >
            <option value="chat_response">General Response</option>
            <option value="benefit_value">Benefit Value</option>
            <option value="insurer_info">Insurer Information</option>
            <option value="comparison">Comparison Accuracy</option>
            <option value="tone">Tone / Neutrality</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-frankly-dark mb-1">
            What was wrong?
          </label>
          <textarea
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            rows={3}
            placeholder="Describe the issue..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-frankly-dark focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-frankly-dark mb-1">
            What&apos;s the correct information?
          </label>
          <textarea
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            rows={3}
            placeholder="Provide the correct answer..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-frankly-dark focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          variant="danger"
          onClick={() => onSubmit({ fieldName, issue, correction })}
          disabled={!issue.trim()}
        >
          Flag Issue
        </Button>
      </div>
    </Modal>
  );
}
