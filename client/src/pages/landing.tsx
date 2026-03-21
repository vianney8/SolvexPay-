import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { OperatorLogo } from "@/components/operator-logo";
import {
  ArrowRight, Shield, Zap, Globe, Smartphone, Code2, LinkIcon,
  CheckCircle2, ChevronDown, ChevronUp, Lock, Webhook,
  CreditCard, Clock, TrendingUp, Users, Menu, X, ExternalLink,
  Key, Send,
} from "lucide-react";
import solvexpayLogo from "../assets/images/solvexpay-logo.png";

const ALL_COUNTRIES = [
  { iso: "BJ",  flag: "🇧🇯", name: "Bénin" },
  { iso: "CI",  flag: "🇨🇮", name: "Côte d'Ivoire" },
  { iso: "SN",  flag: "🇸🇳", name: "Sénégal" },
  { iso: "CM",  flag: "🇨🇲", name: "Cameroun" },
  { iso: "COD", flag: "🇨🇩", name: "RD Congo" },
  { iso: "BF",  flag: "🇧🇫", name: "Burkina Faso" },
  { iso: "TG",  flag: "🇹🇬", name: "Togo" },
  { iso: "ML",  flag: "🇲🇱", name: "Mali" },
  { iso: "COG", flag: "🇨🇬", name: "Congo-Brazzaville" },
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

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notifIdx, setNotifIdx] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const { data: contactLinks } = useQuery<Record<string, string>>({ queryKey: ["/api/support-links"] });
  const { data: serviceFees } = useQuery<{ deposit: number; withdrawal: number; transfer: number }>({ queryKey: ["/api/service-fees"] });
  const { data: suspendedData } = useQuery<{ codes: string[] }>({
    queryKey: ["/api/public/suspended-countries"],
    queryFn: async () => { const r = await fetch("/api/public/suspended-countries"); return r.json(); },
    staleTime: 60_000,
  });
  const suspendedCodes = suspendedData?.codes || [];
  const activeCountries = ALL_COUNTRIES.filter(c => !suspendedCodes.includes(c.iso));
  const activeCount = activeCountries.length;

  const feeDeposit = serviceFees?.deposit ?? 7;
  const feeWithdrawal = serviceFees?.withdrawal ?? 7;
  const feeTransfer = serviceFees?.transfer ?? 7;

  const stat1 = useCountUp(activeCount, 1800, statsVisible);
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

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes notifIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
        @keyframes float2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.3); } 50% { box-shadow: 0 0 0 12px rgba(124,58,237,0); } }
        .anim-up { animation: slideUp 0.65s ease both; }
        .anim-up-2 { animation: slideUp 0.65s 0.12s ease both; }
        .anim-up-3 { animation: slideUp 0.65s 0.24s ease both; }
        .anim-up-4 { animation: slideUp 0.65s 0.36s ease both; }
        .shimmer-text { background: linear-gradient(90deg, #7c3aed, #2563eb, #059669, #7c3aed); background-size: 300% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: shimmer 4s linear infinite; }
        .feature-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .feature-card:hover { transform: translateY(-5px); }
        .faq-item { transition: background 0.2s ease; }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-gray-100" style={{ backdropFilter: "blur(20px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-9 h-9 rounded-xl shadow-sm" />
            <span className="font-black text-xl tracking-tight" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SolvexPay</span>
          </a>
          <div className="hidden md:flex items-center gap-7">
            {[["#fonctionnalites", "Fonctionnalités"], ["#tarifs", "Tarifs"], ["#api", "API"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">{label}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-xl hover:bg-gray-50">Connexion</button>
            </Link>
            <Link href="/register">
              <button className="text-sm font-black px-5 py-2.5 rounded-xl text-white shadow-lg transition-all hover:scale-105" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                Commencer gratuitement
              </button>
            </Link>
          </div>
          <button className="md:hidden text-gray-500 hover:text-gray-900 p-1" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileMenu && (
          <div className="md:hidden border-t border-gray-100 py-4 px-4 space-y-2 bg-white">
            {[["#fonctionnalites", "Fonctionnalités"], ["#tarifs", "Tarifs"], ["#api", "API"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenu(false)} className="block text-sm font-semibold text-gray-600 hover:text-gray-900 py-2.5 px-3 rounded-xl hover:bg-gray-50">{label}</a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-2">
              <Link href="/login"><button className="w-full text-sm font-semibold text-gray-600 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50">Connexion</button></Link>
              <Link href="/register"><button className="w-full text-sm font-black py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>Commencer gratuitement</button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative pt-16 overflow-hidden" style={{ background: "linear-gradient(160deg, #faf5ff 0%, #eff6ff 40%, #f0fdf4 100%)" }}>
        {/* Blobs décoratifs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle, #ddd6fe 0%, transparent 70%)", animation: "float1 9s ease-in-out infinite" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle, #bfdbfe 0%, transparent 70%)", animation: "float2 11s ease-in-out infinite" }} />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full opacity-15 pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ background: "radial-gradient(circle, #bbf7d0 0%, transparent 70%)", animation: "float1 7s ease-in-out infinite 1s" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Gauche */}
            <div className="space-y-7">
              <div className="anim-up">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeCount} pays africain{activeCount > 1 ? "s" : ""} couvert{activeCount > 1 ? "s" : ""}
                </span>
                <h1 className="text-5xl sm:text-6xl lg:text-[64px] font-black leading-[1.05] tracking-tight text-gray-900">
                  Encaissez en<br />
                  <span className="shimmer-text">Mobile Money</span><br />
                  <span className="text-gray-900">en Afrique</span>
                </h1>
              </div>

              <p className="anim-up-2 text-lg text-gray-500 leading-relaxed max-w-lg">
                La passerelle de paiement pan-africaine pour les entreprises. MTN, Orange, Wave, Moov et 7 autres opérateurs — tout dans une seule intégration simple.
              </p>

              <div className="anim-up-3 flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <button className="group flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-base shadow-xl transition-all hover:scale-105 hover:shadow-violet-300" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", animation: "pulse-glow 3s infinite" }}>
                    Commencer gratuitement
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <a href="#fonctionnalites">
                  <button className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm">
                    Voir les fonctionnalités <ChevronDown className="h-4 w-4" />
                  </button>
                </a>
              </div>

              <div className="anim-up-4 flex flex-wrap gap-5">
                {[{ icon: Shield, label: "KYC sécurisé" }, { icon: Zap, label: "Instantané 24/7" }, { icon: Lock, label: "Chiffrement SSL" }].map((b) => (
                  <div key={b.label} className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                    <b.icon className="h-4 w-4 text-violet-500" />
                    {b.label}
                  </div>
                ))}
              </div>

              <div className="anim-up-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-semibold mr-1">Opérateurs :</span>
                {["MTN", "Orange", "Wave", "Moov", "TMoney", "Vodacom", "Airtel"].map((op) => (
                  <div key={op} className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                    <OperatorLogo operator={op} size={30} />
                  </div>
                ))}
              </div>
            </div>

            {/* Droite — carte dashboard */}
            <div className="relative">
              {/* Notification live */}
              <div className="absolute -top-5 left-0 right-0 flex justify-center z-20">
                <div key={notifIdx} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-lg" style={{ background: "white", border: "1px solid #d1fae5", color: "#065f46", animation: "notifIn 0.4s ease both" }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  {LIVE_NOTIFS[notifIdx].flag} {LIVE_NOTIFS[notifIdx].name} — <strong>{LIVE_NOTIFS[notifIdx].amount}</strong> via {LIVE_NOTIFS[notifIdx].op}
                  <span className="text-gray-300 ml-1">· il y a {LIVE_NOTIFS[notifIdx].time}</span>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-5 mt-8 border border-gray-100" style={{ boxShadow: "0 20px 60px rgba(124,58,237,0.12), 0 4px 20px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Solde disponible</p>
                    <p className="text-3xl font-black text-gray-900 mt-0.5">845 250 <span className="text-lg font-bold text-gray-400">XOF</span></p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Mini chart */}
                <div className="rounded-2xl p-3 bg-violet-50 border border-violet-100">
                  <svg viewBox="0 0 320 56" className="w-full h-14" fill="none">
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0 48 L40 38 L80 42 L120 28 L160 32 L200 18 L240 22 L280 10 L320 14" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M0 48 L40 38 L80 42 L120 28 L160 32 L200 18 L240 22 L280 10 L320 14 L320 56 L0 56 Z" fill="url(#cg)" />
                    <circle cx="280" cy="10" r="4" fill="#7c3aed" />
                    <circle cx="280" cy="10" r="8" fill="#7c3aed" fillOpacity="0.2">
                      <animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </svg>
                </div>

                {/* Transactions */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Dernières transactions</p>
                  {[
                    { op: "MTN", name: "Kofi Asante", amount: "+45 000", flag: "🇧🇯" },
                    { op: "Wave", name: "Ama Konan", amount: "+12 500", flag: "🇨🇮" },
                    { op: "Orange", name: "Moussa Diallo", amount: "+28 000", flag: "🇸🇳" },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="rounded-xl overflow-hidden flex-shrink-0"><OperatorLogo operator={tx.op} size={34} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{tx.name} <span className="text-gray-400">{tx.flag}</span></p>
                      </div>
                      <span className="text-xs font-black text-emerald-600">{tx.amount} <span className="text-[9px] font-medium text-gray-400">XOF</span></span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Dépôt", color: "#7c3aed", bg: "#f5f3ff", icon: ArrowRight },
                    { label: "Lien paiement", color: "#2563eb", bg: "#eff6ff", icon: LinkIcon },
                    { label: "API", color: "#059669", bg: "#f0fdf4", icon: Code2 },
                  ].map((a) => (
                    <div key={a.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl cursor-pointer hover:opacity-80 transition-opacity border" style={{ background: a.bg, borderColor: a.color + "22" }}>
                      <a.icon className="h-4 w-4" style={{ color: a.color }} />
                      <span className="text-[10px] font-bold text-gray-500">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Badges flottants */}
              <div className="absolute -right-4 top-20 px-3 py-2 rounded-2xl text-xs font-bold shadow-lg" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", animation: "float1 5s ease-in-out infinite" }}>
                ✓ Paiement confirmé
              </div>
              <div className="absolute -left-4 bottom-24 px-3 py-2 rounded-2xl text-xs font-bold shadow-lg" style={{ background: "#fefce8", border: "1px solid #fde68a", color: "#92400e", animation: "float2 6s ease-in-out infinite" }}>
                🔔 USSD envoyé
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-gray-300 animate-bounce">
          <ChevronDown className="h-5 w-5" />
        </div>
      </section>

      {/* STATS */}
      <section ref={statsRef} className="py-14 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: stat1, suffix: "+", label: "Pays couverts", icon: Globe, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
              { value: stat2, suffix: "+", label: "Opérateurs Mobile Money", icon: Smartphone, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
              { value: `${(stat3 / 10).toFixed(1)}`, suffix: "%", label: "Disponibilité garantie", icon: TrendingUp, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
              { value: stat4, suffix: "/7", label: "Support disponible", icon: Clock, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
            ].map((s) => (
              <div key={s.label} className="rounded-3xl p-6 text-center border" style={{ background: s.bg, borderColor: s.border }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "white", boxShadow: `0 2px 12px ${s.color}22` }}>
                  <s.icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <p className="text-4xl font-black text-gray-900">{s.value}<span className="text-2xl" style={{ color: s.color }}>{s.suffix}</span></p>
                <p className="text-xs text-gray-500 mt-1 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="fonctionnalites" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200 mb-4">Fonctionnalités</span>
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900">Tout pour encaisser en <span className="shimmer-text">Afrique</span></h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Trois méthodes d'intégration, zéro complication.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: LinkIcon, title: "Liens de Paiement", badge: "Le plus populaire",
                desc: "Créez un lien personnalisé et partagez-le via WhatsApp, SMS ou email. Aucune intégration requise.",
                points: ["Montant fixe ou libre", "QR Code inclus", "Partage instantané"],
                color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", btnBg: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              },
              {
                icon: Smartphone, title: "Mobile Money Direct", badge: "10+ réseaux",
                desc: "Dépôts et retraits vers 10+ opérateurs depuis votre tableau de bord. Confirmation USSD instantanée.",
                points: ["Confirmation USSD", "Vérification temps réel", "Multi-opérateurs"],
                color: "#059669", bg: "#f0fdf4", border: "#bbf7d0", btnBg: "linear-gradient(135deg,#059669,#047857)",
              },
              {
                icon: Code2, title: "API Gateway", badge: "Développeurs",
                desc: "Intégrez SolvexPay dans votre application. API RESTful complète avec webhooks HMAC-SHA256.",
                points: ["Page hébergée sécurisée", "Webhooks signés", "Documentation complète"],
                color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", btnBg: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              },
            ].map((f) => (
              <div key={f.title} className="feature-card rounded-3xl p-7 space-y-5 border relative" style={{ background: f.bg, borderColor: f.border, boxShadow: `0 4px 24px ${f.color}10` }}>
                <span className="absolute top-5 right-5 text-[10px] font-black px-2.5 py-1 rounded-full" style={{ background: f.color + "18", color: f.color, border: `1px solid ${f.color}30` }}>{f.badge}</span>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: "white" }}>
                  <f.icon className="h-7 w-7" style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
                <ul className="space-y-2">
                  {f.points.map((pt) => (
                    <li key={pt} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: f.color }} />
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <button className="flex items-center gap-2 text-sm font-black text-white px-4 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity" style={{ background: f.btnBg }}>
                    Démarrer <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24" style={{ background: "linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-gray-900">Démarrez en <span className="shimmer-text">3 minutes</span></h2>
            <p className="text-gray-500 mt-3">Aucune carte bancaire requise.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5" style={{ background: "linear-gradient(90deg, transparent, #ddd6fe, #bfdbfe, transparent)" }} />
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", icon: Users, title: "Créez votre compte", desc: "Inscription gratuite en 30 secondes avec votre email. Activation immédiate.", color: "#7c3aed", bg: "#f5f3ff" },
                { step: "02", icon: Shield, title: "Vérifiez votre identité", desc: "Complétez votre KYC pour débloquer tous les plafonds. Validé en moins de 24h.", color: "#2563eb", bg: "#eff6ff" },
                { step: "03", icon: Zap, title: "Acceptez vos paiements", desc: "Créez des liens ou intégrez l'API. Recevez instantanément via Mobile Money.", color: "#059669", bg: "#f0fdf4" },
              ].map((s) => (
                <div key={s.step} className="text-center relative">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm border" style={{ background: s.bg, borderColor: s.color + "30" }}>
                      <s.icon className="h-9 w-9" style={{ color: s.color }} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow" style={{ background: s.color }}>{s.step}</div>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEES */}
      <section id="tarifs" className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 mb-4">Tarification</span>
            <h2 className="text-4xl font-black text-gray-900">Prix simples, <span className="shimmer-text">transparents</span></h2>
            <p className="text-gray-500 mt-3">Aucun abonnement. Aucun frais caché. Vous payez uniquement sur les transactions réussies.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 mb-6">
            {[
              { type: "Encaissement", icon: ArrowRight, rate: `${feeDeposit}%`, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", desc: "Sur chaque dépôt reçu" },
              { type: "Retrait", icon: CreditCard, rate: `${feeWithdrawal}%`, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", desc: "Sur chaque retrait effectué" },
              { type: "Transfert", icon: Send, rate: `${feeTransfer}%`, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0", desc: "Mobile Money sortant" },
            ].map((p) => (
              <div key={p.type} className="text-center p-8 rounded-3xl border" style={{ background: p.bg, borderColor: p.border }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-white shadow-sm">
                  <p.icon className="h-6 w-6" style={{ color: p.color }} />
                </div>
                <p className="text-5xl font-black text-gray-900 mb-1">{p.rate}</p>
                <p className="text-sm font-bold text-gray-700 mb-1">{p.type}</p>
                <p className="text-xs text-gray-400">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4 flex items-start gap-3 bg-amber-50 border border-amber-100">
            <Zap className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">Aucun abonnement mensuel. Vous payez uniquement sur les transactions réussies, disponible <strong>24/7</strong>.</p>
          </div>
        </div>
      </section>

      {/* API */}
      <section id="api" className="py-24" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 mb-6">Pour les développeurs</span>
              <h2 className="text-4xl font-black text-gray-900 mb-4">Intégrez en <span className="shimmer-text">quelques lignes</span></h2>
              <p className="text-gray-500 mb-8 leading-relaxed">API RESTful documentée, webhooks HMAC-SHA256, page de paiement hébergée. Deux méthodes pour tous les cas d'usage.</p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: Key, title: "Clés API sécurisées", desc: "Format sk_live_xxx. Générées depuis votre tableau de bord.", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                  { icon: Webhook, title: "Webhooks en temps réel", desc: "Notification POST signée à chaque changement de statut.", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
                  { icon: Shield, title: "Page hébergée SolvexPay", desc: "Aucun formulaire à gérer. Votre client paie sur notre page sécurisée.", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: f.bg, borderColor: f.border }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
                      <f.icon className="h-4 w-4" style={{ color: f.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Link href="/documentation">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black text-white shadow-lg hover:opacity-90 transition-opacity" style={{ background: "linear-gradient(135deg, #1d4ed8, #1e40af)" }}>
                    Documentation <ExternalLink className="h-4 w-4" />
                  </button>
                </Link>
                <Link href="/register">
                  <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm">
                    Obtenir une clé API
                  </button>
                </Link>
              </div>
            </div>

            {/* Code block */}
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-200" style={{ background: "#1e1e2e" }}>
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-white/30 font-mono">intégration.js</span>
              </div>
              <div className="p-6 font-mono text-sm leading-loose overflow-x-auto">
                <p><span className="text-blue-400">const</span> <span className="text-white">response</span> <span className="text-gray-500">=</span> <span className="text-yellow-300">await</span> <span className="text-white">fetch</span><span className="text-gray-400">(</span></p>
                <p className="pl-4"><span className="text-emerald-400">'https://solvexpay.com/api/v1/deposit'</span><span className="text-gray-400">,</span></p>
                <p className="pl-4"><span className="text-gray-400">{"{"}</span></p>
                <p className="pl-8"><span className="text-blue-300">method</span><span className="text-gray-500">:</span> <span className="text-emerald-400">'POST'</span><span className="text-gray-500">,</span></p>
                <p className="pl-8"><span className="text-blue-300">headers</span><span className="text-gray-500">:</span> <span className="text-gray-400">{"{"}</span> <span className="text-emerald-400">'Authorization'</span><span className="text-gray-500">:</span> <span className="text-yellow-300">`Bearer ${"{"}apiKey{"}"}`</span> <span className="text-gray-400">{"}"}</span><span className="text-gray-500">,</span></p>
                <p className="pl-8"><span className="text-blue-300">body</span><span className="text-gray-500">:</span> <span className="text-white">JSON</span><span className="text-gray-500">.</span><span className="text-yellow-300">stringify</span><span className="text-gray-500">{"({"}</span></p>
                <p className="pl-12"><span className="text-blue-300">amount</span><span className="text-gray-500">:</span> <span className="text-orange-300">5000</span><span className="text-gray-500">,</span></p>
                <p className="pl-12"><span className="text-blue-300">description</span><span className="text-gray-500">:</span> <span className="text-emerald-400">'Commande #1234'</span><span className="text-gray-500">,</span></p>
                <p className="pl-12"><span className="text-blue-300">country</span><span className="text-gray-500">:</span> <span className="text-emerald-400">'CI'</span></p>
                <p className="pl-8"><span className="text-gray-500">{"}),"}</span></p>
                <p className="pl-4"><span className="text-gray-400">{"}"}</span></p>
                <p><span className="text-gray-400">{")"}</span><span className="text-gray-500">;</span></p>
                <p className="mt-2 text-gray-500">{"// ✅ Redirigez votre client"}</p>
                <p><span className="text-white">res</span><span className="text-gray-500">.</span><span className="text-yellow-300">redirect</span><span className="text-gray-500">(</span><span className="text-white">data</span><span className="text-gray-500">.</span><span className="text-blue-300">payment_url</span><span className="text-gray-500">);</span></p>
              </div>
              <div className="px-6 py-3 border-t border-white/10 flex items-center gap-2 bg-emerald-900/30">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400/80 font-mono">{"{ payment_url: 'https://solvexpay.com/pay-api/...' }"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black text-gray-900">Questions <span className="shimmer-text">fréquentes</span></h2>
            <p className="text-gray-500 mt-3">Tout ce que vous devez savoir sur SolvexPay.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="faq-item rounded-2xl overflow-hidden border" style={{ borderColor: openFaq === i ? "#c4b5fd" : "#f3f4f6", background: openFaq === i ? "#faf5ff" : "white" }}>
                <button
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-bold text-gray-900">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-violet-500 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-300 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5" style={{ animation: "slideUp 0.2s ease" }}>
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-28 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 60%, #059669 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, white 0%, transparent 40%)" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-20 h-20 rounded-3xl overflow-hidden mx-auto mb-8 shadow-2xl border-4 border-white/30">
            <img src={solvexpayLogo} alt="SolvexPay" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-5xl sm:text-6xl font-black text-white mb-5 leading-tight">
            Prêt à accepter des paiements ?
          </h2>
          <p className="text-white/75 text-lg mb-10">Rejoignez les marchands qui font confiance à SolvexPay pour encaisser en Mobile Money partout en Afrique.</p>
          <Link href="/register">
            <button className="group flex items-center justify-center gap-3 mx-auto px-10 py-5 rounded-2xl font-black text-base bg-white hover:bg-gray-50 transition-all shadow-2xl hover:scale-105" style={{ color: "#7c3aed" }}>
              Créer mon compte gratuitement
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <p className="text-white/40 text-xs mt-6">Inscription gratuite · Aucune carte bancaire · KYC en moins de 24h</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <img src={solvexpayLogo} alt="SolvexPay" className="w-9 h-9 rounded-xl" />
                <span className="font-black text-xl" style={{ background: "linear-gradient(135deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SolvexPay</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">La passerelle de paiement Mobile Money pour l'Afrique. Simple, sécurisée, instantanée.</p>
              <div className="flex gap-1.5 flex-wrap">
                {activeCountries.map(c => <span key={c.iso} className="text-base">{c.flag}</span>)}
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4">Produit</p>
              <ul className="space-y-3">
                {[["#fonctionnalites", "Fonctionnalités"], ["#tarifs", "Tarifs"], ["#api", "API"], ["/documentation", "Documentation"]].map(([href, label]) => (
                  <li key={href}><a href={href} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4">Compte</p>
              <ul className="space-y-3">
                {[["/register", "Inscription"], ["/login", "Connexion"], ["/dashboard", "Tableau de bord"], ["/documentation", "Clés API"]].map(([href, label]) => (
                  <li key={label}><Link href={href}><span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">{label}</span></Link></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-500 mb-4">Support</p>
              <ul className="space-y-3">
                {[
                  { key: "support_link_whatsapp_direct", defaultLabel: "Telegram Support", defaultHref: "#" },
                  { key: "support_link_email", defaultLabel: "Email", defaultHref: "mailto:support@solvexpay.com" },
                  { key: "support_link_facebook", defaultLabel: "Facebook", defaultHref: "#" },
                ].filter(({ key }) => !contactLinks || contactLinks[`${key}_visible`] !== "0").map(({ key, defaultLabel, defaultHref }) => (
                  <li key={key}><a href={contactLinks?.[key] || defaultHref} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors">{contactLinks?.[`${key}_label`] || defaultLabel}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex justify-center">
            <p className="text-xs text-gray-600">© 2026 SolvexPay. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
