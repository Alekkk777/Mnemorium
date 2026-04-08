/**
 * QRPhotoUpload.tsx
 * Shows a QR code the user scans with their phone.
 * Phone opens a local web page → uploads photos → desktop picks them up and
 * adds them to the selected palace automatically.
 *
 * Requires the Python AI server to be running (port from get_python_server_port).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { X, Camera, CheckCircle, Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { usePalaceStore } from '@/lib/store';
import { saveBase64Image, getImageUrl } from '@/lib/tauriImageStorage';
import { is360Image } from '@/lib/imageUtils';

interface QRPhotoUploadProps {
  palaceId: string;
  onClose: () => void;
}

interface PendingFile {
  data_base64: string;
  file_name: string;
  content_type: string;
}

type Status =
  | { kind: 'loading' }
  | { kind: 'no_server' }
  | { kind: 'ready'; qrDataUrl: string; uploadUrl: string; token: string }
  | { kind: 'uploading'; count: number }
  | { kind: 'done'; count: number }
  | { kind: 'error'; message: string };

export default function QRPhotoUpload({ palaceId, onClose }: QRPhotoUploadProps) {
  const { addImage } = usePalaceStore();
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);
  const portRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);
  const failCountRef = useRef(0);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const processFiles = useCallback(async (files: PendingFile[]) => {
    if (!files.length) return;
    stopPolling();
    setStatus({ kind: 'uploading', count: files.length });

    let added = 0;
    for (const f of files) {
      try {
        const result = await saveBase64Image(f.data_base64, f.file_name, 'palace_images');

        // Determine dimensions from base64
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 1024, height: 512 });
          img.src = `data:${f.content_type};base64,${f.data_base64}`;
        });

        await addImage(palaceId, {
          name: f.file_name,
          fileName: f.file_name,
          localFilePath: result.relativePath,
          width: dimensions.width,
          height: dimensions.height,
          is360: is360Image(dimensions.width, dimensions.height),
        });
        added++;
      } catch (err) {
        console.error('[QRPhotoUpload] Failed to save image:', err);
      }
    }

    setStatus({ kind: 'done', count: added });
  }, [palaceId, addImage]);

  const startSession = useCallback(async () => {
    setStatus({ kind: 'loading' });
    stopPolling();

    try {
      // Get Python server port via Tauri
      let port: number | null = null;
      if ((window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        port = await (invoke as (cmd: string) => Promise<number | null>)('get_python_server_port').catch(() => null);
      }

      if (!port) {
        setStatus({ kind: 'no_server' });
        return;
      }
      portRef.current = port;

      // Create upload session via Python server
      const res = await fetch(`http://127.0.0.1:${port}/upload/session?palace_id=${palaceId}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: { token: string; url: string } = await res.json();
      tokenRef.current = data.token;

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(data.url, {
        width: 280,
        margin: 2,
        color: { dark: '#ffffff', light: '#0f0f11' },
      });

      setStatus({ kind: 'ready', qrDataUrl, uploadUrl: data.url, token: data.token });

      // Reset fail counter for new session
      failCountRef.current = 0;

      // Start polling for uploaded files
      pollRef.current = setInterval(async () => {
        // Skip tick if previous one is still in progress
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        try {
          const pollRes = await fetch(`http://127.0.0.1:${port}/upload/poll/${data.token}`);
          const pollData: { files: PendingFile[]; expired: boolean } = await pollRes.json();
          failCountRef.current = 0; // reset on success
          if (pollData.expired) { stopPolling(); return; }
          if (pollData.files.length > 0) { await processFiles(pollData.files); }
        } catch {
          failCountRef.current += 1;
          if (failCountRef.current >= 5) {
            stopPolling();
            setStatus({ kind: 'error', message: 'Connection to server lost. Please try again.' });
          }
        } finally {
          isPollingRef.current = false;
        }
      }, 2000);

    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [palaceId, processFiles]);

  useEffect(() => {
    startSession();
    return stopPolling;
  }, [startSession]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-foreground">Upload from phone</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          {status.kind === 'loading' && (
            <div className="py-8">
              <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted">Preparing session...</p>
            </div>
          )}

          {status.kind === 'no_server' && (
            <div className="py-6">
              <WifiOff className="w-12 h-12 text-danger mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">AI server unavailable</p>
              <p className="text-xs text-muted mb-4">
                The local server is not running. Restart the app and try again.
              </p>
              <button
                onClick={startSession}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg mx-auto"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {status.kind === 'ready' && (
            <>
              <p className="text-sm text-muted mb-4">
                Scan with your phone to upload photos directly to this palace
              </p>
              <div className="inline-block p-3 bg-background rounded-xl border border-white/10 mb-4">
                <img src={status.qrDataUrl} alt="QR Code" className="w-[220px] h-[220px]" />
              </div>
              <p className="text-xs text-muted">
                Same Wi-Fi network required
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <p className="text-xs text-muted">Waiting for photos...</p>
              </div>
            </>
          )}

          {status.kind === 'uploading' && (
            <div className="py-8">
              <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                Saving {status.count} {status.count === 1 ? 'photo' : 'photos'}...
              </p>
            </div>
          )}

          {status.kind === 'done' && (
            <div className="py-6">
              <CheckCircle className="w-14 h-14 text-success mx-auto mb-3" />
              <p className="text-lg font-bold text-foreground mb-1">
                {status.count} {status.count === 1 ? 'photo added' : 'photos added'}!
              </p>
              <p className="text-sm text-muted mb-6">
                The rooms are now visible in the palace.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={startSession}
                  className="flex-1 py-2.5 bg-white/10 text-foreground rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {status.kind === 'error' && (
            <div className="py-6">
              <p className="text-sm text-danger mb-2">{status.message}</p>
              <button
                onClick={startSession}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg mx-auto text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
