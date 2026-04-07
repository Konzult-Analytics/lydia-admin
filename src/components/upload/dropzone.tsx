"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
}

export function Dropzone({
  file,
  onFileSelect,
  onFileRemove,
  disabled = false,
}: DropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    disabled,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "Invalid file";
      toast.error(msg);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        disabled
          ? "pointer-events-none opacity-60 border-border"
          : "cursor-pointer",
        isDragActive
          ? "border-frankly-green bg-frankly-green-light"
          : file
            ? "border-frankly-green/40 bg-frankly-green-light"
            : "border-border hover:border-frankly-green/50 hover:bg-frankly-green-light/50"
      )}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-frankly-green shrink-0" />
          <div className="text-left">
            <p className="font-medium text-frankly-dark">{file.name}</p>
            <p className="text-sm text-frankly-gray">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
              className="ml-2 rounded-full p-1 text-frankly-gray hover:bg-surface-secondary hover:text-frankly-dark"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Upload
            className={cn(
              "h-10 w-10",
              isDragActive ? "text-frankly-green" : "text-frankly-gray"
            )}
          />
          <p className="mt-3 text-sm font-medium text-frankly-dark">
            {isDragActive
              ? "Drop your PDF here"
              : "Drag & drop a PDF, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-frankly-gray">PDF only, up to 50MB</p>
        </div>
      )}
    </div>
  );
}
