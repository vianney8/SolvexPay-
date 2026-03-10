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

export function UserAvatar({ profileImageUrl, size = 36, className = "" }: UserAvatarProps) {
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

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center bg-white overflow-hidden ${className}`}
      style={{ borderRadius: "50%", width: size, height: size }}
    >
      <img
        src={solvexpayLogo}
        alt="SolvexPay"
        style={{ width: size * 0.82, height: size * 0.82, objectFit: "contain" }}
      />
    </div>
  );
}
