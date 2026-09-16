import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AdminLayout.jsx';
import ScanResult from '../components/scanner/ScanResult.jsx';
import { useQrScanner } from '../hooks/useQrScanner.js';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Loader,
  useToast,
} from '../components/ui/index.js';
import { useActiveEvent } from '../hooks/useActiveEvent.jsx';
import { scanApi } from '../lib/api.js';
import {
  fireConfetti,
  playErrorSound,
  playSuccessSound,
  playWarningSound,
  vibrate,
} from '../lib/feedback.js';
import { formatShortDate } from '../lib/utils.js';
import '../styles/scanner.css';

/** Duree d'affichage d'un resultat avant retour au scanner (CDC §5.5). */
const RESULT_DURATION_S = 3;
const SCANNER_ELEMENT_ID = 'wp-scanner-video';

export default function ScannerPage() {
  const toast = useToast();
  const { activeEvent, activeEventId } = useActiveEvent();

  const [mode, setMode] = useState('camera');
  const [result, setResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(RESULT_DURATION_S);
  const [manualToken, setManualToken] = useState('');
  const [validating, setValidating] = useState(false);

  // Empeche deux validations concurrentes si la camera decode plusieurs images
  const busyRef = useRef(false);

  /** Envoie le token au serveur et declenche le retour sensoriel adapte. */
  const validateToken = useCallback(
    async (token) => {
      if (busyRef.current || !activeEventId) return;
      busyRef.current = true;
      setValidating(true);

      try {
        const response = await scanApi.validate(activeEventId, token);
        setResult(response);
        setSecondsLeft(RESULT_DURATION_S);

        if (response.status === 'success') {
          playSuccessSound();
          vibrate(60);
          fireConfetti();
        } else if (response.status === 'already_used') {
          playWarningSound();
          vibrate([40, 60, 40]);
        } else {
          playErrorSound();
          vibrate([80, 60, 80]);
        }
      } catch (caught) {
        playErrorSound();
        toast.error('Validation impossible', caught.message);
        busyRef.current = false;
      } finally {
        setValidating(false);
      }
    },
    [activeEventId, toast]
  );

  const scanner = useQrScanner({
    elementId: SCANNER_ELEMENT_ID,
    enabled: mode === 'camera' && Boolean(activeEventId),
    onDecoded: validateToken,
  });

  // Met le decodage en pause tant qu'un resultat est affiche
  useEffect(() => {
    if (result) scanner.pause();
  }, [result, scanner]);

  // Decompte puis retour automatique au scanner (CDC §5.5)
  useEffect(() => {
    if (!result) return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setResult(null);
          setManualToken('');
          busyRef.current = false;
          scanner.resume();
          return RESULT_DURATION_S;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [result, scanner]);

  async function handleManualSubmit(submitEvent) {
    submitEvent.preventDefault();
    const token = manualToken.trim();
    if (!token) return;
    await validateToken(token);
  }

  if (!activeEventId) {
    return (
      <>
        <PageHeader title="Scanner" />
        <Card variant="elevated">
          <EmptyState
            title="Aucun evenement selectionne"
            description="Choisissez un mariage avant de scanner les invites."
            action={
              <Link to="/events">
                <Button>Voir mes evenements</Button>
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Scanner"
        subtitle={
          activeEvent
            ? `${activeEvent.groomName} & ${activeEvent.brideName} · ${formatShortDate(
                activeEvent.eventDate
              )}`
            : undefined
        }
      />

      <div className="wp-scanner">
        {/* ── Resultat plein cadre, ou scanner ── */}
        {result ? (
          <ScanResult result={result} secondsLeft={secondsLeft} />
        ) : (
          <>
            <div className="wp-scanner__modes">
              <Button
                size="sm"
                variant={mode === 'camera' ? 'primary' : 'ghost'}
                onClick={() => setMode('camera')}
              >
                Camera
              </Button>
              <Button
                size="sm"
                variant={mode === 'manual' ? 'primary' : 'ghost'}
                onClick={() => setMode('manual')}
              >
                Saisie manuelle
              </Button>
            </div>

            {mode === 'camera' ? (
              <Card variant="elevated">
                {scanner.error ? (
                  <ErrorState
                    title="Camera indisponible"
                    description={scanner.error}
                    onRetry={() => setMode('manual')}
                  />
                ) : (
                  <>
                    <div className="wp-scanner__frame">
                      <div id={SCANNER_ELEMENT_ID} className="wp-scanner__video" />

                      {/* Les 4 coins orange pulsent en attente (Charte ch.07) */}
                      <div className="wp-scanner__corners">
                        <span className="wp-scanner__corner wp-scanner__corner--tl" />
                        <span className="wp-scanner__corner wp-scanner__corner--tr" />
                        <span className="wp-scanner__corner wp-scanner__corner--bl" />
                        <span className="wp-scanner__corner wp-scanner__corner--br" />
                      </div>
                    </div>

                    <p className="wp-scanner__hint">
                      {scanner.starting
                        ? 'Demarrage de la camera…'
                        : validating
                          ? 'Validation en cours…'
                          : "Pointez le QR code de l'invite"}
                    </p>

                    <div className="wp-scanner__controls">
                      {scanner.capabilities.torch && (
                        <Button size="sm" variant="secondary" onClick={scanner.toggleTorch}>
                          {scanner.torchOn ? 'Eteindre la lampe' : 'Lampe torche'}
                        </Button>
                      )}

                      {scanner.capabilities.zoom && (
                        <>
                          <Button size="sm" variant="secondary" onClick={scanner.zoomOut}>
                            Zoom −
                          </Button>
                          <Button size="sm" variant="secondary" onClick={scanner.zoomIn}>
                            Zoom +
                          </Button>
                        </>
                      )}

                      {scanner.cameras.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={scanner.switchCamera}>
                          Changer de camera
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </Card>
            ) : (
              <Card variant="elevated">
                <form className="wp-scanner__manual" onSubmit={handleManualSubmit}>
                  <Input
                    label="Token de l'invitation"
                    value={manualToken}
                    onChange={(changeEvent) => setManualToken(changeEvent.target.value)}
                    placeholder="64 caracteres hexadecimaux"
                    hint="Collez le token figurant dans le lien /invite/…"
                    autoFocus
                  />
                  <Button type="submit" block loading={validating} disabled={!manualToken.trim()}>
                    Valider
                  </Button>
                </form>
              </Card>
            )}
          </>
        )}

        {validating && !result && <Loader size={24} label="Verification…" />}
      </div>
    </>
  );
}
