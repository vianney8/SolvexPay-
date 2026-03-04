import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { OperatorLogo } from "@/components/operator-logo";
import {
  ArrowRight, Shield, Zap, Globe, Smartphone, Code2, LinkIcon,
  CheckCircle2, ChevronDown, ChevronUp, Star, Lock, Webhook,
  CreditCard, Clock, TrendingUp, Users, Menu, X, ExternalLink,
  BarChart3, Key, Send, RefreshCw,
} from "lucide-react";
import solvexpayLogo from "../assets/images/solvexpay-logo.png";

const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", currency: "XOF", operators: ["MTN", "Moov"], color: "#00A651" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currency: "XOF", operators: ["MTN", "Orange", "Moov", "Wave"], color: "#F77F00" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", currency: "XOF", operators: ["Moov", "Orange"], color: "#EF233C" },
  { code: "TG", name: "Togo", flag: "🇹🇬", currency: "XOF", operators: ["TMoney", "Moov"], color: "#FFCE00" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", currency: "XOF", operators: ["Orange", "Wave", "Free"], color: "#00853F" },
  { code: "ML", name: "Mali", flag: "🇲🇱", currency: "XOF", operators: ["Orange", "Moov"], color: "#009A44" },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", currency: "XAF", operators: ["MTN", "Orange"], color: "#007A3D" },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"], color: "#007FFF" },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", currency: "XAF", operators: ["Airtel", "MTN"], color: "#009A44" },
];


const FAQS = [
  { q: "Comment fonctionne SolvexPay ?", a: "SolvexPay est une passerelle de paiement Mobile Money pan-africaine. Après inscription, vous créez des liens de paiement ou utilisez notre API pour encaisser via MTN, Orange, Wave, Moov et plus. Tout le flux de paiement est hébergé sur notre plateforme sécurisée." },
  { q: "Quels sont les frais ?", a: "Les frais sont simples et transparents. Consultez la section Tarifs pour les taux exacts en vigueur. Aucun abonnement mensuel, aucun frais caché." },
  { q: "Le KYC est-il obligatoire ?", a: "Le KYC est requis pour débloquer tous les plafonds. Sans KYC vous pouvez tester la plateforme avec des limites réduites. La vérification prend généralement moins de 24h." },
  { q: "Comment intégrer l'API ?", a: "Créez votre compte, accédez à 'Clés API' dans votre tableau de bord. Deux méthodes : redirection directe GET /api/v1/checkout (zéro code JavaScript) ou API JSON POST /api/v1/deposit pour les intégrations serveur." },
  { q: "Quels pays sont couverts ?", a: "9 pays : Bénin, Côte d'Ivoire, Burkina Faso, Togo, Sénégal, Mali, Cameroun, RD Congo, Congo-Brazzaville. Couverture en constante expansion." },
  { q: "Comment recevoir les notifications de paiement ?", a: "Configurez votre URL webhook dans les paramètres de votre clé API. SolvexPay envoie automatiquement une requête POST signée HMAC-SHA256 à chaque changement de statut de transaction." },
];

const LIVE_NOTIFS = [
  { flag: "🇧🇯", op: "MTN", amount: "45 000 XOF", name: "Koffi A.", time: "2s" },
  { flag: "🇨🇮", op: "Wave", amount: "12 500 XOF", name: "Ama K.", time: "8s" },
  { flag: "🇸🇳", op: "Orange", amount: "28 000 XOF", name: "Moussa D.", time: "15s" },
  { flag: "🇨🇲", op: "MTN", amount: "95 000 XAF", name: "Paul N.", time: "22s" },
  { flag: "🇹🇬", op: "TMoney", amount: "8 000 XOF", name: "Akosua F.", time: "31s" },
];

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function AnimatedOrb({ cx, cy, r, color, delay = 0 }: { cx: string; cy: string; r: string; color: string; delay?: number }) {
  return (
    <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.12" style={{ animation: `orbFloat ${3 + delay}s ease-in-out ${delay}s infinite alternate` }} />
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notifIdx, setNotifIdx] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const { data: contactLinks } = useQuery<Record<string, string>>({ queryKey: ["/api/support-links"] });
  const { data: serviceFees } = useQuery<{ deposit: number; withdrawal: number; transfer: number }>({ queryKey: ["/api/service-fees"] });
  const feeDeposit = serviceFees?.deposit ?? 7;
  const feeWithdrawal = serviceFees?.withdrawal ?? 7;
  const feeTransfer = serviceFees?.transfer ?? 7;

  const stat1 = useCountUp(9, 1800, statsVisible);
  const stat2 = useCountUp(10, 2000, statsVisible);
  const stat3 = useCountUp(999, 2200, statsVisible);
  const stat4 = useCountUp(24, 1500, statsVisible);

  useEffect(() => {
    const interval = setInterval(() => setNotifIdx(i => (i + 1) % LIVE_NOTIFS.length), 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const whatsapp = contactLinks?.support_link_whatsapp_direct || "https://wa.me/22891840498";

  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-x-hidden">
      <style>{`
        @keyframes orbFloat { from { transform: translateY(0px) scale(1); } to { transform: translateY(-24px) scale(1.05); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes notifIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes notifOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(20px); } }
        @keyframes pulse-ring { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139,92,246,0.4); } 70% { transform: scale(1); box-shadow: 0 0 0 16px rgba(139,92,246,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(139,92,246,0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes float1 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(3deg); } }
        @keyframes float2 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(-2deg); } }
        @keyframes float3 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-22px); } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dash { to { stroke-dashoffset: -24; } }
        .anim-slide-up { animation: slideUp 0.7s ease both; }
        .anim-slide-up-2 { animation: slideUp 0.7s 0.15s ease both; }
        .anim-slide-up-3 { animation: slideUp 0.7s 0.3s ease both; }
        .anim-slide-up-4 { animation: slideUp 0.7s 0.45s ease both; }
        .shimmer-text { background: linear-gradient(90deg, #a78bfa, #60a5fa, #34d399, #a78bfa); background-size: 300% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 4s linear infinite; }
        .glass-card { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .glow-violet { box-shadow: 0 0 40px rgba(139,92,246,0.25); }
        .glow-emerald { box-shadow: 0 0 40px rgba(52,211,153,0.2); }
        .glow-blue { box-shadow: 0 0 40px rgba(96,165,250,0.2); }
        .feature-card:hover { transform: translateY(-6px); transition: transform 0.3s ease; }
        .feature-card { transition: transform 0.3s ease; }
        .country-btn { transition: all 0.2s ease; }
        .country-btn:hover { transform: scale(1.05); }
        .op-card { transition: all 0.25s ease; }
        .op-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.08); }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: "rgba(5,8,22,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-9 h-9 rounded-xl" />
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">SolvexPay</span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            {[["#fonctionnalites", "Fonctionnalités"], ["#pays", "Pays"], ["#tarifs", "Tarifs"], ["#api", "API"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-medium text-white/60 hover:text-white transition-colors">{label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm font-semibold text-white/70 hover:text-white transition-colors px-4 py-2">Connexion</button>
            </Link>
            <Link href="/register">
              <button className="text-sm font-black px-5 py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                Commencer gratuitement
              </button>
            </Link>
          </div>
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-white/10 py-4 px-4 space-y-3" style={{ background: "rgba(5,8,22,0.97)" }}>
            {[["#fonctionnalites", "Fonctionnalités"], ["#pays", "Pays"], ["#tarifs", "Tarifs"], ["#api", "API"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-white/70 hover:text-white py-2">{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login"><button className="w-full text-sm font-semibold text-white/70 hover:text-white py-2.5 rounded-xl border border-white/10">Connexion</button></Link>
              <Link href="/register"><button className="w-full text-sm font-black py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>Commencer gratuitement</button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(37,99,235,0.14) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(52,211,153,0.1) 0%, transparent 60%)" }} />

        {/* Orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", animation: "float1 8s ease-in-out infinite" }} />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)", animation: "float2 10s ease-in-out infinite" }} />
        <div className="absolute top-1/2 right-1/3 w-40 h-40 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #34d399 0%, transparent 70%)", animation: "float3 7s ease-in-out infinite" }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div className="space-y-8">
              <div className="anim-slide-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Disponible dans 9 pays africains
                </div>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
                  <span className="text-white">Encaissez en</span>{" "}
                  <span className="shimmer-text">Mobile Money</span>{" "}
                  <span className="text-white">partout</span>
                </h1>
              </div>

              <p className="anim-slide-up-2 text-lg text-white/60 leading-relaxed max-w-lg">
                La passerelle de paiement pan-africaine pour les entreprises. MTN, Orange, Wave, Moov, TMoney et 5 autres opérateurs — tout dans une seule intégration.
              </p>

              <div className="anim-slide-up-3 flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <button className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-base shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-violet-500/30" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)", animation: "pulse-ring 3s infinite" }}>
                    Commencer gratuitement
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <a href="#fonctionnalites">
                  <button className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-white/70 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    Voir la démo <ChevronDown className="h-4 w-4" />
                  </button>
                </a>
              </div>

              {/* Trust badges */}
              <div className="anim-slide-up-4 flex flex-wrap gap-4">
                {[
                  { icon: Shield, label: "KYC sécurisé" },
                  { icon: Zap, label: "Paiement instantané" },
                  { icon: Lock, label: "HTTPS & chiffrement" },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-xs text-white/50">
                    <b.icon className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{b.label}</span>
                  </div>
                ))}
              </div>

              {/* Operator logos strip */}
              <div className="anim-slide-up-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/30 font-medium mr-2">Opérateurs :</span>
                {["MTN", "Orange", "Wave", "Moov", "TMoney", "Vodacom", "Airtel"].map((op) => (
                  <div key={op} className="rounded-xl overflow-hidden opacity-80 hover:opacity-100 transition-opacity" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
                    <OperatorLogo operator={op} size={32} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right — animated dashboard card */}
            <div className="relative lg:pl-8">
              {/* Live notification */}
              <div className="absolute -top-6 left-0 right-0 flex justify-center z-20">
                <div key={notifIdx} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399", animation: "notifIn 0.4s ease both" }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span>{LIVE_NOTIFS[notifIdx].flag} {LIVE_NOTIFS[notifIdx].name} — <strong>{LIVE_NOTIFS[notifIdx].amount}</strong> via {LIVE_NOTIFS[notifIdx].op}</span>
                  <span className="text-emerald-400/40">il y a {LIVE_NOTIFS[notifIdx].time}</span>
                </div>
              </div>

              {/* Main card */}
              <div className="rounded-3xl p-6 space-y-5 glow-violet" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(24px)", marginTop: "2rem" }}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/40 font-medium">Tableau de bord</p>
                    <p className="text-2xl font-black text-white mt-0.5">845 250 <span className="text-base font-bold text-white/40">XOF</span></p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>

                {/* Mini chart */}
                <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", height: "80px", padding: "12px" }}>
                  <svg viewBox="0 0 320 56" className="w-full h-full" fill="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 48 L40 38 L80 42 L120 28 L160 32 L200 18 L240 22 L280 10 L320 14" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M0 48 L40 38 L80 42 L120 28 L160 32 L200 18 L240 22 L280 10 L320 14 L320 56 L0 56 Z" fill="url(#chartGrad)" />
                    <circle cx="280" cy="10" r="5" fill="#7c3aed" />
                    <circle cx="280" cy="10" r="9" fill="#7c3aed" fillOpacity="0.2">
                      <animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                </div>

                {/* Transactions */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white/30 uppercase tracking-wider">Dernières transactions</p>
                  {[
                    { op: "MTN", name: "Kofi Asante", amount: "+45 000", flag: "🇧🇯", time: "2 min", pos: true },
                    { op: "Wave", name: "Ama Konan", amount: "+12 500", flag: "🇨🇮", time: "8 min", pos: true },
                    { op: "Orange", name: "Moussa Diallo", amount: "+28 000", flag: "🇸🇳", time: "15 min", pos: true },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="rounded-xl overflow-hidden flex-shrink-0"><OperatorLogo operator={tx.op} size={36} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{tx.name} <span className="text-white/30">{tx.flag}</span></p>
                        <p className="text-[10px] text-white/30">{tx.time}</p>
                      </div>
                      <span className="text-xs font-black text-emerald-400 flex-shrink-0">{tx.amount} <span className="text-[9px] font-medium text-emerald-400/60">XOF</span></span>
                    </div>
                  ))}
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: ArrowRight, label: "Dépôt", color: "#7c3aed" },
                    { icon: LinkIcon, label: "Lien", color: "#2563eb" },
                    { icon: Code2, label: "API", color: "#059669" },
                  ].map((a) => (
                    <div key={a.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity" style={{ background: `rgba(${a.color === "#7c3aed" ? "124,58,237" : a.color === "#2563eb" ? "37,99,235" : "5,150,105"},0.12)`, border: `1px solid ${a.color}28` }}>
                      <a.icon className="h-4 w-4" style={{ color: a.color }} />
                      <span className="text-[10px] font-bold text-white/60">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -right-4 top-20 px-3 py-2 rounded-2xl text-xs font-bold" style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", animation: "float1 5s ease-in-out infinite" }}>
                ✓ Paiement confirmé
              </div>
              <div className="absolute -left-4 bottom-24 px-3 py-2 rounded-2xl text-xs font-bold" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", animation: "float2 6s ease-in-out infinite" }}>
                🔔 USSD envoyé
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20 animate-bounce">
          <ChevronDown className="h-5 w-5" />
        </div>
      </section>

      {/* STATS */}
      <section ref={statsRef} className="py-16 relative" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: stat1, suffix: "+", label: "Pays couverts", icon: Globe, color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
              { value: stat2, suffix: "+", label: "Opérateurs Mobile Money", icon: Smartphone, color: "#2563eb", bg: "rgba(37,99,235,0.1)" },
              { value: `${(stat3 / 10).toFixed(1)}`, suffix: "%", label: "Disponibilité garantie", icon: TrendingUp, color: "#059669", bg: "rgba(5,150,105,0.1)" },
              { value: stat4, suffix: "/7", label: "Support disponible", icon: Clock, color: "#d97706", bg: "rgba(217,119,6,0.1)" },
            ].map((s) => (
              <div key={s.label} className="text-center p-6 rounded-2xl" style={{ background: s.bg, border: `1px solid ${s.color}22` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: `${s.color}22` }}>
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <p className="text-4xl font-black text-white">{s.value}<span className="text-2xl" style={{ color: s.color }}>{s.suffix}</span></p>
                <p className="text-xs text-white/50 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fonctionnalites" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
              Fonctionnalités
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Tout pour encaisser en <span className="shimmer-text">Afrique</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">Trois méthodes d'intégration, zéro complication. Choisissez celle qui convient à votre business.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: LinkIcon,
                title: "Liens de Paiement",
                desc: "Créez un lien personnalisé et partagez-le via WhatsApp, SMS ou email. Aucune intégration requise.",
                color: "#7c3aed",
                gradient: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.05) 100%)",
                border: "rgba(124,58,237,0.2)",
                points: ["Montant fixe ou libre", "QR Code inclus", "Partage instantané"],
                badge: "Le plus populaire",
              },
              {
                icon: Smartphone,
                title: "Mobile Money Direct",
                desc: "Dépôts et retraits vers 10+ opérateurs depuis votre tableau de bord. MTN, Orange, Wave, Moov et plus.",
                color: "#059669",
                gradient: "linear-gradient(135deg, rgba(5,150,105,0.15) 0%, rgba(5,150,105,0.05) 100%)",
                border: "rgba(5,150,105,0.2)",
                points: ["Confirmation USSD", "Vérification temps réel", "Multi-opérateurs"],
                badge: "10+ réseaux",
              },
              {
                icon: Code2,
                title: "API Gateway",
                desc: "Intégrez SolvexPay dans votre application. API RESTful complète avec webhooks HMAC-SHA256.",
                color: "#2563eb",
                gradient: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0.05) 100%)",
                border: "rgba(37,99,235,0.2)",
                points: ["Redirection hébergée", "Webhooks signés", "Documentation complète"],
                badge: "Développeurs",
              },
            ].map((f) => (
              <div key={f.title} className="feature-card rounded-3xl p-7 space-y-5 relative overflow-hidden" style={{ background: f.gradient, border: `1px solid ${f.border}` }}>
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${f.color}20`, color: f.color, border: `1px solid ${f.color}30` }}>{f.badge}</span>
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${f.color}18`, border: `1px solid ${f.color}25` }}>
                  <f.icon className="h-7 w-7" style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white mb-2">{f.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
                <ul className="space-y-2">
                  {f.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-sm text-white/70">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: f.color }} />
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <button className="flex items-center gap-2 text-sm font-bold transition-all hover:gap-3" style={{ color: f.color }}>
                    Démarrer <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 relative" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-3">Démarrez en <span className="shimmer-text">3 minutes</span></h2>
            <p className="text-white/50">Aucune carte bancaire requise. Zéro abonnement mensuel.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4), rgba(37,99,235,0.4), transparent)" }} />
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", icon: Users, title: "Créez votre compte", desc: "Inscription gratuite en 30 secondes avec votre email. Activez votre compte immédiatement.", color: "#7c3aed" },
                { step: "02", icon: Shield, title: "Vérifiez votre identité", desc: "Complétez votre KYC pour débloquer tous les plafonds. Validé en moins de 24h.", color: "#2563eb" },
                { step: "03", icon: Zap, title: "Acceptez vos paiements", desc: "Créez des liens ou intégrez l'API. Vos clients paient instantanément via Mobile Money.", color: "#059669" },
              ].map((s) => (
                <div key={s.step} className="text-center relative">
                  <div className="relative inline-flex">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5" style={{ background: `${s.color}14`, border: `1px solid ${s.color}25` }}>
                      <s.icon className="h-9 w-9" style={{ color: s.color }} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black" style={{ background: s.color, color: "white" }}>{s.step}</div>
                  </div>
                  <h3 className="text-lg font-black text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COUNTRIES & OPERATORS */}
      <section id="pays" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          <div className="grid grid-cols-4 gap-4">
            {COUNTRIES.slice(0, 8).map((c) => (
              <div
                key={c.code}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl text-center"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-5xl">{c.flag}</span>
                <div>
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{c.currency}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <div
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl text-center w-[calc(25%-12px)]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-5xl">{COUNTRIES[8].flag}</span>
              <div>
                <p className="text-sm font-bold text-white">{COUNTRIES[8].name}</p>
                <p className="text-xs text-white/40 mt-0.5">{COUNTRIES[8].currency}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEES */}
      <section id="tarifs" className="py-24 relative" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>
              Tarification
            </div>
            <h2 className="text-4xl font-black text-white">Prix simples, <span className="shimmer-text">transparents</span></h2>
            <p className="text-white/50 mt-3">Aucun abonnement. Aucun frais caché. Vous payez uniquement sur les transactions.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {[
              { type: "Encaissement", icon: ArrowRight, rate: `${feeDeposit}%`, color: "#7c3aed", desc: "Sur chaque dépôt reçu" },
              { type: "Retrait", icon: CreditCard, rate: `${feeWithdrawal}%`, color: "#2563eb", desc: "Sur chaque retrait effectué" },
              { type: "Transfert", icon: Send, rate: `${feeTransfer}%`, color: "#059669", desc: "Mobile Money sortant" },
            ].map((p) => (
              <div key={p.type} className="text-center p-8 rounded-3xl" style={{ background: `${p.color}10`, border: `1px solid ${p.color}22` }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: `${p.color}18` }}>
                  <p.icon className="h-6 w-6" style={{ color: p.color }} />
                </div>
                <p className="text-4xl font-black text-white mb-1">{p.rate}</p>
                <p className="text-sm font-bold text-white/80 mb-1">{p.type}</p>
                <p className="text-xs text-white/40">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-400/80">Aucun abonnement mensuel. Aucun frais caché. Vous payez uniquement sur les transactions réussies, disponible <strong>24/7</strong>.</p>
          </div>
        </div>
      </section>

      {/* API SECTION */}
      <section id="api" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6" style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)", color: "#60a5fa" }}>
                Pour les développeurs
              </div>
              <h2 className="text-4xl font-black text-white mb-4">Intégrez en <span className="shimmer-text">quelques lignes</span></h2>
              <p className="text-white/55 mb-8 leading-relaxed">API RESTful documentée, webhooks HMAC-SHA256, page de paiement hébergée. Deux méthodes d'intégration pour tous les cas d'usage.</p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: Key, title: "Clés API sécurisées", desc: "Format sk_live_xxx. Générées et gérées depuis votre tableau de bord." },
                  { icon: Webhook, title: "Webhooks en temps réel", desc: "Notification POST signée à chaque changement de statut de transaction." },
                  { icon: Shield, title: "Page hébergée SolvexPay", desc: "Aucun formulaire à gérer. Votre client paie directement sur notre page sécurisée." },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.15)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(37,99,235,0.15)" }}>
                      <f.icon className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{f.title}</p>
                      <p className="text-xs text-white/45 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link href="/documentation">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #1d4ed8, #1e40af)" }}>
                    Lire la documentation <ExternalLink className="h-4 w-4" />
                  </button>
                </Link>
                <Link href="/register">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white/70 hover:text-white transition-colors" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    Obtenir une clé API
                  </button>
                </Link>
              </div>
            </div>

            {/* Code block */}
            <div className="rounded-3xl overflow-hidden" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs text-white/30 font-mono">intégration.js</span>
              </div>
              <div className="p-6 font-mono text-sm leading-loose overflow-x-auto">
                <p><span className="text-blue-400">const</span> <span className="text-white">response</span> <span className="text-white/50">=</span> <span className="text-yellow-300">await</span> <span className="text-white">fetch</span><span className="text-white/70">(</span></p>
                <p className="pl-4"><span className="text-emerald-400">'https://solvexpay.com/api/v1/deposit'</span><span className="text-white/70">,</span></p>
                <p className="pl-4"><span className="text-white/70">{"{"}</span></p>
                <p className="pl-8"><span className="text-blue-300">method</span><span className="text-white/50">:</span> <span className="text-emerald-400">'POST'</span><span className="text-white/50">,</span></p>
                <p className="pl-8"><span className="text-blue-300">headers</span><span className="text-white/50">: {"{"}</span></p>
                <p className="pl-12"><span className="text-emerald-400">'Authorization'</span><span className="text-white/50">:</span> <span className="text-yellow-300">`Bearer</span> <span className="text-orange-300">{"${"}process.env.SOLVEXPAY_KEY{"}"}</span><span className="text-yellow-300">`</span><span className="text-white/50">,</span></p>
                <p className="pl-12"><span className="text-emerald-400">'Content-Type'</span><span className="text-white/50">:</span> <span className="text-emerald-400">'application/json'</span></p>
                <p className="pl-8"><span className="text-white/50">{"}"}</span><span className="text-white/50">,</span></p>
                <p className="pl-8"><span className="text-blue-300">body</span><span className="text-white/50">:</span> <span className="text-white">JSON</span><span className="text-white/50">.</span><span className="text-yellow-300">stringify</span><span className="text-white/50">{"({"}</span></p>
                <p className="pl-12"><span className="text-blue-300">amount</span><span className="text-white/50">:</span> <span className="text-orange-300">5000</span><span className="text-white/50">,</span></p>
                <p className="pl-12"><span className="text-blue-300">description</span><span className="text-white/50">:</span> <span className="text-emerald-400">'Commande #1234'</span><span className="text-white/50">,</span></p>
                <p className="pl-12"><span className="text-blue-300">country</span><span className="text-white/50">:</span> <span className="text-emerald-400">'CI'</span></p>
                <p className="pl-8"><span className="text-white/50">{"}),"}</span></p>
                <p className="pl-4"><span className="text-white/70">{"}"}</span></p>
                <p><span className="text-white/70">{")"}</span><span className="text-white/50">;</span></p>
                <p className="mt-2"><span className="text-blue-400">const</span> <span className="text-white">data</span> <span className="text-white/50">=</span> <span className="text-yellow-300">await</span> <span className="text-white">response</span><span className="text-white/50">.</span><span className="text-yellow-300">json</span><span className="text-white/50">();</span></p>
                <p className="mt-2 text-white/30">{"// ✅ Redirigez votre client"}</p>
                <p><span className="text-white">res</span><span className="text-white/50">.</span><span className="text-yellow-300">redirect</span><span className="text-white/50">(</span><span className="text-white">data</span><span className="text-white/50">.</span><span className="text-blue-300">payment_url</span><span className="text-white/50">);</span></p>
              </div>
              <div className="px-6 py-4 border-t border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400/80 font-mono">Réponse : {"{ payment_url: 'https://solvexpay.com/pay-api/...' }"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 relative" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-white">Questions <span className="shimmer-text">fréquentes</span></h2>
            <p className="text-white/50 mt-3">Tout ce que vous devez savoir sur SolvexPay.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${openFaq === i ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)"}`, transition: "border-color 0.2s ease" }}>
                <button
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-violet-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-white/30 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5" style={{ animation: "slideUp 0.25s ease" }}>
                    <p className="text-sm text-white/55 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(124,58,237,0.2) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto mb-8 shadow-2xl" style={{ animation: "pulse-ring 3s infinite" }}>
            <img src={solvexpayLogo} alt="SolvexPay" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-white mb-5 leading-tight">
            Prêt à accepter des <span className="shimmer-text">paiements</span> ?
          </h2>
          <p className="text-white/55 text-lg mb-10">Rejoignez les marchands qui font confiance à SolvexPay pour encaisser en Mobile Money partout en Afrique.</p>
          <div className="flex justify-center">
            <Link href="/register">
              <button className="group flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-white font-black text-base shadow-2xl hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)" }}>
                Créer mon compte gratuitement
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
          <p className="text-xs text-white/25 mt-6">Inscription gratuite · Aucune carte bancaire requise · KYC en moins de 24h</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "rgba(0,0,0,0.5)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <img src={solvexpayLogo} alt="SolvexPay" className="w-9 h-9 rounded-xl" />
                <span className="font-black text-xl bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">SolvexPay</span>
              </div>
              <p className="text-sm text-white/40 leading-relaxed">La passerelle de paiement Mobile Money pour l'Afrique. Simple, sécurisée, instantanée.</p>
              <div className="flex gap-2">
                {["🇧🇯","🇨🇮","🇸🇳","🇨🇲","🇨🇩"].map(f => <span key={f} className="text-lg">{f}</span>)}
                <span className="text-white/30 text-sm self-center">+4</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-4">Produit</p>
              <ul className="space-y-3">
                {[["#fonctionnalites", "Fonctionnalités"], ["#pays", "Couverture"], ["#tarifs", "Tarifs"], ["/documentation", "Documentation API"]].map(([href, label]) => (
                  <li key={href}><a href={href} className="text-sm text-white/50 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-4">Compte</p>
              <ul className="space-y-3">
                {[["/register", "Inscription"], ["/login", "Connexion"], ["/dashboard", "Tableau de bord"], ["/documentation", "Clés API"]].map(([href, label]) => (
                  <li key={label}><Link href={href}><span className="text-sm text-white/50 hover:text-white transition-colors cursor-pointer">{label}</span></Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/30 mb-4">Support</p>
              <ul className="space-y-3">
                {[
                  [contactLinks?.support_link_whatsapp_direct || "#", "WhatsApp Support"],
                  [contactLinks?.support_link_email || "mailto:support@solvexpay.com", "Email"],
                  [contactLinks?.support_link_whatsapp_group || "#", "Groupe WhatsApp"],
                  [contactLinks?.support_link_facebook || "#", "Facebook"],
                ].map(([href, label]) => (
                  <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex justify-center">
            <p className="text-xs text-white/25">© 2026 SolvexPay. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
