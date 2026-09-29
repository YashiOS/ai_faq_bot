"use client";

import { AlertCircle, ArrowRight, FileText, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { MAX_UPLOAD_BYTES } from "@/api/config";
import { Button } from "@/components/common/Button";
import { cn, formatBytes } from "@/lib/format";

function validatePdf(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return `“${file.name}” isn't a PDF. Only PDF files are supported.`;
  if (file.size === 0) return "This file is empty. Please choose another PDF.";
  if (file.size > MAX_UPLOAD_BYTES)
    return `This PDF is ${formatBytes(file.size)}. The maximum size is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  return null;
}

interface PdfUploadProps {
  file: File | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function PdfUpload({ file, onSelect, onClear, onSubmit }: PdfUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accept(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 1) {
      setError("Please upload one PDF at a time.");
      return;
    }
    const candidate = files[0];
    const problem = validatePdf(candidate);
    setError(problem);
    if (!problem) onSelect(candidate);
  }

  function handleDrag(event: DragEvent, delta: 1 | -1) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current + delta);
    setIsDragging(dragDepth.current > 0);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    accept(event.dataTransfer.files);
  }

  function clear() {
    setError(null);
    onClear();
    if (inputRef.current) inputRef.current.value = "";
  }

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        accept(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (file) {
    return (
      <div className="animate-fade-in space-y-4">
        {hiddenInput}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-sm">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
            <FileText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink" title={file.name}>
              {file.name}
            </p>
            <p className="mt-0.5 text-xs text-subtle">PDF · {formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-md p-1.5 text-subtle transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={() => inputRef.current?.click()}>Choose another</Button>
          <Button variant="primary" onClick={onSubmit}>
            Process document
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF. Drop a file here or press Enter to browse."
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => handleDrag(e, 1)}
        onDragLeave={(e) => handleDrag(e, -1)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[1.5px] border-dashed px-6 py-12 text-center transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          isDragging
            ? "border-accent bg-accent-soft"
            : "border-line-strong bg-surface hover:border-subtle hover:bg-surface-muted/40",
        )}
      >
        {hiddenInput}
        <span
          className={cn(
            "flex size-11 items-center justify-center rounded-xl border transition-colors",
            isDragging
              ? "border-accent/30 bg-surface text-accent"
              : "border-line bg-surface-muted text-muted group-hover:text-ink",
          )}
        >
          <Upload className="size-5" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-medium text-ink">
          {isDragging ? "Drop to upload" : "Drop your PDF here"}
        </p>
        <p className="mt-1 text-sm text-muted">
          or <span className="font-medium text-accent underline-offset-2 group-hover:underline">browse files</span>
        </p>
        <p className="mt-4 text-xs text-subtle">PDF only · up to {formatBytes(MAX_UPLOAD_BYTES)}</p>
      </div>

      {error && (
        <p role="alert" className="animate-fade-in flex items-start gap-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
