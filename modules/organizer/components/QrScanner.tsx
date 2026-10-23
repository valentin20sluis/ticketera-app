"use client";

import { Button } from "@/components/ui/button";
import { useQrScanner } from "@/modules/organizer/hooks/useQrScanner";

type QrScannerProps = {
  onScan: (rawText: string) => void;
  busy?: boolean;
};

export function QrScanner({ onScan, busy }: QrScannerProps) {
  const { videoRef, status, errorMessage, start, stop } = useQrScanner({ onScan, busy });
  const isOn = status === "active" || status === "starting";

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        muted
        playsInline
        className={isOn ? "aspect-video w-full rounded-lg bg-black object-cover" : "hidden"}
      />
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      {isOn ? (
        <Button type="button" variant="outline" onClick={stop}>
          Desactivar cámara
        </Button>
      ) : (
        <Button type="button" onClick={start}>
          Activar cámara
        </Button>
      )}
    </div>
  );
}
