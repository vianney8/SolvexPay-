import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  MessageCircle,
  Mail,
  Users,
  Radio,
  Facebook,
  ExternalLink,
  HeadphonesIcon,
  Clock,
  Zap,
} from "lucide-react";

const CHANNEL_META = [
  {
    id: "whatsapp_direct",
    key: "support_link_whatsapp_direct",
    label: "WhatsApp Direct",
    description: "Discutez en direct avec notre équipe support",
    icon: MessageCircle,
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800/40",
    iconBg: "bg-green-500",
    badge: "Réponse rapide",
    badgeBg: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  },
  {
    id: "whatsapp_group",
    key: "support_link_whatsapp_group",
    label: "Groupe WhatsApp",
    description: "Rejoignez la communauté SolvexPay",
    icon: Users,
    bg: "bg-teal-50 dark:bg-teal-950/30",
    border: "border-teal-200 dark:border-teal-800/40",
    iconBg: "bg-teal-500",
    badge: "Communauté",
    badgeBg: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400",
  },
  {
    id: "email",
    key: "support_link_email",
    label: "Email Support",
    description: "Envoyez-nous un email pour toute demande",
    icon: Mail,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800/40",
    iconBg: "bg-blue-500",
    badge: "24h de réponse",
    badgeBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  },
  {
    id: "whatsapp_channel",
    key: "support_link_whatsapp_channel",
    label: "Canal WhatsApp",
    description: "Suivez nos annonces et mises à jour",
    icon: Radio,
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800/40",
    iconBg: "bg-violet-500",
    badge: "Annonces",
    badgeBg: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
  },
  {
    id: "facebook",
    key: "support_link_facebook",
    label: "Page Facebook",
    description: "Suivez-nous sur Facebook pour les actualités",
    icon: Facebook,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-700/40",
    iconBg: "bg-blue-600",
    badge: "Réseau social",
    badgeBg: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
];

const DEFAULTS: Record<string, string> = {
  support_link_whatsapp_direct: "https://wa.me/22891840498",
  support_link_whatsapp_group: "https://chat.whatsapp.com/FeGmjzHa1VG7v4VGo0Rxbd",
  support_link_email: "mailto:support@solvexpay.com",
  support_link_whatsapp_channel: "https://whatsapp.com/channel/0029Vb3WFkb2ZjCZTb0Dq11F",
  support_link_facebook: "https://www.facebook.com/profile.php?id=61574706268491",
};

const features = [
  { icon: Zap, label: "Réponse rapide", sub: "En moins de 2h" },
  { icon: Clock, label: "7j/7", sub: "Support continu" },
  { icon: HeadphonesIcon, label: "Équipe dédiée", sub: "Experts SolvexPay" },
];

export default function SupportPage() {
  const { data: links } = useQuery<Record<string, string>>({ queryKey: ["/api/support-links"] });

  return (
    <DashboardLayout title="">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-500 p-6 text-white shadow-lg shadow-violet-200 dark:shadow-violet-950/30">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
              <HeadphonesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-black text-xl leading-tight">Comment pouvons-nous vous aider ?</h2>
              <p className="text-white/80 text-sm mt-1">Choisissez le canal qui vous convient le mieux. Notre équipe est disponible 7j/7.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {features.map((f) => (
              <div key={f.label} className="rounded-xl bg-white/15 backdrop-blur p-3 text-center">
                <f.icon className="h-5 w-5 mx-auto mb-1.5 text-white" />
                <p className="text-xs font-bold text-white leading-tight">{f.label}</p>
                <p className="text-xs text-white/70 mt-0.5">{f.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Nos canaux de contact</h3>
          {CHANNEL_META.map((ch) => {
            const href = links?.[ch.key] || DEFAULTS[ch.key];
            return (
              <a
                key={ch.id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-support-${ch.id}`}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${ch.bg} ${ch.border} hover:shadow-md transition-all duration-200 group`}
              >
                <div className={`h-12 w-12 rounded-xl ${ch.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <ch.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{ch.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ch.badgeBg}`}>{ch.badge}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{ch.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </a>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Vous pouvez également nous écrire à{" "}
            <a href={links?.support_link_email || DEFAULTS.support_link_email} className="font-semibold text-primary hover:underline" data-testid="link-support-email-inline">
              {(links?.support_link_email || DEFAULTS.support_link_email).replace("mailto:", "")}
            </a>
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">Nous répondons dans les 24 heures ouvrables.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
