import { defineAdviceSet } from "./build.js";
export const PL_ADVICE = defineAdviceSet("pl", [
  { id: "weaken_control", verb: "wylacz|wylaczcie|prosze\\s+wylaczyc|omin|omincie|prosze\\s+ominac|usun|usuncie|prosze\\s+usunac", object: "uwierzytelnianie|autoryzacje|auth|tls|https|firewall|review|zatwierdzenie|bezpieczenstwo", warning: "Advice may weaken an authentication, transport, review, or security control." },
  { id: "expose_secret", verb: "zapisz|zapiszcie|prosze\\s+zapisac|loguj|logujcie|prosze\\s+logowac|wypisz|wypiszcie|opublikuj|opublikujcie|wyslij|wyslijcie", object: "haslo|token|sekret|klucz(?:\\s+|[_-])?api|dane\\s+uwierzytelniajace|credentials?", warning: "Advice may expose or persist credentials/secrets." },
  { id: "run_root", verb: "uruchom|uruchomcie|prosze\\s+uruchomic|wykonaj|wykonajcie", object: "jako\\s+root", warning: "Advice suggests running work as root.", gap: 24 },
], [
  "(?<![\\p{L}\\p{N}])(?:nie|nigdy|unikaj|unikajcie)(?![\\p{L}\\p{N}]).{0,40}(?:wylaczac|ominac|usuwac|zapisywac|logowac|wypisywac|publikowac|wysylac|uruchamiac|wykonywac)",
  "(?<![\\p{L}\\p{N}])nie\\s+(?:wylaczaj|wylaczajcie|omijaj|omijajcie|usuwaj|usuwajcie|zapisuj|zapisujcie|loguj|logujcie|wypisuj|wypisujcie|publikuj|publikujcie|wysylaj|wysylajcie|uruchamiaj|uruchamiajcie)(?![\\p{L}\\p{N}])",
]);
