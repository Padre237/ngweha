import { cx, toPercent } from '../../lib/utils.js';
import './ProgressBar.css';

/**
 * Barre de progression lineaire (CDC §3.4).
 * La couleur passe en warning a 70% et en error a 100% (code couleur CDC §5.6).
 */
export default function ProgressBar({
  value = 0,
  total = 100,
  label,
  showValue = true,
  gradient = false,
  autoColor = true,
  className,
}) {
  const percent = toPercent(value, total);

  let tone = '';
  if (gradient) tone = 'wp-progress__fill--gradient';
  else if (autoColor && percent >= 100) tone = 'wp-progress__fill--error';
  else if (autoColor && percent >= 70) tone = 'wp-progress__fill--warning';

  return (
    <div className={cx('wp-progress', className)}>
      {(label || showValue) && (
        <div className="wp-progress__head">
          {label && <span>{label}</span>}
          {showValue && (
            <span>
              {value} / {total}
            </span>
          )}
        </div>
      )}
      <div
        className="wp-progress__track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progression'}
      >
        <div className={cx('wp-progress__fill', tone)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Jauge circulaire SVG — anneau du dashboard (CDC §5.3). */
export function ProgressRing({ value = 0, total = 100, size = 160, stroke = 12, caption }) {
  const percent = toPercent(value, total);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="wp-progress-ring" style={{ width: size, height: size }}>
      <svg className="wp-progress-ring__svg" width={size} height={size} aria-hidden="true">
        <circle
          className="wp-progress-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="wp-progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="wp-progress-ring__center">
        <span className="wp-progress-ring__number">{percent}%</span>
        {caption && <span className="wp-progress-ring__caption">{caption}</span>}
      </div>
    </div>
  );
}
