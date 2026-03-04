import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperatorLogo } from "@/components/operator-logo";
import {
  CheckCircle2,
  ChevronRight,
  LinkIcon,
  Smartphone,
  Code2,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Users,
  Lock,
  Webhook,
  BarChart3,
  Clock,
  ChevronDown,
  BookOpen,
  Mail,
  Star,
  CreditCard,
  RefreshCw,
  Key,
  MessageCircle,
  ExternalLink,
  Send,
} from "lucide-react";

import solvexpayLogo from "../assets/images/solvexpay-logo.png";
import depositScreenshot from "@assets/Screenshot_20260304-051537_1772597828247.png";

const ALL_COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", prefix: "+229", currency: "XOF", operators: ["MTN", "Moov"], color: "from-green-500 to-emerald-600",
    fees: [{ op: "MTN", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Moov", deposit: "5%", withdraw: "7%", min: "100 XOF" }] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", prefix: "+225", currency: "XOF", operators: ["MTN", "Orange", "Moov", "Wave"], color: "from-orange-500 to-amber-600",
    fees: [{ op: "MTN", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Orange", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Wave", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Moov", deposit: "5%", withdraw: "7%", min: "100 XOF" }] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", prefix: "+226", currency: "XOF", operators: ["Moov", "Orange"], color: "from-red-500 to-rose-600",
    fees: [{ op: "Moov", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Orange", deposit: "5%", withdraw: "7%", min: "100 XOF" }] },
  { code: "TG", name: "Togo", flag: "🇹🇬", prefix: "+228", currency: "XOF", operators: ["TMoney", "Moov"], color: "from-yellow-500 to-orange-500",
    fees: [{ op: "TMoney", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Moov", deposit: "5%", withdraw: "7%", min: "100 XOF" }] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", prefix: "+221", currency: "XOF", operators: ["Orange", "Wave", "Free"], color: "from-green-600 to-teal-600",
    fees: [{ op: "Orange", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Wave", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Free", deposit: "5%", withdraw: "7%", min: "100 XOF" }] },
  { code: "ML", name: "Mali", flag: "🇲🇱", prefix: "+223", currency: "XOF", operators: ["Orange", "Moov"], color: "from-green-700 to-emerald-700",
    fees: [{ op: "Orange", deposit: "5%", withdraw: "7%", min: "100 XOF" }, { op: "Moov", deposit: "5%", withdraw: "7%", min: "100 XOF" }] },
  { code: "CM", name: "Cameroun", flag: "🇨🇲", prefix: "+237", currency: "XAF", operators: ["MTN", "Orange"], color: "from-yellow-600 to-green-600",
    fees: [{ op: "MTN", deposit: "5%", withdraw: "7%", min: "100 XAF" }, { op: "Orange", deposit: "5%", withdraw: "7%", min: "100 XAF" }] },
  { code: "COD", name: "RD Congo", flag: "🇨🇩", prefix: "+243", currency: "CDF", operators: ["Vodacom", "Airtel", "Orange"], color: "from-sky-500 to-blue-600",
    fees: [{ op: "Vodacom", deposit: "5%", withdraw: "7%", min: "100 CDF" }, { op: "Airtel", deposit: "5%", withdraw: "7%", min: "100 CDF" }, { op: "Orange", deposit: "5%", withdraw: "7%", min: "100 CDF" }] },
  { code: "COG", name: "Congo-Brazza.", flag: "🇨🇬", prefix: "+242", currency: "XAF", operators: ["Airtel", "MTN"], color: "from-green-600 to-red-600",
    fees: [{ op: "Airtel", deposit: "5%", withdraw: "7%", min: "100 XAF" }, { op: "MTN", deposit: "5%", withdraw: "7%", min: "100 XAF" }] },
];

const ALL_OPERATORS = [
  { key: "MTN", label: "MTN Money" },
  { key: "Orange", label: "Orange Money" },
  { key: "Wave", label: "Wave" },
  { key: "Moov", label: "Moov Money" },
  { key: "TMoney", label: "T-Money" },
  { key: "Airtel", label: "Airtel Money" },
  { key: "Vodacom", label: "M-Pesa" },
  { key: "Free", label: "Free Money" },
];

const features = [
  {
    icon: LinkIcon,
    title: "Liens de Paiement",
    description: "Créez des liens personnalisés partageables via WhatsApp, SMS ou email. Recevez vos paiements en quelques secondes.",
    color: "from-violet-500 via-purple-500 to-indigo-600",
    badge: "Le plus populaire",
    points: ["Liens sans expiration", "Montant fixe ou libre", "QR Code inclus"],
  },
  {
    icon: Smartphone,
    title: "Mobile Money",
    description: "10+ opérateurs dans 9 pays. Dépôts et retraits instantanés pour MTN, Orange, Wave, Moov, TMoney et plus.",
    color: "from-emerald-500 via-teal-500 to-cyan-600",
    badge: "10+ réseaux",
    points: ["Confirmation en temps réel", "Webhooks automatiques", "Multi-pays"],
  },
  {
    icon: Code2,
    title: "API Gateway",
    description: "Intégrez SolvexPay dans votre application en quelques lignes. API RESTful documentée avec webhooks en temps réel.",
    color: "from-amber-500 via-orange-500 to-red-500",
    badge: "Développeurs",
    points: ["Clés API sécurisées", "Documentation complète", "Support technique"],
  },
];

const steps = [
  { icon: Users, title: "Créez votre compte", desc: "Inscription gratuite en 30 secondes. Aucune carte bancaire requise.", color: "from-violet-500 to-purple-600" },
  { icon: Shield, title: "Vérifiez votre identité", desc: "Complétez votre KYC pour débloquer tous les plafonds et fonctionnalités.", color: "from-emerald-500 to-teal-600" },
  { icon: Zap, title: "Acceptez des paiements", desc: "Créez vos liens ou intégrez l'API. Commencez à recevoir instantanément.", color: "from-amber-500 to-orange-600" },
];

const stats = [
  { value: "9", suffix: "+", label: "Pays couverts", icon: Globe, color: "text-violet-600", bg: "bg-violet-50" },
  { value: "10", suffix: "+", label: "Opérateurs Mobile Money", icon: Smartphone, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "99.9", suffix: "%", label: "Disponibilité garantie", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "24", suffix: "/7", label: "Support disponible", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
];

const faqs = [
  { q: "Comment fonctionne SolvexPay ?", a: "SolvexPay est une passerelle de paiement Mobile Money pan-africaine. Après inscription, vous pouvez créer des liens de paiement ou utiliser notre API pour accepter des paiements MTN, Orange, Wave, Moov et bien d'autres." },
  { q: "Quels sont les frais de transaction ?", a: "Les frais sont simples et uniformes pour tous les pays : encaissement (dépôt) à 5%, retrait à 7%, transfert Mobile Money à 6%. Le minimum de transaction est de 100 XOF/XAF/CDF selon le pays." },
  { q: "Est-ce que je dois vérifier mon identité (KYC) ?", a: "Le KYC est requis pour augmenter les plafonds de transaction. Sans KYC, vous pouvez tester la plateforme avec des plafonds réduits. La vérification prend généralement moins de 24h." },
  { q: "Comment intégrer l'API dans mon application ?", a: "Après connexion, accédez à 'Clés API' dans votre tableau de bord. Vous y trouverez vos clés et la documentation complète pour intégrer SolvexPay." },
  { q: "Quels pays sont supportés ?", a: "SolvexPay couvre actuellement 9 pays : Bénin, Côte d'Ivoire, Burkina Faso, Togo, Sénégal, Mali, Cameroun, RD Congo et Congo-Brazzaville." },
];

function AnimatedCounter({ target, suffix }: { target: string; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const num = parseFloat(target);
        const steps = 40;
        const increment = num / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= num) { current = num; clearInterval(timer); }
          setCount(current);
        }, 1500 / steps);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  const display = parseFloat(target) % 1 !== 0 ? count.toFixed(1) : Math.round(count).toString();
  return <span ref={ref} className="tabular-nums">{display}{suffix}</span>;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/60 rounded-2xl overflow-hidden hover:border-violet-200 transition-colors">
      <button className="w-full flex items-center justify-between px-6 py-5 text-left bg-card hover:bg-muted/30 transition-colors" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-foreground pr-4">{q}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
        <p className="px-6 pb-5 text-muted-foreground leading-relaxed text-sm">{a}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activeCountry, setActiveCountry] = useState(0);
  const operatorsDoubled = [...ALL_OPERATORS, ...ALL_OPERATORS];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/85 border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-violet-500/25 blur-sm" />
                <img src={solvexpayLogo} alt="SolvexPay" className="relative w-8 h-8 rounded-xl object-cover ring-1 ring-violet-400/40" />
              </div>
              <span className="font-extrabold text-xl bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent" data-testid="text-logo">SolvexPay</span>
            </div>
            <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
              <a href="#tarifs" className="hover:text-foreground transition-colors">Tarifs</a>
              <a href="#pays" className="hover:text-foreground transition-colors">Pays</a>
              <a href="#support" className="hover:text-foreground transition-colors">Support</a>
              <a href="https://docs.solvexpay.site" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> Documentation
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <Link href="/login" data-testid="link-login">
                <Button variant="ghost" size="sm" className="font-semibold hidden sm:inline-flex" data-testid="button-login">Se connecter</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="font-bold shadow-lg shadow-violet-500/25 animate-glow-pulse" data-testid="button-register-nav">Commencer gratuitement</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden hero-mesh">
        <div className="absolute top-16 left-1/4 w-[500px] h-[500px] rounded-full bg-violet-500/6 blur-[80px] pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/6 blur-[80px] pointer-events-none" />
        <div className="absolute top-28 left-[8%] w-3 h-3 rounded-full bg-violet-400/40 animate-float pointer-events-none" />
        <div className="absolute top-48 right-[12%] w-2 h-2 rounded-full bg-emerald-400/50 animate-float-delayed pointer-events-none" />
        <div className="absolute bottom-24 left-[15%] w-2.5 h-2.5 rounded-full bg-amber-400/40 animate-float-slow pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[600px]">
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="px-4 py-1.5 bg-violet-500/10 text-violet-700 border-violet-500/25 font-semibold text-sm rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse inline-block mr-2" />
                    Plateforme de paiement africaine
                  </Badge>
                  <Badge className="px-3 py-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/25 font-semibold text-xs rounded-full">
                    ✓ 9 pays couverts
                  </Badge>
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-[64px] font-extrabold leading-[1.06] tracking-tight" data-testid="text-hero-title">
                  Paiements{" "}
                  <span className="relative inline-block">
                    <span className="text-gradient-brand">Mobile Money</span>
                    <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 200 6" fill="none">
                      <path d="M2 4C50 0 100 6 198 2" stroke="url(#u)" strokeWidth="3" strokeLinecap="round"/>
                      <defs><linearGradient id="u" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#7C3AED"/><stop offset="1" stopColor="#10B981"/></linearGradient></defs>
                    </svg>
                  </span>
                  {" "}pour l'Afrique
                </h1>

                <p className="text-lg text-muted-foreground max-w-xl leading-relaxed" data-testid="text-hero-description">
                  Acceptez des paiements MTN, Orange, Wave, Moov, TMoney et plus encore dans 9 pays africains. Créez des liens, gérez vos transactions et intégrez notre API.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 text-base font-bold shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/45 hover:scale-[1.02] transition-all duration-200" data-testid="button-cta-primary">
                    Créer un compte gratuit <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="https://docs.solvexpay.site" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-border/80 hover:bg-muted/50">
                    <BookOpen className="mr-2 h-4 w-4" /> Documentation API
                  </Button>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                {["Inscription gratuite", "Sans carte bancaire", "KYC simplifié"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>

              {/* Countries flags row */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">9 pays</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ALL_COUNTRIES.map((c) => (
                    <div key={c.code} className="group relative">
                      <span className="text-2xl cursor-default hover:scale-125 inline-block transition-transform duration-200">{c.flag}</span>
                      <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {c.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="hidden lg:flex flex-col gap-4 relative">
              <div className="absolute -inset-8 bg-gradient-to-br from-violet-500/10 via-transparent to-emerald-500/8 rounded-3xl blur-2xl" />

              <div className="relative bg-white rounded-3xl shadow-2xl shadow-violet-500/10 border border-violet-100/80 p-6 animate-float">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Solde disponible</p>
                    <p className="text-3xl font-black text-foreground">245 800 <span className="text-lg font-semibold text-muted-foreground">XOF</span></p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-emerald-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Reçu</p>
                    <p className="text-base font-black text-emerald-700">+89 500 XOF</p>
                  </div>
                  <div className="flex-1 bg-rose-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Envoyé</p>
                    <p className="text-base font-black text-rose-600">-12 200 XOF</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl shadow-xl shadow-violet-500/8 border border-violet-100/60 p-4 animate-float-delayed">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/30">
                    <LinkIcon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Lien actif</p>
                  <p className="text-lg font-black text-foreground">pay.sx/a4f3</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-emerald-600">En attente</span>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-xl shadow-violet-500/8 border border-violet-100/60 p-4 animate-float-slow">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-md shadow-amber-500/30">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">Ce mois</p>
                  <p className="text-lg font-black text-foreground">32 txns</p>
                  <div className="mt-2 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-emerald-500 rotate-[-45deg]" />
                    <span className="text-[10px] font-medium text-emerald-600">+18% vs mois dernier</span>
                  </div>
                </div>
              </div>

              {/* Transactions */}
              <div className="bg-white rounded-2xl shadow-xl shadow-violet-500/8 border border-violet-100/60 p-4 animate-float-delayed">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Dernières transactions</p>
                <div className="space-y-2.5">
                  {[
                    { op: "MTN", label: "MTN Bénin", amount: "+25 000 XOF", status: "Complété", isPos: true, time: "il y a 5 min" },
                    { op: "Orange", label: "Orange CI", amount: "+12 500 XOF", status: "Complété", isPos: true, time: "il y a 23 min" },
                    { op: "Wave", label: "Wave SN", amount: "-8 000 XOF", status: "En cours", isPos: false, time: "il y a 1h" },
                  ].map((tx, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0"><OperatorLogo operator={tx.op} size={32} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{tx.label}</p>
                        <p className="text-[10px] text-muted-foreground">{tx.time}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold ${tx.isPos ? "text-emerald-600" : "text-rose-500"}`}>{tx.amount}</p>
                        <span className={`text-[9px] font-semibold ${tx.status === "En cours" ? "text-amber-600" : "text-emerald-600"}`}>{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── OPERATOR MARQUEE ─── */}
      <section className="py-10 border-y border-border/40 bg-gradient-to-b from-muted/20 to-muted/40 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-5 text-center">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Opérateurs Mobile Money supportés</p>
        </div>
        <div className="marquee-container">
          <div className="marquee-track gap-5">
            {operatorsDoubled.map((op, i) => (
              <div key={i} className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border border-border/60 bg-card shadow-sm hover:shadow-md transition-all hover:border-violet-200 cursor-default">
                <div className="rounded-xl overflow-hidden flex-shrink-0">
                  <OperatorLogo operator={op.key} size={44} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground whitespace-nowrap">{op.label}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-medium">Actif</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="group rounded-3xl border border-border/60 bg-card p-6 text-center hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
                <div className={`h-14 w-14 rounded-2xl ${s.bg} flex items-center justify-center mx-auto mb-4`}>
                  <s.icon className={`h-7 w-7 ${s.color}`} />
                </div>
                <p className={`text-4xl font-black ${s.color} mb-1`}><AnimatedCounter target={s.value} suffix={s.suffix} /></p>
                <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DEPOSIT SCREENSHOT ─── */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="px-4 py-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold rounded-full">
                Interface intuitive
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                9 pays, tous les opérateurs<br />
                <span className="text-gradient-brand">dans une seule app</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Sélectionnez votre pays, choisissez l'opérateur Mobile Money et effectuez votre transaction. Simple, rapide et sécurisé depuis n'importe quel appareil.
              </p>
              <div className="space-y-3">
                {ALL_COUNTRIES.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <span className="text-2xl">{c.flag}</span>
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{c.prefix}</span>
                    </div>
                    <div className="flex -space-x-1.5">
                      {c.operators.slice(0, 3).map((op) => (
                        <div key={op} className="ring-2 ring-white rounded-full overflow-hidden">
                          <OperatorLogo operator={op} size={22} />
                        </div>
                      ))}
                      {c.operators.length > 3 && (
                        <div className="w-[22px] h-[22px] rounded-full bg-muted border-2 border-white flex items-center justify-center">
                          <span className="text-[8px] font-bold text-muted-foreground">+{c.operators.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-mono font-semibold text-muted-foreground">{c.currency}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Phone mockup with screenshot */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-br from-violet-500/20 to-emerald-500/15 rounded-[3rem] blur-2xl" />
                <div className="relative bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl shadow-violet-500/20 ring-1 ring-white/10">
                  <div className="bg-gray-800 rounded-[2rem] overflow-hidden" style={{ width: 240, height: 480 }}>
                    <img
                      src={depositScreenshot}
                      alt="Interface de dépôt SolvexPay"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  {/* Phone notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-full" />
                </div>
                {/* Floating badge */}
                <div className="absolute -right-4 top-12 bg-white rounded-2xl shadow-xl border border-violet-100 p-3 flex items-center gap-2 animate-float">
                  <div className="w-8 h-8 rounded-lg overflow-hidden"><OperatorLogo operator="MTN" size={32} /></div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground">MTN Bénin</p>
                    <p className="text-sm font-black text-emerald-600">+25 000 XOF</p>
                  </div>
                </div>
                <div className="absolute -left-6 bottom-24 bg-white rounded-2xl shadow-xl border border-violet-100 p-3 flex items-center gap-2 animate-float-delayed">
                  <div className="w-8 h-8 rounded-lg overflow-hidden"><OperatorLogo operator="Wave" size={32} /></div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground">Wave Sénégal</p>
                    <p className="text-sm font-black text-blue-600">Instantané</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 px-4" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <Badge className="px-4 py-1.5 bg-violet-500/10 text-violet-700 border-violet-500/20 font-bold rounded-full">Nos Solutions</Badge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight" data-testid="text-solutions-title">
              Tout pour <span className="text-gradient-brand">accepter les paiements</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Des outils puissants pour gérer vos paiements Mobile Money en Afrique.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={f.title} className="group relative rounded-3xl overflow-hidden border border-border/60 bg-card hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500" data-testid={`card-feature-${i}`}>
                <div className={`h-52 bg-gradient-to-br ${f.color} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.25)_0%,_transparent_70%)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <f.icon className="h-24 w-24 text-white/15" />
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white bg-white/20 border border-white/25 backdrop-blur-sm">{f.badge}</span>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <f.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                  <div className="space-y-2 pt-2">
                    {f.points.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-sm">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${f.color} flex items-center justify-center flex-shrink-0`}>
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-foreground font-medium">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COUNTRIES & FEES ─── */}
      <section className="py-24 px-4 bg-muted/20" id="pays">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <Badge className="px-4 py-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-bold rounded-full">Couverture</Badge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              9 pays, <span className="text-gradient-brand">10+ opérateurs</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Sélectionnez un pays pour voir les opérateurs disponibles et les frais.</p>
          </div>

          {/* Country tabs */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {ALL_COUNTRIES.map((c, i) => (
              <button
                key={c.code}
                onClick={() => setActiveCountry(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 text-sm font-semibold ${
                  activeCountry === i
                    ? "bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/30"
                    : "bg-card border-border/60 text-foreground hover:border-violet-200 hover:bg-violet-50/50"
                }`}
                data-testid={`button-country-${c.code}`}
              >
                <span className="text-lg">{c.flag}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Operators */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">{ALL_COUNTRIES[activeCountry].flag}</span>
                <div>
                  <h3 className="text-xl font-bold">{ALL_COUNTRIES[activeCountry].name}</h3>
                  <p className="text-sm text-muted-foreground">{ALL_COUNTRIES[activeCountry].operators.length} opérateur(s) · {ALL_COUNTRIES[activeCountry].currency} · {ALL_COUNTRIES[activeCountry].prefix}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ALL_COUNTRIES[activeCountry].operators.map((op) => (
                  <div key={op} className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="rounded-2xl overflow-hidden shadow-md"><OperatorLogo operator={op} size={52} /></div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-foreground">
                        {op === "MTN" ? "MTN Money" : op === "Orange" ? "Orange Money" : op === "Moov" ? "Moov Money" : op === "Wave" ? "Wave" : op === "TMoney" ? "T-Money" : op === "Vodacom" ? "M-Pesa" : op === "Airtel" ? "Airtel Money" : op === "Free" ? "Free Money" : op}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-medium">Actif</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fees table */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm" id="tarifs">
              <div className="flex items-center gap-2 mb-6">
                <CreditCard className="h-5 w-5 text-violet-600" />
                <h3 className="text-lg font-bold">Frais — {ALL_COUNTRIES[activeCountry].name}</h3>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left font-bold text-muted-foreground text-xs uppercase tracking-wider">Opérateur</th>
                      <th className="px-4 py-3 text-center font-bold text-muted-foreground text-xs uppercase tracking-wider">Dépôt</th>
                      <th className="px-4 py-3 text-center font-bold text-muted-foreground text-xs uppercase tracking-wider">Retrait</th>
                      <th className="px-4 py-3 text-center font-bold text-muted-foreground text-xs uppercase tracking-wider">Min.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {ALL_COUNTRIES[activeCountry].fees.map((fee, i) => (
                      <tr key={fee.op} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg overflow-hidden"><OperatorLogo operator={fee.op} size={24} /></div>
                            <span className="font-semibold text-foreground text-sm">{fee.op}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">{fee.deposit}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200">{fee.withdraw}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground font-medium">{fee.min}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <Zap className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Frais uniformes dans tous les pays : <strong>Dépôt 5%</strong> · <strong>Retrait 7%</strong> · <strong>Transfert 6%</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <Badge className="px-4 py-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold rounded-full">Simple & Rapide</Badge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Démarrez en <span className="text-gradient-brand">3 étapes</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[calc(33.33%+1rem)] right-[calc(33.33%+1rem)] h-0.5 bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200 rounded-full" />
            {steps.map((s, i) => (
              <div key={s.title} className="relative group text-center p-8 rounded-3xl bg-card border border-border/60 hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1 transition-all duration-400" data-testid={`step-${i + 1}`}>
                <div className="relative inline-flex mb-6">
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.color} opacity-25 blur-lg scale-110`} />
                  <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-xl`}>
                    <s.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border-2 border-violet-300 flex items-center justify-center">
                    <span className="text-[10px] font-black text-violet-600">{i + 1}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY ─── */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(124,58,237,0.3)_0%,_transparent_60%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.2)_0%,_transparent_60%)]" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <Badge className="px-4 py-1.5 bg-white/10 text-white border-white/20 font-bold rounded-full">
                  <Lock className="w-3.5 h-3.5 mr-1.5 inline" /> Sécurité & Conformité
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                  Votre argent est<br /><span className="text-gradient-brand">protégé à chaque étape</span>
                </h2>
                <p className="text-white/70 leading-relaxed">Chiffrement de bout en bout et protocoles de sécurité bancaire pour toutes vos transactions.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Lock, label: "Chiffrement TLS/SSL" },
                    { icon: Shield, label: "Conformité KYC/AML" },
                    { icon: Key, label: "Clés API sécurisées" },
                    { icon: RefreshCw, label: "Webhooks signés HMAC" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm font-medium text-white/85">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Zap, title: "Transactions instantanées", desc: "Confirmation en temps réel pour tous les opérateurs.", color: "text-amber-400" },
                  { icon: Webhook, title: "Webhooks en temps réel", desc: "Notifications automatiques pour chaque événement.", color: "text-violet-400" },
                  { icon: BarChart3, title: "Tableau de bord analytique", desc: "Suivez vos revenus et tendances en un coup d'œil.", color: "text-emerald-400" },
                  { icon: Users, title: "Support dédié 24/7", desc: "Notre équipe vous accompagne à tout moment.", color: "text-blue-400" },
                ].map(({ icon: Icon, title, desc, color }) => (
                  <div key={title} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white mb-0.5">{title}</p>
                      <p className="text-xs text-white/55 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── API SECTION ─── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="px-4 py-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20 font-bold rounded-full">
                <Code2 className="w-3.5 h-3.5 mr-1.5 inline" /> API Développeurs
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Intégrez SolvexPay en<br /><span className="text-gradient-brand">quelques lignes de code</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">Notre API RESTful est documentée, testable et prête à l'emploi pour tous vos projets.</p>
              <div className="space-y-3">
                {["Clés API de test et production", "Documentation interactive en ligne", "Webhooks avec signature HMAC-SHA3-512", "Support multi-opérateurs et multi-pays"].map((p) => (
                  <div key={p} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-foreground font-medium">{p}</span>
                  </div>
                ))}
              </div>
              <a href="https://docs.solvexpay.site" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="font-semibold border-border/80 hover:bg-muted/50">
                  <BookOpen className="mr-2 h-4 w-4" /> Voir la documentation <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <div className="rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden shadow-2xl shadow-slate-900/50">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60 bg-slate-900">
                <div className="w-3 h-3 rounded-full bg-rose-500" /><div className="w-3 h-3 rounded-full bg-amber-500" /><div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-3 text-xs text-slate-400 font-mono">solvexpay-example.js</span>
              </div>
              <pre className="p-5 text-sm font-mono overflow-x-auto leading-relaxed">
                <code>
                  <span className="text-slate-500">{"// Initier un paiement Mobile Money\n"}</span>
                  <span className="text-violet-400">{"const "}</span><span className="text-slate-100">{"response = "}</span><span className="text-amber-400">{"await "}</span><span className="text-slate-100">{"fetch("}</span><span className="text-emerald-400">{"'https://api.solvexpay.site/v1/deposit'"}</span><span className="text-slate-100">{", {\n"}</span>
                  <span className="text-slate-100">{"  method: "}</span><span className="text-emerald-400">{"'POST'"}</span><span className="text-slate-100">{",\n"}</span>
                  <span className="text-slate-100">{"  headers: { "}</span><span className="text-emerald-400">{"'Authorization'"}</span><span className="text-slate-100">{": "}</span><span className="text-emerald-400">{"'Bearer YOUR_KEY'"}</span><span className="text-slate-100">{" },\n"}</span>
                  <span className="text-slate-100">{"  body: JSON.stringify({\n"}</span>
                  <span className="text-slate-100">{"    phone: "}</span><span className="text-emerald-400">{"'+22961000000'"}</span><span className="text-slate-100">{",\n"}</span>
                  <span className="text-slate-100">{"    amount: "}</span><span className="text-amber-300">{"5000"}</span><span className="text-slate-100">{",\n"}</span>
                  <span className="text-slate-100">{"    operator: "}</span><span className="text-emerald-400">{"'MTN_BENIN'"}</span><span className="text-slate-100">{"\n  })\n"}</span>
                  <span className="text-slate-100">{"});\n\n"}</span>
                  <span className="text-slate-500">{"// ✓ Paiement initié avec succès"}</span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHATSAPP SUPPORT ─── */}
      <section className="py-20 px-4 bg-muted/20" id="support">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <Badge className="px-4 py-1.5 bg-green-500/10 text-green-700 border-green-500/20 font-bold rounded-full">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5 inline" /> Service Client
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Besoin d'aide ?<br /><span className="text-gradient-brand">On est là pour vous</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Notre équipe de support est disponible 24h/24 · 7j/7 via WhatsApp pour répondre à toutes vos questions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Direct WhatsApp */}
            <div className="group relative rounded-3xl border border-border/60 bg-card p-7 text-center hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-500/30">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Support Direct</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Contactez notre équipe directement sur WhatsApp pour une assistance personnalisée.</p>
                <a
                  href="https://wa.me/message/LIEN_A_VENIR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-500/25"
                  data-testid="link-whatsapp-support"
                >
                  <MessageCircle className="w-4 h-4" /> Contacter le support
                </a>
              </div>
            </div>

            {/* WhatsApp Group */}
            <div className="group relative rounded-3xl border border-border/60 bg-card p-7 text-center hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/30">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Groupe Communauté</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Rejoignez notre groupe WhatsApp et échangez avec d'autres marchands SolvexPay.</p>
                <a
                  href="https://chat.whatsapp.com/LIEN_A_VENIR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                  data-testid="link-whatsapp-group"
                >
                  <Users className="w-4 h-4" /> Rejoindre le groupe
                </a>
              </div>
            </div>

            {/* WhatsApp Channel */}
            <div className="group relative rounded-3xl border border-border/60 bg-card p-7 text-center hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-500/30">
                  <Send className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Chaîne Officielle</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Suivez notre chaîne WhatsApp pour les dernières actualités et mises à jour SolvexPay.</p>
                <a
                  href="https://whatsapp.com/channel/LIEN_A_VENIR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/25"
                  data-testid="link-whatsapp-channel"
                >
                  <Send className="w-4 h-4" /> Suivre la chaîne
                </a>
              </div>
            </div>
          </div>

          {/* Email contact */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-card border border-border/60 shadow-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Email :</span>
              <a href="mailto:support@solvexpay.site" className="text-sm font-bold text-violet-600 hover:underline">support@solvexpay.site</a>
              <span className="text-muted-foreground/40">·</span>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Réponse en moins de 2h</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14 space-y-4">
            <Badge className="px-4 py-1.5 bg-violet-500/10 text-violet-700 border-violet-500/20 font-bold rounded-full">FAQ</Badge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Questions <span className="text-gradient-brand">fréquentes</span></h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-brand opacity-97" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,_rgba(255,255,255,0.12)_0%,_transparent_60%)]" />
        <div className="absolute top-8 right-16 w-32 h-32 rounded-full border border-white/10 animate-float pointer-events-none" />
        <div className="absolute bottom-8 left-16 w-20 h-20 rounded-full border border-white/10 animate-float-delayed pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative space-y-8">
          <div className="space-y-5">
            <Badge className="px-4 py-1.5 bg-white/15 text-white border-white/25 font-bold rounded-full text-sm">
              <Star className="w-3.5 h-3.5 mr-1.5 inline fill-white" /> Rejoignez des centaines de marchands
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Prêt à accepter des paiements<br />à travers l'Afrique ?
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto leading-relaxed">
              Créez votre compte gratuit et commencez à recevoir des paiements Mobile Money dans 9 pays dès aujourd'hui.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="h-13 px-10 text-base font-extrabold bg-white text-violet-700 hover:bg-white/95 shadow-2xl hover:scale-[1.03] transition-all duration-200" data-testid="button-cta-bottom">
                Commencer gratuitement <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="https://docs.solvexpay.site" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="h-13 px-8 text-base font-semibold border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm">
                <BookOpen className="mr-2 h-4 w-4" /> Documentation
              </Button>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            {[{ icon: Shield, text: "Sécurisé & Chiffré" }, { icon: Zap, text: "Instantané" }, { icon: Globe, text: "9 pays" }, { icon: Clock, text: "Support 24/7" }].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white/80">
                <Icon className="h-4 w-4" /><span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/40 bg-card/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-sm" />
                  <img src={solvexpayLogo} alt="SolvexPay" className="relative w-9 h-9 rounded-xl object-cover ring-1 ring-violet-400/30" />
                </div>
                <span className="font-extrabold text-xl bg-gradient-to-r from-violet-600 to-violet-400 bg-clip-text text-transparent">SolvexPay</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">Passerelle de paiement Mobile Money pour l'Afrique.</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Tous systèmes opérationnels</span>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">Produit</p>
              <ul className="space-y-2.5">
                {["Tableau de bord", "Liens de paiement", "API Gateway", "Clés API", "Vérification KYC"].map((item) => (
                  <li key={item}><Link href="/register"><span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{item}</span></Link></li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">Ressources</p>
              <ul className="space-y-2.5">
                {[{ label: "Documentation", href: "https://docs.solvexpay.site" }, { label: "Guide de démarrage", href: "https://docs.solvexpay.site" }, { label: "Référence API", href: "https://docs.solvexpay.site" }].map((item) => (
                  <li key={item.label}><a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{item.label}</a></li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">Support</p>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-3.5 w-3.5 flex-shrink-0" /><span>support@solvexpay.site</span></li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground"><MessageCircle className="h-3.5 w-3.5 flex-shrink-0" /><span>WhatsApp 24/7</span></li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground"><Globe className="h-3.5 w-3.5 flex-shrink-0" /><span>9 pays couverts</span></li>
              </ul>
              <a href="#support" className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
                <MessageCircle className="h-3.5 w-3.5" /> Nous contacter
              </a>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground" data-testid="text-copyright">© 2026 SolvexPay. Tous droits réservés.</p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="cursor-pointer hover:text-foreground transition-colors">Conditions d'utilisation</span>
              <span className="cursor-pointer hover:text-foreground transition-colors">Confidentialité</span>
              <span className="cursor-pointer hover:text-foreground transition-colors">Mentions légales</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
