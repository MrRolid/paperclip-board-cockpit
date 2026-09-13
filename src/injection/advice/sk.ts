import { defineAdviceSet } from "./build.js";
export const SK_ADVICE = defineAdviceSet("sk", [
  { id: "weaken_control", verb: "vypni|vypnite|zakaz|zakazte|obid|obidte|odstran|odstrante", object: "autentizaciu|autorizaciu|auth|tls|https|firewall|kontrolu|review|schvalenie|bezpecnost", warning: "Advice may weaken an authentication, transport, review, or security control." },
  { id: "expose_secret", verb: "commitni|commitnite|uloz|ulozte|loguj|logujte|vypis|vypiste|publikuj|publikujte|odosli|odoslite|posli|poslite", object: "heslo|token|tajomstvo|api(?:\\s+|[_-])?kluc|prihlasovacie\\s+udaje|credential|credentials", warning: "Advice may expose or persist credentials/secrets." },
  { id: "run_root", verb: "spust|spustite|vykonaj|vykonajte", object: "ako\\s+root|pod\\s+rootom", warning: "Advice suggests running work as root.", gap: 24 },
], [
  "(?<![\\p{L}\\p{N}])(?:nikdy|nerob|nerobte|vyhni\\s+sa|vyhnite\\s+sa|nesmie|nemal\\s+by|nemali\\s+by)(?![\\p{L}\\p{N}]).{0,40}(?:vypnut|zakazat|obist|odstranit|ulozit|logovat|vypisat|publikovat|odoslat|poslat|spustit)",
  "(?<![\\p{L}\\p{N}])ne(?:vypinaj|vypinajte|zakazuj|zakazujte|obchadzaj|obchadzajte|odstranuj|odstranujte|ukladaj|ukladajte|loguj|logujte|vypisuj|vypisujte|publikuj|publikujte|posielaj|posielajte|spustaj|spustajte)(?![\\p{L}\\p{N}])",
]);
