import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DropZone } from "@/components/brand";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/utils";

export interface UploadedFile {
  /** Storage path returned by the server; this is the stored reference. */
  path: string;
  fileName: string;
  size: number;
  contentType: string;
}

interface ObjectUploaderProps {
  /** Max file size in bytes (server limit is 10MB). */
  maxFileSize?: number;
  /** Value for the file input's accept attribute. */
  accept?: string;
  onUploaded: (result: UploadedFile) => void | Promise<void>;
  buttonClassName?: string;
  disabled?: boolean;
  children: ReactNode;
}

/** Link that opens an uploaded file (the server checks access and redirects to a signed URL). */
export function fileUrl(path: string) {
  return `/api/files/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Readable list of accepted formats, e.g. ".pdf,.docx" -> "PDF, DOCX". */
function describeAccept(accept?: string): string | null {
  if (!accept) return null;
  const parts = accept
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith(".")) return part.slice(1).toUpperCase();
      if (part.endsWith("/*")) return `${part.slice(0, -2)} files`;
      return part;
    });
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Uploads a single file: asks the server for a signed upload URL
 * (POST /api/uploads), PUTs the file there, then reports the stored path.
 */
export function ObjectUploader({
  maxFileSize = 10 * 1024 * 1024,
  accept,
  onUploaded,
  buttonClassName,
  disabled,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again still triggers onChange
    event.target.value = "";
    if (!file) return;

    if (file.size > maxFileSize) {
      toast({
        title: "File too large",
        description: `Files must be smaller than ${Math.round(maxFileSize / 1024 / 1024)}MB.`,
        variant: "destructive",
      });
      return;
    }

    const contentType = file.type || "application/octet-stream";
    setIsUploading(true);
    try {
      const response = await apiRequest("POST", "/api/uploads", {
        fileName: file.name,
        contentType,
        size: file.size,
      });
      const { uploadUrl, path } = (await response.json()) as { uploadUrl: string; path: string };

      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error(`Upload failed (${putResponse.status})`);
      }

      await onUploaded({ path, fileName: file.name, size: file.size, contentType });
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: getApiErrorMessage(error, "Could not upload the file. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const maxSizeMb = Math.round(maxFileSize / 1024 / 1024);
  const formats = describeAccept(accept);

  return (
    <DropZone className="w-full">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading || disabled}
        accept={accept}
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={buttonClassName}
        disabled={isUploading || disabled}
        data-testid="button-upload"
      >
        {isUploading ? "Uploading..." : children}
      </Button>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {isUploading
          ? "Uploading your file. This can take a moment."
          : `${formats ? `${formats}. ` : ""}One file, up to ${maxSizeMb}MB.`}
      </p>
    </DropZone>
  );
}
