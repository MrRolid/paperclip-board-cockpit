import { defineAdviceSet } from "./build.js";
export const EN_ADVICE = defineAdviceSet("en", [
  { id: "weaken_control", verb: "disable|turn\\s+off|bypass|remove", object: "authentication|authorization|auth|tls|https|firewall|review|approval|security", warning: "Advice may weaken an authentication, transport, review, or security control." },
  { id: "expose_secret", verb: "commit|store|log|print|publish|send", object: "password|token|secret|api(?:\\s+|[_-])?key|credential|credentials", warning: "Advice may expose or persist credentials/secrets." },
  { id: "run_root", verb: "run|execute|launch", object: "as\\s+root", warning: "Advice suggests running work as root.", gap: 24 },
], ["(?<![\\p{L}\\p{N}])(?:do\\s+not|don't|never|avoid|must\\s+not|should\\s+not)(?![\\p{L}\\p{N}]).{0,32}(?:disable|turn\\s+off|bypass|remove|commit|store|log|print|publish|send|run|execute|launch)"]);
