function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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

function getShape(index: number, size: number) {
  const s = size;
  const c = s / 2;
  const shapes = [
    <polygon points={`${c},${s * 0.1} ${s * 0.9},${c} ${c},${s * 0.9} ${s * 0.1},${c}`} fill="rgba(255,255,255,0.25)" />,
    <circle cx={c} cy={c} r={s * 0.32} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={s * 0.07} />,
    <path d={`M${c},${s*0.12} L${s*0.88},${s*0.78} L${s*0.12},${s*0.78} Z`} fill="rgba(255,255,255,0.22)" />,
    <>
      <rect x={c - s * 0.22} y={c - s * 0.22} width={s * 0.44} height={s * 0.44} rx={s * 0.07} fill="rgba(255,255,255,0.22)" transform={`rotate(45 ${c} ${c})`} />
    </>,
    <polygon points={`${c},${s*0.1} ${s*0.95},${c*0.72} ${s*0.76},${s*0.95} ${s*0.24},${s*0.95} ${s*0.05},${c*0.72}`} fill="rgba(255,255,255,0.22)" />,
    <>
      <circle cx={c} cy={c} r={s * 0.28} fill="rgba(255,255,255,0.18)" />
      <circle cx={c} cy={c} r={s * 0.15} fill="rgba(255,255,255,0.2)" />
    </>,
    <path d={`M${s*0.5},${s*0.08} L${s*0.92},${s*0.34} L${s*0.92},${s*0.66} L${s*0.5},${s*0.92} L${s*0.08},${s*0.66} L${s*0.08},${s*0.34} Z`} fill="rgba(255,255,255,0.22)" />,
    <>
      <rect x={s*0.25} y={s*0.25} width={s*0.5} height={s*0.5} rx={s*0.06} fill="rgba(255,255,255,0.22)" />
      <rect x={s*0.35} y={s*0.35} width={s*0.3} height={s*0.3} rx={s*0.04} fill="rgba(255,255,255,0.2)" />
    </>,
  ];
  return shapes[index % shapes.length];
}

interface UserAvatarProps {
  userId?: string;
  email?: string;
  size?: number;
  className?: string;
}

export function UserAvatar({ userId, email, size = 36, className = "" }: UserAvatarProps) {
  const seed = userId || email || "default";
  const hash = hashStr(seed);
  const palette = PALETTES[hash % PALETTES.length];
  const shapeIndex = (hash >> 4) % 8;
  const gradId = `avatar-grad-${hash % 1000}`;

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
        <clipPath id={`clip-${gradId}`}>
          <circle cx={size / 2} cy={size / 2} r={size / 2} />
        </clipPath>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradId})`} />
      <g clipPath={`url(#clip-${gradId})`}>
        {getShape(shapeIndex, size)}
      </g>
    </svg>
  );
}
