interface OperatorLogoProps {
  operator: string;
  size?: number;
}

function MtnLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#FFCC00"/>
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="13" fill="#0066CC" letterSpacing="-0.5">MTN</text>
    </svg>
  );
}

function OrangeLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#FF6600"/>
      <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="9" fill="white" letterSpacing="0.5">orange</text>
    </svg>
  );
}

function WaveLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#1A56DB"/>
      <path d="M10 26 Q14 18 18 26 Q22 34 26 26 Q30 18 34 26 Q36 30 38 26" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <text x="50%" y="72%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="white">wave</text>
    </svg>
  );
}

function MoovLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#0050A0"/>
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="10" fill="white" letterSpacing="0.5">MOOV</text>
    </svg>
  );
}

function TMoneyLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#00A651"/>
      <text x="50%" y="40%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="18" fill="white">T</text>
      <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="white">Money</text>
    </svg>
  );
}

function VodacomLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#E2001A"/>
      <circle cx="24" cy="22" r="9" fill="white" opacity="0.15"/>
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="16" fill="white">V</text>
      <text x="50%" y="75%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="6.5" fill="white">VODACOM</text>
    </svg>
  );
}

function AirtelLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#CC0000"/>
      <path d="M14 30 Q24 10 34 30" stroke="white" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <text x="50%" y="72%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="white">airtel</text>
    </svg>
  );
}

function FreeMoneyLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#6200EA"/>
      <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="10" fill="white">FREE</text>
      <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="600" fontSize="8" fill="white">Money</text>
    </svg>
  );
}

export function OperatorLogo({ operator, size = 48 }: OperatorLogoProps) {
  const op = operator.toLowerCase();
  if (op === "mtn") return <MtnLogo size={size} />;
  if (op === "orange") return <OrangeLogo size={size} />;
  if (op === "wave") return <WaveLogo size={size} />;
  if (op === "moov") return <MoovLogo size={size} />;
  if (op === "tmoney") return <TMoneyLogo size={size} />;
  if (op === "vodacom") return <VodacomLogo size={size} />;
  if (op === "airtel") return <AirtelLogo size={size} />;
  if (op === "free") return <FreeMoneyLogo size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="24" fill="#6B7280"/>
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="10" fill="white">{operator.slice(0, 3).toUpperCase()}</text>
    </svg>
  );
}
