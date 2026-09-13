import { defineAdviceSet } from "./build.js";
export const DE_ADVICE = defineAdviceSet("de", [
  { id: "weaken_control", verb: "deaktiviere|deaktiviert|deaktivieren\\s+sie|schalte|schaltet|schalten\\s+sie|umgehe|umgeht|umgehen\\s+sie|entferne|entfernt|entfernen\\s+sie", object: "authentifizierung|autorisierung|auth|tls|https|firewall|review|freigabe|sicherheit", warning: "Advice may weaken an authentication, transport, review, or security control." },
  { id: "expose_secret", verb: "speichere|speichert|speichern\\s+sie|logge|loggt|loggen\\s+sie|drucke|druckt|drucken\\s+sie|veroffentliche|veroffentlicht|sende|sendet|senden\\s+sie", object: "passwort|token|geheimnis|api(?:\\s+|[_-])?schlussel|zugangsdaten|credentials?", warning: "Advice may expose or persist credentials/secrets." },
  { id: "run_root", verb: "starte|startet|starten\\s+sie|fuhre|fuhrt|fuhren\\s+sie", object: "als\\s+root", warning: "Advice suggests running work as root.", gap: 24 },
], ["(?<![\\p{L}\\p{N}])(?:nicht|niemals|vermeide|vermeidet|vermeiden\\s+sie)(?![\\p{L}\\p{N}]).{0,40}(?:deaktivieren|ausschalten|umgehen|entfernen|speichern|loggen|drucken|veroffentlichen|senden|starten|ausfuhren)"]);
