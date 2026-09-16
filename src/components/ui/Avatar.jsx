import { cx, getAvatarColor, getInitials } from '../../lib/utils.js';
import './Avatar.css';

/**
 * Avatar — initiales colorees par hash du nom, ou image si fournie (CDC §3.4).
 *
 * @param {'sm'|'md'|'lg'} size
 */
export default function Avatar({ name = '', src, size = 'md', className }) {
  return (
    <span
      className={cx('wp-avatar', `wp-avatar--${size}`, className)}
      style={{ background: src ? 'transparent' : getAvatarColor(name) }}
      title={name || undefined}
    >
      {src ? (
        <img className="wp-avatar__image" src={src} alt={name} loading="lazy" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

/** Pile d'avatars avec compteur « +N » au-dela de `max` (CDC §5.6). */
export function AvatarGroup({ names = [], max = 4, size = 'sm' }) {
  const visible = names.slice(0, max);
  const remaining = names.length - visible.length;

  return (
    <span className="wp-avatar-group">
      {visible.map((name, index) => (
        <Avatar key={`${name}-${index}`} name={name} size={size} />
      ))}
      {remaining > 0 && <span className="wp-avatar-group__more">+{remaining}</span>}
    </span>
  );
}
