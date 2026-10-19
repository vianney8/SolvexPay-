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
          <p className="mb-4 text-xs font-black uppercase tracking-[0.19em] text-[#598073]">SolvexPay · engagements d’utilisation</p>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-[#173c36] sm:text-6xl">
            Conformité, sécurité et utilisation du service
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-[#50635f] sm:text-lg sm:leading-8">
            SolvexPay accompagne les marchands dans le suivi de leurs paiements. Ces engagements précisent le rôle de la plateforme, les informations utiles à la sécurité des opérations et les responsabilités de chacun.
          </p>
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
              <p>SolvexPay fournit une plateforme technique permettant aux marchands de créer et suivre des demandes de paiement, notamment par Mobile Money. Les opérateurs et autres partenaires de paiement exécutent les opérations et assurent le mouvement des fonds selon le parcours concerné. Les rôles de chacun dépendent du moyen de paiement et des intervenants mobilisés.</p>
              <p>Les moyens disponibles, pays, plafonds, frais, délais et conditions d’acceptation peuvent varier selon le parcours, le réseau, les vérifications nécessaires et les circonstances de l’opération. Une opération peut être refusée, retardée ou interrompue par un intervenant du parcours.</p>
            </Topic>

            <Topic id="verifications" title="2. Vérification des clients et bénéficiaires effectifs">
              <p>Selon le profil, les fonctionnalités demandées, le niveau de risque et les exigences applicables, des informations ou justificatifs peuvent être demandés avant ou pendant l’utilisation du service. Les demandes peuvent concerner l’identité du titulaire et de ses représentants, l’existence et l’activité de l’entreprise, ses bénéficiaires effectifs ainsi que l’origine ou la destination des fonds.</p>
              <p>Les documents transmis doivent être authentiques, lisibles, en cours de validité et appartenir à la personne concernée. Le titulaire fournit des informations exactes et complètes et les actualise lorsque sa situation change. Des justificatifs actualisés ou complémentaires peuvent être demandés si le profil, l’opération ou les exigences applicables le nécessitent.</p>
            </Topic>

            <Topic id="lbc-ft" title="3. Prévention du blanchiment et du financement du terrorisme">
              <p>Le service ne peut servir à dissimuler l’origine, la propriété ou la destination de fonds, contourner des sanctions ou restrictions applicables, financer le terrorisme ou faciliter une activité illicite. Sont également interdits le fractionnement destiné à éviter des limites ou vérifications et l’usage de prête-noms visant à masquer les personnes impliquées.</p>
              <p>Lorsque le risque identifié, les exigences d’un partenaire ou le droit applicable le justifient, des informations complémentaires peuvent être demandées et l’accès au service ou une opération peut être limité ou suspendu. Toute mesure est motivée par les circonstances et proportionnée au risque ou à l’obligation concernée. Elle ne supprime pas les droits du titulaire sur les fonds, sous réserve des restrictions prévues par la loi. Les informations sont communiquées aux autorités compétentes lorsque la loi l’exige.</p>
            </Topic>

            <Topic id="fraude" title="4. Fraude et usages interdits">
              <p>Sont interdits l’usurpation d’identité, l’utilisation sans autorisation d’un compte ou d’un moyen de paiement, les fonds volés, les justificatifs falsifiés, les escroqueries, les accès non autorisés et la vente ou la promotion de biens ou services illicites. Il est également interdit de partager, louer ou revendre un compte ou des clés API, de manipuler artificiellement un solde ou des opérations, ou de contourner les vérifications et restrictions applicables.</p>
              <p>SolvexPay est un service de paiement et non un produit d’investissement. Un paiement ou un solde ne promet aucun gain, rendement ni résultat financier.</p>
            </Topic>

            <Topic id="marchands" title="5. Responsabilités des marchands">
              <p>Le marchand reste responsable de la légalité et de la qualité des biens ou services proposés, de l’exactitude de ses offres, ainsi que de la bonne information de ses clients sur le prix total, les frais éventuels, les délais et les conditions de vente avant le paiement.</p>
              <p>Il lui appartient d’assurer la livraison ou l’exécution promise, de traiter les demandes de remboursement et les contestations de manière appropriée, et de respecter les règles applicables à son activité. Il ne doit pas faire transiter les fonds de tiers ni utiliser le service au nom d’un autre bénéficiaire sans autorisation et justification appropriées.</p>
            </Topic>

            <Topic id="donnees" title="6. Données et justificatifs">
              <p>Selon le parcours, SolvexPay peut recueillir des données d’identité et de contact, des informations sur l’activité, des données de transaction et les justificatifs nécessaires. Elles servent à fournir et suivre le service, sécuriser les opérations, effectuer les vérifications requises et satisfaire aux obligations applicables.</p>
              <p>Les données sont accessibles aux personnes habilitées et aux partenaires de paiement qui en ont besoin pour exécuter l’opération ou répondre aux finalités concernées ; elles peuvent aussi être communiquées aux autorités lorsque la loi l’exige. Leur conservation dépend de leur usage et des délais légaux applicables. Les demandes relatives aux droits prévus par la loi peuvent être adressées via les canaux de support indiqués sur l’accueil. Ne transmettez jamais de mot de passe, code à usage unique ou clé API dans une demande.</p>
            </Topic>

            <Topic id="securite-client" title="7. Protégez votre compte et vos paiements">
              <p>Ne communiquez jamais votre code à usage unique, votre mot de passe ou vos clés API, y compris à une personne se présentant comme membre du support. Saisissez un code de paiement uniquement dans le parcours correspondant à une opération que vous avez initiée. Vérifiez l’adresse du site avant de saisir des informations ou de confirmer une opération. En cas de doute, utilisez les canaux de support affichés sur l’accueil.</p>
              <p>Une capture d’écran, un reçu ou une preuve de débit ne suffit pas à établir que le paiement a été reçu avec succès. Consultez la référence et le statut affichés dans le service avant de livrer un bien ou de fournir une prestation.</p>
            </Topic>

            <Topic id="reclamations" title="8. Questions et réclamations">
              <p>Pour toute question ou réclamation, contactez le support via les canaux affichés sur l’accueil. Indiquez, si vous les avez, la référence de transaction, sa date, le montant, la devise, l’opérateur concerné, le statut visible et une description factuelle. Joignez les éléments utiles en masquant les données qui ne sont pas nécessaires ; ne transmettez jamais de code à usage unique, mot de passe ou clé API.</p>
              <p>Si l’opération apparaît en attente, ne lancez pas une nouvelle tentative avant d’avoir vérifié son statut. Un débit constaté ou une preuve de débit ne suffit pas à conclure que le paiement a abouti : le rapprochement avec l’opérateur ou le partenaire concerné peut être nécessaire avant toute correction ou restauration de solde.</p>
            </Topic>

            <Topic id="transactions" title="9. Confirmation, délais et erreurs d’opération">
              <p>Les délais dépendent des réseaux, des partenaires de paiement et des confirmations nécessaires. Une demande initiée n’est pas nécessairement acceptée ou réglée : vérifiez le statut de l’opération dans le service. En cas de différence entre le statut affiché et le débit observé, adressez une réclamation pour permettre le rapprochement avant toute correction ou restauration.</p>
              <p>Un remboursement commercial lié à une vente, une livraison ou une prestation relève du marchand et de ses conditions de vente. Il se distingue de la recherche d’une anomalie de paiement ; un remboursement n’est pas automatique du seul fait d’une contestation. Les droits impératifs applicables restent préservés.</p>
              <p>Lorsque des actifs numériques ou des réseaux crypto sont proposés dans un parcours applicable, leurs confirmations peuvent prendre un temps variable. Une adresse, un réseau ou une référence incorrects peuvent entraîner un retard ou une perte irréversible ; vérifiez les informations avant confirmation. Les erreurs de réseau ou d’adresse ne peuvent pas toujours être annulées ou récupérées.</p>
            </Topic>

            <div className="mt-5 rounded-2xl bg-[#eef3ed] p-5 text-sm leading-6 text-[#50635f]">
              Ces informations ont une portée générale. Les conditions applicables à l’opération et le droit en vigueur prévalent.
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
