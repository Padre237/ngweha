import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pilote html5-qrcode : demarrage, pause, camera, torche et zoom (CDC §5.5).
 * La bibliotheque est importee dynamiquement pour ne peser que sur cet ecran.
 */
export function useQrScanner({ elementId, onDecoded, enabled }) {
  const scannerRef = useRef(null);
  const onDecodedRef = useRef(onDecoded);

  const [cameras, setCameras] = useState([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [capabilities, setCapabilities] = useState({ torch: false, zoom: false });
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  // Garde la derniere callback sans relancer la camera a chaque rendu
  useEffect(() => {
    onDecodedRef.current = onDecoded;
  }, [onDecoded]);

  // ── Demarrage / arret de la camera ──
  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let instance = null;

    async function start() {
      setStarting(true);
      setError(null);

      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        const devices = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (!devices || devices.length === 0) {
          setError("Aucune camera detectee sur cet appareil.");
          setStarting(false);
          return;
        }

        setCameras(devices);
        const device = devices[Math.min(cameraIndex, devices.length - 1)];

        instance = new Html5Qrcode(elementId, { verbose: false });
        scannerRef.current = instance;

        await instance.start(
          device.id,
          { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
          (decodedText) => onDecodedRef.current?.(decodedText),
          // Rappelee a chaque image sans QR : volontairement ignoree
          () => {}
        );

        if (cancelled) return;

        // Torche et zoom ne sont pas disponibles sur tous les appareils
        try {
          const settings = instance.getRunningTrackCapabilities();
          setCapabilities({
            torch: Boolean(settings?.torch),
            zoom: Boolean(settings?.zoom),
          });
        } catch {
          setCapabilities({ torch: false, zoom: false });
        }

        setStarting(false);
      } catch (caught) {
        if (cancelled) return;
        console.error('[WeddingPass] Demarrage du scanner impossible :', caught);
        setError(
          "Impossible d'acceder a la camera. Verifiez l'autorisation du navigateur, " +
            'et notez que la camera exige HTTPS hors localhost.'
        );
        setStarting(false);
      }
    }

    start();

    return () => {
      cancelled = true;
      const current = instance || scannerRef.current;
      if (current) {
        // stop() rejette si le scanner n'a jamais demarre : sans effet ici
        current.stop().catch(() => {}).finally(() => {
          current.clear?.();
          scannerRef.current = null;
        });
      }
    };
  }, [elementId, enabled, cameraIndex]);

  /** Met le decodage en pause sans eteindre la camera. */
  const pause = useCallback(() => {
    try {
      scannerRef.current?.pause(true);
    } catch {
      // Le scanner n'est pas encore demarre
    }
  }, []);

  const resume = useCallback(() => {
    try {
      scannerRef.current?.resume();
    } catch {
      // Idem
    }
  }, []);

  const switchCamera = useCallback(() => {
    setCameraIndex((current) => (cameras.length ? (current + 1) % cameras.length : 0));
  }, [cameras.length]);

  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !capabilities.torch) return;
    const next = !torchOn;
    try {
      await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setCapabilities((current) => ({ ...current, torch: false }));
    }
  }, [capabilities.torch, torchOn]);

  const applyZoom = useCallback(
    async (delta) => {
      if (!scannerRef.current || !capabilities.zoom) return;
      const next = Math.min(5, Math.max(1, Number((zoom + delta).toFixed(1))));
      try {
        await scannerRef.current.applyVideoConstraints({ advanced: [{ zoom: next }] });
        setZoom(next);
      } catch {
        setCapabilities((current) => ({ ...current, zoom: false }));
      }
    },
    [capabilities.zoom, zoom]
  );

  return {
    cameras,
    capabilities,
    torchOn,
    zoom,
    starting,
    error,
    pause,
    resume,
    switchCamera,
    toggleTorch,
    zoomIn: () => applyZoom(0.5),
    zoomOut: () => applyZoom(-0.5),
  };
}
