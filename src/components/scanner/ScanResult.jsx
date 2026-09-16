import { formatTime } from '../../lib/utils.js';
import '../../styles/scanner.css';

/** Presentation des trois issues possibles d'un scan (CDC §5.5). */
const PRESENTATION = {
  success: { icon: '✅', status: 'Acces autorise' },
  already_used: { icon: '⚠️', status: 'QR deja utilise' },
  invalid: { icon: '❌', status: 'Acces refuse' },
};

export default function ScanResult({ result, secondsLeft }) {
  const { icon, status } = PRESENTATION[result.status] ?? PRESENTATION.invalid;

  return (
    <div className={`wp-result wp-result--${result.status}`} role="status" aria-live="assertive">
      <span className="wp-result__icon" aria-hidden="true">
        {icon}
      </span>

      <p className="wp-result__name">{result.guestName || 'QR invalide'}</p>

      <p className="wp-result__status">{status}</p>

      {result.status === 'success' && (
        <p className="wp-result__detail">
          Table {result.tableNumber}
          {result.companions > 0 &&
            ` · ${result.companions} accompagnant${result.companions > 1 ? 's' : ''}`}
        </p>
      )}

      {result.status === 'already_used' && (
        <p className="wp-result__detail">1er scan : {formatTime(result.scannedAt)}</p>
      )}

      {result.status === 'invalid' && (
        <p className="wp-result__detail">Ce code ne correspond a aucun invite</p>
      )}

      {result.category && <span className="wp-result__badge">{result.category}</span>}

      <p className="wp-result__countdown">Retour automatique dans {secondsLeft}s…</p>
    </div>
  );
}
