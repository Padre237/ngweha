/** Icones de navigation, inline pour eviter une dependance externe. */
function Icon({ children }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * Liens de la sidebar, dans l'ordre impose par le CDC §5.1.
 * `requiresEvent` grise les entrees tant qu'aucun evenement n'est selectionne.
 */
export const NAV_ITEMS = [
  {
    to: '/events',
    label: 'Mes evenements',
    requiresEvent: false,
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </Icon>
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    requiresEvent: true,
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </Icon>
    ),
  },
  {
    to: '/guests',
    label: 'Invites',
    requiresEvent: true,
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 5.5a3.5 3.5 0 0 1 0 6.5M18 20a6.4 6.4 0 0 0-2-4.7" />
      </Icon>
    ),
  },
  {
    to: '/scanner',
    label: 'Scanner',
    requiresEvent: true,
    icon: (
      <Icon>
        <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M3 12h18" />
      </Icon>
    ),
  },
  {
    to: '/seating',
    label: 'Plan de salle',
    requiresEvent: true,
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="4" r="1.6" />
        <circle cx="12" cy="20" r="1.6" />
        <circle cx="4" cy="12" r="1.6" />
        <circle cx="20" cy="12" r="1.6" />
      </Icon>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytiques',
    requiresEvent: true,
    icon: (
      <Icon>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </Icon>
    ),
  },
  {
    to: '/gallery',
    label: 'Galerie',
    requiresEvent: true,
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="m3 17 5-4 4 3 3-2 6 5" />
      </Icon>
    ),
  },
  {
    to: '/messages',
    label: 'Messages',
    requiresEvent: true,
    icon: (
      <Icon>
        <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" />
      </Icon>
    ),
  },
  {
    to: '/settings',
    label: 'Parametres',
    requiresEvent: true,
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.6a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.5-2.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3Z" />
      </Icon>
    ),
  },
];
