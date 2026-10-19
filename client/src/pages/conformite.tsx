import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";

const topics = [
  { id: "service", label: "Nature du service" },
  { id: "verifications", label: "Vérifications des clients" },
  { id: "lbc-ft", label: "Lutte contre le blanchiment et le financement du terrorisme" },
  { id: "fraude", label: "Fraude et usages interdits" },
  { id: "marchands", label: "Responsabilités des marchands" },
  { id: "donnees", label: "Données personnelles" },
  { id: "securite-client", label: "Sécurité de votre compte" },
  { id: "reclamations", label: "Questions et réclamations" },
  { id: "transactions", label: "Confirmation, délais et erreurs" },
];

function Topic({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-[#e3e7e3] py-8 first:border-0 first:pt-0">
      <h2 className="mb-4 font-black text-2xl tracking-tight text-[#173c36] sm:text-[28px]">{title}</h2>
      <div className="space-y-4 text-[15px] leading-7 text-[#50635f]">{children}</div>
    </section>
  );
}

export default function ConformitePage() {
  return (
    <main className="min-h-[100dvh] bg-[#f4f6f1] text-[#183c36]">
      <header className="sticky top-0 z-20 border-b border-[#dfe6df] bg-[#f4f6f1]/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#315c53] transition-colors hover:text-[#173c36]">
            <ArrowLeft className="h-4 w-4" />
            Retour à l’accueil
          </Link>
          <span className="hidden items-center gap-2 text-xs font-semibold text-[#73817b] sm:inline-flex">
            <ShieldCheck className="h-4 w-4 text-[#3e7866]" />
            Informations de conformité
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 pb-20 pt-10 sm:px-8 sm:pt-16">
        <div className="max-w-4xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.19em] text-[#598073]">SolvexPay · repères publics</p>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-[#173c36] sm:text-6xl">
            Conformité et utilisation responsable
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-[#50635f] sm:text-lg sm:leading-8">
            Ces repères expliquent le fonctionnement du service et les précautions attendues des marchands et de leurs clients. Ils décrivent des principes généraux, et non des conditions contractuelles exhaustives ni une garantie de disponibilité ou de résultat.
          </p>
          <div className="mt-7 rounded-2xl border border-[#d8e4dc] bg-[#eaf1e9] p-5 text-sm leading-6 text-[#415c53]">
            Les opérations restent soumises aux conditions de service et aux exigences des opérateurs et prestataires concernés. Ces engagements d’utilisation responsable ne constituent ni un agrément réglementaire ni une certification.
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[250px_minmax(0,760px)] lg:items-start lg:gap-16">
          <nav aria-label="Sommaire de la page" className="lg:sticky lg:top-24">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.15em] text-[#84918b]">Sur cette page</p>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {topics.map((topic, index) => (
                <a
                  key={topic.id}
                  href={`#${topic.id}`}
                  className="group flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm leading-5 text-[#51645e] transition-colors hover:bg-white hover:text-[#173c36]"
                >
                  <span className="mt-0.5 font-mono text-[11px] font-bold text-[#91a198] group-hover:text-[#3e7866]">{String(index + 1).padStart(2, "0")}</span>
                  {topic.label}
                </a>
              ))}
            </div>
          </nav>

          <article className="rounded-[26px] border border-[#e1e7df] bg-[#fbfcf9] px-5 py-7 shadow-[0_14px_45px_rgba(34,67,54,0.05)] sm:px-9 sm:py-10">
            <Topic id="service" title="1. Nature du service">
              <p>SolvexPay fournit une interface technique destinée à faciliter la création et le suivi de demandes de paiement, notamment par Mobile Money et, lorsque disponible, AlphaPay. Le traitement et le mouvement des fonds s’effectuent au moyen des opérateurs, établissements et autres prestataires impliqués dans l’opération ; SolvexPay ne remplace pas ces intervenants.</p>
              <p>La disponibilité des moyens de paiement, les pays, plafonds, frais, délais et conditions d’acceptation peuvent varier selon le parcours, le prestataire, le réseau, les vérifications nécessaires et les circonstances de l’opération. Une interruption, un refus ou un délai supplémentaire peut survenir. SolvexPay n’est pas présenté comme une banque ; l’utilisation du service n’offre pas de garantie absolue de disponibilité ou de réussite des paiements.</p>
            </Topic>

            <Topic id="verifications" title="2. Vérification des clients et bénéficiaires effectifs">
              <p>Selon le profil, les fonctionnalités demandées, le niveau de risque et les exigences applicables, des informations ou justificatifs peuvent être demandés avant ou pendant l’utilisation du service. Il peut s’agir de documents d’identité exacts et à jour, de justificatifs d’activité, de documents relatifs à l’entreprise et à ses bénéficiaires effectifs, ou d’éléments permettant de comprendre l’origine et la destination des fonds.</p>
              <p>Le marchand s’engage à fournir des informations sincères, complètes et actualisées et à signaler les changements pertinents. La nature et l’étendue des vérifications dépendent du parcours et des exigences des prestataires concernés. Aucune vérification, décision ou durée de traitement automatique n’est promise pour chaque compte ou chaque opération.</p>
            </Topic>

            <Topic id="lbc-ft" title="3. Prévention du blanchiment et du financement du terrorisme">
              <p>Le service ne doit pas être utilisé pour dissimuler l’origine, la propriété ou la destination de fonds, contourner des sanctions ou des restrictions applicables, financer le terrorisme ou faciliter toute autre activité illicite. Il est interdit de fractionner des opérations dans le but d’éviter des contrôles ou des limites, ou d’utiliser des prête-noms pour masquer les personnes impliquées.</p>
              <p>Lorsque des obligations applicables ou les exigences des partenaires le justifient, une opération peut être refusée, retardée, suspendue ou soumise à un examen complémentaire. Des informations peuvent être communiquées aux autorités compétentes lorsque la loi l’impose. Les modalités d’examen dépendent du risque identifié, du parcours et des intervenants concernés.</p>
            </Topic>

            <Topic id="fraude" title="4. Fraude et usages interdits">
              <p>Sont notamment interdits l’usurpation d’identité, l’utilisation de comptes ou de moyens de paiement sans autorisation, les fonds volés, les preuves ou captures d’écran falsifiées, les escroqueries, les accès non autorisés et la vente ou la promotion de biens et services illicites. Toute tentative de contourner une mesure de sécurité ou une restriction applicable est également proscrite.</p>
              <p>SolvexPay est un outil de traitement de paiements, pas un produit d’investissement. Aucun paiement, solde ou usage du service ne garantit un gain, un rendement ou un résultat financier.</p>
            </Topic>

            <Topic id="marchands" title="5. Responsabilités des marchands">
              <p>Le marchand reste responsable de la légalité et de la qualité des biens ou services proposés, de l’exactitude de ses offres, ainsi que de la bonne information de ses clients sur le prix total, les frais éventuels, les délais et les conditions de vente avant le paiement.</p>
              <p>Il lui appartient d’assurer la livraison ou l’exécution promise, de traiter les demandes de remboursement et les contestations de manière appropriée, et de respecter les règles applicables à son activité. Il ne doit pas faire transiter les fonds de tiers ni utiliser le service au nom d’un autre bénéficiaire sans autorisation et justification appropriées.</p>
            </Topic>

            <Topic id="donnees" title="6. Données et justificatifs">
              <p>Selon le parcours utilisé, des données d’identité et de contact, des informations sur l’activité, des données de transaction et des justificatifs nécessaires peuvent être recueillis. Elles sont utilisées pour fournir et suivre le service, contribuer à sa sécurité et répondre aux obligations applicables.</p>
              <p>L’accès est limité aux personnes habilitées et aux prestataires qui ont besoin de ces informations pour les finalités concernées. Certaines données peuvent être communiquées lorsque la loi l’exige. Les informations sont conservées en fonction de leur finalité et des délais légaux applicables, sans qu’une durée uniforme soit annoncée ici. Les droits des personnes s’exercent selon le droit applicable par les canaux de support affichés sur l’accueil ; n’envoyez pas de mot de passe, code à usage unique ou clé API lors d’une demande.</p>
            </Topic>

            <Topic id="securite-client" title="7. Protégez votre compte et vos paiements">
              <p>Ne communiquez jamais votre code OTP, votre mot de passe ou vos clés API à un tiers, y compris à une personne se présentant comme membre du support. Saisissez un code de paiement uniquement dans le formulaire officiel correspondant à l’opération que vous avez vous-même initiée. Vérifiez soigneusement le domaine du site avant de saisir des informations ou de confirmer une opération et contactez le support via les canaux affichés sur l’accueil en cas de doute.</p>
              <p>Une capture d’écran, un reçu transmis par un client ou le retour du navigateur ne suffit pas à établir qu’un paiement a été reçu. Seul le statut confirmé par le serveur et les informations de transaction disponibles dans le service font foi pour le suivi. Le marchand devrait vérifier ce statut avant de remettre un bien ou de fournir un service.</p>
            </Topic>

            <Topic id="reclamations" title="8. Questions et réclamations">
              <p>Pour une question ou une réclamation, utilisez les canaux de support affichés sur la page d’accueil. Pour faciliter l’examen, indiquez la référence de transaction si elle est disponible, la date, le montant et une description factuelle du problème. N’incluez aucun secret d’authentification, code OTP, mot de passe ou clé API.</p>
              <p>Une vérification peut nécessiter des échanges avec l’opérateur ou le prestataire concerné. Les éléments fournis servent à rechercher l’opération et à orienter la demande ; ils ne garantissent pas une issue ou un délai précis.</p>
            </Topic>

            <Topic id="transactions" title="9. Confirmation, délais et erreurs d’opération">
              <p>Les délais dépendent notamment des réseaux Mobile Money, des prestataires et des confirmations nécessaires. Une demande initiée n’est pas nécessairement acceptée ou réglée : aucune validation ne doit être considérée comme acquise avant confirmation effective de l’opération par le service et le réseau concerné.</p>
              <p>Lorsque des actifs numériques ou des réseaux crypto sont proposés dans un parcours applicable, leurs confirmations peuvent prendre un temps variable. Une adresse, un réseau ou une référence saisis incorrectement peuvent entraîner un retard ou une perte irréversible ; vérifiez les informations avant confirmation. Les erreurs de réseau ou d’adresse ne peuvent pas toujours être annulées ou récupérées.</p>
            </Topic>

            <div className="mt-5 rounded-2xl bg-[#eef3ed] p-5 text-sm leading-6 text-[#50635f]">
              Cette synthèse ne remplace pas les conditions applicables à une opération particulière ni les règles des prestataires concernés.
            </div>
          </article>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#dfe6df] pt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#315c53] hover:text-[#173c36]">
            <ArrowLeft className="h-4 w-4" /> Retour à l’accueil
          </Link>
          <a href="#service" className="inline-flex items-center gap-2 text-sm font-semibold text-[#71817a] hover:text-[#315c53]">
            Revenir au début <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </main>
  );
}
