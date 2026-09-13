import { defineAdviceSet } from "./build.js";
export const FR_ADVICE = defineAdviceSet("fr", [
  { id: "weaken_control", verb: "desactive|desactivez|coupe|coupez|contourne|contournez|supprime|supprimez", object: "authentification|autorisation|auth|tls|https|pare-feu|review|approbation|securite", warning: "Advice may weaken an authentication, transport, review, or security control." },
  { id: "expose_secret", verb: "stocke|stockez|journalise|journalisez|imprime|imprimez|publie|publiez|envoie|envoyez", object: "mot\\s+de\\s+passe|token|secret|cle(?:\\s+|[_-])?api|identifiants|credentials?", warning: "Advice may expose or persist credentials/secrets." },
  { id: "run_root", verb: "execute|executez|lance|lancez", object: "en\\s+root|comme\\s+root", warning: "Advice suggests running work as root.", gap: 24 },
], ["(?<![\\p{L}\\p{N}])(?:ne|jamais|evite|evitez)(?![\\p{L}\\p{N}]).{0,40}(?:desactiver|couper|contourner|supprimer|stocker|journaliser|imprimer|publier|envoyer|executer|lancer).{0,8}(?:pas)?"]);
