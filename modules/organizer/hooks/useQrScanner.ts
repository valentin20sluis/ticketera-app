"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type QrScannerType from "qr-scanner";

export const SCAN_COOLDOWN_MS = 3000;

export type QrScannerStatus = "idle" | "starting" | "active" | "error";
export type QrScannerError = "denied" | "no-camera" | "insecure" | "unknown";

export const QR_SCANNER_ERROR_MESSAGES: Record<QrScannerError, string> = {
  denied: "No diste permiso para usar la cámara. Habilítalo en tu navegador o usa el ingreso manual.",
  "no-camera": "No se encontró una cámara en este dispositivo. Usa el ingreso manual.",
  insecure: "La cámara solo funciona en una conexión segura (HTTPS). Usa el ingreso manual.",
  unknown: "No se pudo iniciar la cámara. Usa el ingreso manual.",
};

function mapError(error: unknown): QrScannerError {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-camera";
  if (typeof error === "string" && error.toLowerCase().includes("camera not found")) return "no-camera";
  return "unknown";
}

type Options = {
  /** Called once per decoded code (same code ignored for ~3 s). */
  onScan: (rawText: string) => void;
  /** While true, no code is emitted (a validation is pending). */
  busy?: boolean;
};

export function useQrScanner({ onScan, busy = false }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScannerType | null>(null);
  const runRef = useRef(0); // invalidates in-flight start() calls
  const lastRef = useRef<{ code: string; at: number } | null>(null);
  const onScanRef = useRef(onScan);
  const busyRef = useRef(busy);
  const [status, setStatus] = useState<QrScannerStatus>("idle");
  const [error, setError] = useState<QrScannerError | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    busyRef.current = busy;
  });

  const stop = useCallback(() => {
    runRef.current += 1;
    scannerRef.current?.destroy(); // stops the stream tracks
    scannerRef.current = null;
    lastRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (scannerRef.current) return;
    const run = ++runRef.current;
    setError(null);

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("insecure");
      setStatus("error");
      return;
    }

    setStatus("starting");
    let scanner: QrScannerType | null = null;
    try {
      const { default: QrScanner } = await import("qr-scanner");
      if (run !== runRef.current || !videoRef.current) return;

      scanner = new QrScanner(
        videoRef.current,
        ({ data }) => {
          const now = Date.now();
          const last = lastRef.current;
          if (busyRef.current) return;
          if (last && last.code === data && now - last.at < SCAN_COOLDOWN_MS) return;
          lastRef.current = { code: data, at: now };
          onScanRef.current(data);
        },
        { preferredCamera: "environment", returnDetailedScanResult: true, maxScansPerSecond: 5 },
      );
      scannerRef.current = scanner;
      await scanner.start();
      if (run !== runRef.current) return; // stopped/unmounted meanwhile (already destroyed)
      setStatus("active");
    } catch (e) {
      if (run !== runRef.current) return;
      scanner?.destroy();
      scannerRef.current = null;
      setError(mapError(e));
      setStatus("error");
    }
  }, []);

  // Release the camera on unmount.
  useEffect(() => stop, [stop]);

  return { videoRef, status, error, errorMessage: error ? QR_SCANNER_ERROR_MESSAGES[error] : null, start, stop };
}
