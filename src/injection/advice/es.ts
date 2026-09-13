import { defineAdviceSet } from "./build.js";
export const ES_ADVICE = defineAdviceSet("es", [
  { id: "weaken_control", verb: "desactiva|desactiven|desactive\\s+usted|apaga|apaguen|apague\\s+usted|omite|omitan|omita\\s+usted|elimina|eliminen|elimine\\s+usted", object: "autenticacion|autorizacion|auth|tls|https|firewall|revision|aprobacion|seguridad", warning: "Advice may weaken an authentication, transport, review, or security control." },
  { id: "expose_secret", verb: "guarda|guarden|guarde\\s+usted|registra|registren|imprime|impriman|publica|publiquen|envia|envien|envie\\s+usted", object: "contrasena|token|secreto|clave(?:\\s+|[_-])?api|credenciales|credentials?", warning: "Advice may expose or persist credentials/secrets." },
  { id: "run_root", verb: "ejecuta|ejecuten|ejecute\\s+usted|lanza|lancen|lance\\s+usted", object: "como\\s+root", warning: "Advice suggests running work as root.", gap: 24 },
], ["(?<![\\p{L}\\p{N}])(?:no|nunca|evita|eviten|evite\\s+usted)(?![\\p{L}\\p{N}]).{0,40}(?:desactivar|apagar|omitir|eliminar|guardar|registrar|imprimir|publicar|enviar|ejecutar|lanzar)"]);
