"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface RejectModalProps {
  benefitName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectModal({
  benefitName,
  onConfirm,
  onCancel,
}: RejectModalProps) {
  const [reason, setReason] = useState("");

  return (
    <Modal open onClose={onCancel} size="md">
      <h3 className="text-lg font-semibold text-frankly-dark">
        Reject Benefit
      </h3>
      <p className="mt-1 text-sm text-frankly-gray">
        Rejecting{" "}
        <span className="font-medium text-frankly-dark">{benefitName}</span>
      </p>

      <div className="mt-4">
        <label className="block text-sm font-medium text-frankly-dark mb-1">
          Reason (optional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Why is this extraction incorrect?"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-frankly-dark focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
        />
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => onConfirm(reason)}>
          Reject
        </Button>
      </div>
    </Modal>
  );
}
