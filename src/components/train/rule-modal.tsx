"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface RuleModalProps {
  onSubmit: (data: {
    ruleName: string;
    ruleText: string;
    importance: string;
    appliesTo: string;
  }) => void;
  onCancel: () => void;
}

export function RuleModal({ onSubmit, onCancel }: RuleModalProps) {
  const [ruleName, setRuleName] = useState("");
  const [ruleText, setRuleText] = useState("");
  const [importance, setImportance] = useState("medium");
  const [appliesTo, setAppliesTo] = useState("all");

  return (
    <Modal open onClose={onCancel} size="lg">
      <h3 className="text-lg font-semibold text-frankly-dark">Add Domain Rule</h3>
      <p className="mt-1 text-sm text-frankly-gray">
        Add a rule that Lydia must follow in future responses.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-frankly-dark mb-1">
            Rule Name
          </label>
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="e.g., always_mention_exclusions"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-frankly-dark mb-1">
            Rule Text
          </label>
          <textarea
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            rows={3}
            placeholder="Describe what Lydia should or shouldn't do..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-frankly-dark mb-1">
              Importance
            </label>
            <select
              value={importance}
              onChange={(e) => setImportance(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-frankly-dark mb-1">
              Applies To
            </label>
            <select
              value={appliesTo}
              onChange={(e) => setAppliesTo(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
            >
              <option value="all">All</option>
              <option value="comparison">Comparison</option>
              <option value="extraction">Extraction</option>
              <option value="explanation">Explanation</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={() => onSubmit({ ruleName, ruleText, importance, appliesTo })}
          disabled={!ruleName.trim() || !ruleText.trim()}
        >
          Add Rule
        </Button>
      </div>
    </Modal>
  );
}
