const PALETTES = [
  { from: "#6366f1", to: "#8b5cf6" },
  { from: "#0ea5e9", to: "#6366f1" },
  { from: "#10b981", to: "#0ea5e9" },
  { from: "#f59e0b", to: "#ef4444" },
  { from: "#ec4899", to: "#8b5cf6" },
  { from: "#14b8a6", to: "#6366f1" },
  { from: "#f97316", to: "#ec4899" },
  { from: "#84cc16", to: "#0ea5e9" },
];

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface UserAvatarProps {
  firstName?: string;
  lastName?: string;
  userId?: string;
  email?: string;
  profileImageUrl?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({ firstName, lastName, userId, email, profileImageUrl, size = 36, className = "" }: UserAvatarProps) {
  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt="Avatar"
        width={size}
        height={size}
        className={`flex-shrink-0 object-cover ${className}`}
        style={{ borderRadius: "50%", width: size, height: size }}
      />
    );
  }

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || (email?.[0]?.toUpperCase() ?? "?");

  const seed = userId || email || "default";
  const hash = hashStr(seed);
  const palette = PALETTES[hash % PALETTES.length];
  const gradId = `ig-${hash % 99999}`;
  const fontSize = size * 0.38;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`flex-shrink-0 ${className}`}
      style={{ borderRadius: "50%" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradId})`} />
      <text
        x={size / 2}
        y={size / 2 + fontSize * 0.38}
        textAnchor="middle"
        fill="white"
        fontSize={fontSize}
        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        {initials}
      </text>
    </svg>
  );
}
