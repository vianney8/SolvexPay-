import solvexpayLogo from "@/assets/images/solvexpay-logo.png";

interface UserAvatarProps {
  firstName?: string;
  lastName?: string;
  userId?: string;
  email?: string;
  profileImageUrl?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({ firstName, lastName, profileImageUrl, size = 36, className = "" }: UserAvatarProps) {
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
    .join("");

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center overflow-hidden bg-white ${className}`}
      style={{ borderRadius: "50%", width: size, height: size }}
    >
      {initials ? (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)" }}
        >
          <span
            style={{ fontSize: size * 0.38, color: "white", fontWeight: 700, fontFamily: "system-ui, sans-serif" }}
          >
            {initials}
          </span>
        </div>
      ) : (
        <img
          src={solvexpayLogo}
          alt="SolvexPay"
          style={{ width: size * 0.8, height: size * 0.8, objectFit: "contain" }}
        />
      )}
    </div>
  );
}
