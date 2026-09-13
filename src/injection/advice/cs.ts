import { defineAdviceSet } from "./build.js";
export const CS_ADVICE = defineAdviceSet("cs", [
  { id: "weaken_control", verb: "vypni|vypnete|zakaz|zakazte|obejdi|obejdete|odstran|odstrante", object: "autentizaci|autorizaci|auth|tls|https|firewall|kontrolu|review|schvaleni|bezpecnost", warning: "Advice may weaken an authentication, transport, review, or security control." },
  { id: "expose_secret", verb: "commitni|commitnete|uloz|ulozte|loguj|logujte|vypis|vypiste|publikuj|publikujte|odesli|odeslete|posli|poslete", object: "heslo|token|tajemstvi|api(?:\\s+|[_-])?klic|prihlasovaci\\s+udaje|credential|credentials", warning: "Advice may expose or persist credentials/secrets." },
  { id: "run_root", verb: "spust|spustte|proved|provedte|vykonej|vykonejte", object: "jako\\s+root|pod\\s+rootem", warning: "Advice suggests running work as root.", gap: 24 },
], [
  "(?<![\\p{L}\\p{N}])(?:nikdy|nedela?j|nedelejte|vyhni\\s+se|vyhnete\\s+se|nesmi|nemel\\s+by|nemeli\\s+byste)(?![\\p{L}\\p{N}]).{0,40}(?:vypnout|zakazat|obejit|odstranit|ulozit|logovat|vypsat|publikovat|odeslat|poslat|spustit)",
  "(?<![\\p{L}\\p{N}])ne(?:vypinej|vypinejte|zakazuj|zakazujte|obchazej|obchazejte|odstranuj|odstranujte|ukladej|ukladejte|loguj|logujte|vypisuj|vypisujte|publikuj|publikujte|posilej|posilejte|spoustej|spoustejte)(?![\\p{L}\\p{N}])",
]);
