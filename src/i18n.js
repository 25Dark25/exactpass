// Message catalog. Library code throws ExactpassError(code, params); the CLI and the web UI translate by code.
// English is the default language, Spanish the secondary one.
export const LANGS = ["en", "es"];

const en = {
  "err.minbits": "minBits must be a finite number greater than 0.",
  "err.alphabet_chars": "The alphabet cannot contain spaces, control characters or combining marks.",
  "err.alphabet_nfc": "The alphabet must be in NFC form (equivalent Unicode sequences would count as different characters).",
  "err.alphabet_size": "The alphabet needs at least 2 distinct characters.",
  "err.group_empty": "A character group became empty after removing overlaps or lookalike characters; adjust the custom symbols.",
  "err.unreachable": "Cannot reach {minBits} bits with a length of at most {max}.",
  "err.length": "Length must be an integer between {min} and {max}.",
  "err.below_min": "This configuration gives only {bits} bits (< {minBits}). Increase the length or alphabet, or lower the minimum explicitly.",
  "err.sparse": "The constraints would reject more than 99.9% of samples; relax them.",
  "err.sampling": "Could not sample a valid string; relax the constraints.",
  "err.duplicates": "The word list has {n} duplicate words: the real entropy would be lower than calculated.",
  "err.separator_type": "The separator must be a string.",
  "err.wordlist": "Invalid word list: at least 2 unique words are required.",
  "err.capitalize_merge": "Capitalization makes distinct list words identical: the real entropy would be lower than calculated.",
  "err.words": "The number of words must be an integer between 1 and 64.",
  "err.words_below_min": "{n} words from a list of {size} give only {bits} bits (< {minBits}). Use more words or lower the minimum explicitly.",
  "err.bytes": "bytes must be an integer between 1 and 1024.",
  "err.bytes_below_min": "{bytes} bytes = {bits} bits (< {minBits}).",
  "err.format": "format must be hex, base64 or base64url.",
  "warn.separator_ambiguous": "With this separator, different word sequences can produce the same string: the stated entropy is an UPPER BOUND, not an exact value. Use a separator that is not part of the words.",

  "est.ref.256": "≥ AES-256 key search", "est.ref.192": "≥ AES-192 key search", "est.ref.128": "≥ AES-128 key search",
  "est.ref.low": "BELOW AES-128 (NIST reference level 1)",
  "est.lt1s": "< 1 second", "est.s": "seconds", "est.m": "minutes", "est.h": "hours", "est.d": "days", "est.y": "years",
  "est.pow": "~10^{x} years", "est.sci": "~{x} years",

  "cli.help": `exactpass <password|passphrase|key> [options]

  --min-bits N          Mandatory minimum entropy (default 128). Nothing is generated below it.
  password:   --length N  --no-symbols  --exclude-lookalikes  --no-require-each
  passphrase: --wordlist FILE (required)  --words N  --separator S  --capitalize
  key:        --bytes N (default 32)  --format hex|base64|base64url
  Analysis:   --rate N (classical guesses/s, default 1e12)  --qrate N (Grover iterations/s)
  Output:     --json   (without --json: secret on stdout, report on stderr)
  Language:   --lang en|es   (or the EXACTPASS_LANG environment variable)`,
  "cli.l.entropy": "Exact entropy", "cli.l.reference": "Reference", "cli.l.classical": "Classical search",
  "cli.l.grover": "Grover (sequential)", "cli.l.sha": "List SHA-256", "cli.l.warning": "Warning",
  "cli.entropy": "{bits} bits (uniform space of 2^{bits} possibilities)",
  "cli.classical": "~2^{log} expected guesses → {time} at {rate} guesses/s",
  "cli.grover": "~2^{log} iterations", "cli.grover_t": " → {time}", "cli.grover_hint": " (pass --qrate to estimate time)",
  "cli.assumptions": "Assumptions: uniform secret; the attacker knows the method and the alphabet/list; real speed depends on the KDF and hardware.",
  "cli.err.prefix": "Error:", "cli.err.int": "--{name} must be a positive integer.", "cli.err.num": "--{name} must be a positive number.",
  "cli.err.wordlist": "passphrase requires --wordlist (see wordlists/README.md).",
  "cli.err.mode": "Unknown mode: {mode}", "cli.err.lang": "Unknown language: {lang} (use en or es).",

  "ui.lead": "Generate secrets whose entropy is calculated, not estimated. If the configuration does not reach the minimum you set, nothing is generated. Everything runs in this browser.",
  "ui.group": "Secret type", "ui.tab.password": "Password", "ui.tab.passphrase": "Passphrase", "ui.tab.key": "Binary key",
  "ui.length": "Length", "ui.auto": "automatic", "ui.auto_m": "automatic", "ui.chars": "Characters",
  "ui.lower": "lowercase", "ui.upper": "uppercase", "ui.digits": "digits", "ui.symbols": "symbols",
  "ui.lookalikes": "Exclude lookalike characters (0 O 1 l I |)", "ui.each": "Require at least one of each type",
  "ui.words": "Words", "ui.sep": "Separator", "ui.cap": "Capitalize the first letter (adds no entropy)",
  "ui.wl.load": "Load another list (.txt)", "ui.bytes": "Bytes", "ui.format": "Format",
  "ui.minbits": "Minimum entropy", "ui.generate": "Generate", "ui.copy": "Copy", "ui.hide": "Hide", "ui.show": "Show",
  "ui.copied": "Copied. It will be overwritten in 30 s.",
  "ui.copy_blocked": "The browser blocked the clipboard: select the text and copy it by hand.",
  "ui.legend": "The thin ticks mark 128, 192 and 256 bits (AES-128, 192 and 256 key search). The thick tick is your minimum.",
  "ui.assumptions": "Analysis assumptions", "ui.rate": "Classical guesses per second", "ui.qrate": "Grover iterations per second",
  "ui.qrate_ph": "no default",
  "ui.assumptions_note": "The secret is assumed uniform and the attacker knows the method and the alphabet or list. Real speed depends on the KDF and hardware; these two fields are your assumptions, not data.",
  "ui.footer": "This page stores and sends nothing. The generated value exists only in this tab's memory and, if you copy it, in the clipboard.",
  "ui.lang_switch": "Cambiar a español", "ui.ruler": "Exact entropy: {bits} bits; minimum set: {min} bits",
  "ui.s.entropy": "Exact entropy", "ui.s.composition": "Composition", "ui.s.reference": "Reference",
  "ui.s.classical": "Classical search", "ui.s.grover": "Grover (sequential)", "ui.s.warning": "Warning",
  "ui.d.password": "{len} characters from an alphabet of {size}",
  "ui.d.passphrase": "{words} words from a list of {size} (SHA-256 {hash}…)", "ui.d.key": "{bytes} random bytes",
  "ui.classical": "~2^{log} guesses: {time} at {rate} per second",
  "ui.grover": "~2^{log} iterations", "ui.grover_t": ": {time}", "ui.grover_hint": " (set a rate under Analysis assumptions to estimate time)",
  "ui.wl.searching": "Looking for wordlists/eff_large_wordlist.txt…",
  "ui.wl.loaded": "List loaded: {n} words ({bits} bits per word). SHA-256: {hash}…",
  "ui.wl.missing": "No list found at wordlists/eff_large_wordlist.txt. Load one with the file picker.",
  "ui.wl.needed": "The word list is missing. Put eff_large_wordlist.txt in wordlists/ and reload, or load it with the file picker.",
  "ui.err.length": "Length must be a positive integer.", "ui.err.words": "The number of words must be a positive integer.",
  "ui.err.bytes": "The number of bytes must be a positive integer.", "ui.err.rate": "Classical guesses per second must be a positive number (e.g. 1e12).",
  "ui.err.qrate": "Grover iterations per second must be a positive number (e.g. 1e6).", "ui.raw": "{m}",
};

const es = {
  "err.minbits": "minBits debe ser un número finito mayor que 0.",
  "err.alphabet_chars": "El alfabeto no puede contener espacios, caracteres de control ni marcas combinantes.",
  "err.alphabet_nfc": "El alfabeto debe estar en forma NFC (dos secuencias Unicode equivalentes contarían como caracteres distintos).",
  "err.alphabet_size": "El alfabeto necesita al menos 2 caracteres distintos.",
  "err.group_empty": "Un grupo de caracteres quedó vacío tras quitar solapamientos o caracteres confusos; ajusta los símbolos personalizados.",
  "err.unreachable": "No se alcanzan {minBits} bits con una longitud de como máximo {max}.",
  "err.length": "La longitud debe ser un entero entre {min} y {max}.",
  "err.below_min": "Esta configuración da solo {bits} bits (< {minBits}). Aumenta la longitud o el alfabeto, o baja el mínimo de forma explícita.",
  "err.sparse": "Las restricciones rechazarían más del 99,9 % de las muestras; relájalas.",
  "err.sampling": "No se pudo muestrear una cadena válida; relaja las restricciones.",
  "err.duplicates": "La lista tiene {n} palabras duplicadas: la entropía real sería menor que la calculada.",
  "err.separator_type": "El separador debe ser una cadena de texto.",
  "err.wordlist": "Lista de palabras inválida: se necesitan al menos 2 palabras únicas.",
  "err.capitalize_merge": "La capitalización hace idénticas palabras distintas de la lista: la entropía real sería menor que la calculada.",
  "err.words": "El número de palabras debe ser un entero entre 1 y 64.",
  "err.words_below_min": "{n} palabras de una lista de {size} dan solo {bits} bits (< {minBits}). Usa más palabras o baja el mínimo de forma explícita.",
  "err.bytes": "bytes debe ser un entero entre 1 y 1024.",
  "err.bytes_below_min": "{bytes} bytes = {bits} bits (< {minBits}).",
  "err.format": "format debe ser hex, base64 o base64url.",
  "warn.separator_ambiguous": "Con este separador, secuencias de palabras distintas pueden dar la misma cadena: la entropía indicada es una COTA SUPERIOR, no un valor exacto. Usa un separador que no forme parte de las palabras.",

  "est.ref.256": "≥ búsqueda de clave AES-256", "est.ref.192": "≥ búsqueda de clave AES-192", "est.ref.128": "≥ búsqueda de clave AES-128",
  "est.ref.low": "POR DEBAJO de AES-128 (nivel 1 de referencia de NIST)",
  "est.lt1s": "< 1 segundo", "est.s": "segundos", "est.m": "minutos", "est.h": "horas", "est.d": "días", "est.y": "años",
  "est.pow": "~10^{x} años", "est.sci": "~{x} años",

  "cli.help": `exactpass <password|passphrase|key> [opciones]

  --min-bits N          Entropía mínima OBLIGATORIA (defecto 128). Por debajo no genera nada.
  password:   --length N  --no-symbols  --exclude-lookalikes  --no-require-each
  passphrase: --wordlist FICHERO (obligatorio)  --words N  --separator S  --capitalize
  key:        --bytes N (defecto 32)  --format hex|base64|base64url
  Análisis:   --rate N (intentos clásicos/s, defecto 1e12)  --qrate N (iteraciones de Grover/s)
  Salida:     --json   (sin --json: secreto en stdout, informe en stderr)
  Idioma:     --lang en|es   (o la variable de entorno EXACTPASS_LANG)`,
  "cli.l.entropy": "Entropía exacta", "cli.l.reference": "Referencia", "cli.l.classical": "Búsqueda clásica",
  "cli.l.grover": "Grover (secuencial)", "cli.l.sha": "SHA-256 de la lista", "cli.l.warning": "Aviso",
  "cli.entropy": "{bits} bits (espacio uniforme de 2^{bits} posibilidades)",
  "cli.classical": "~2^{log} intentos esperados → {time} a {rate} intentos/s",
  "cli.grover": "~2^{log} iteraciones", "cli.grover_t": " → {time}", "cli.grover_hint": " (pasa --qrate para estimar el tiempo)",
  "cli.assumptions": "Supuestos: secreto uniforme; el atacante conoce el método y el alfabeto o la lista; la velocidad real depende del KDF y del hardware.",
  "cli.err.prefix": "Error:", "cli.err.int": "--{name} debe ser un entero positivo.", "cli.err.num": "--{name} debe ser un número positivo.",
  "cli.err.wordlist": "passphrase requiere --wordlist (ver wordlists/README.md).",
  "cli.err.mode": "Modo desconocido: {mode}", "cli.err.lang": "Idioma desconocido: {lang} (usa en o es).",

  "ui.lead": "Genera secretos con la entropía calculada, no estimada. Si la configuración no llega al mínimo que fijes, no genera nada. Todo ocurre en este navegador.",
  "ui.group": "Tipo de secreto", "ui.tab.password": "Contraseña", "ui.tab.passphrase": "Passphrase", "ui.tab.key": "Clave binaria",
  "ui.length": "Longitud", "ui.auto": "automática", "ui.auto_m": "automático", "ui.chars": "Caracteres",
  "ui.lower": "minúsculas", "ui.upper": "mayúsculas", "ui.digits": "dígitos", "ui.symbols": "símbolos",
  "ui.lookalikes": "Excluir caracteres que se confunden (0 O 1 l I |)", "ui.each": "Exigir al menos uno de cada tipo",
  "ui.words": "Palabras", "ui.sep": "Separador", "ui.cap": "Primera letra en mayúscula (no añade entropía)",
  "ui.wl.load": "Cargar otra lista (.txt)", "ui.bytes": "Bytes", "ui.format": "Formato",
  "ui.minbits": "Entropía mínima", "ui.generate": "Generar", "ui.copy": "Copiar", "ui.hide": "Ocultar", "ui.show": "Mostrar",
  "ui.copied": "Copiado. Se sobrescribirá en 30 s.",
  "ui.copy_blocked": "El navegador bloqueó el portapapeles: selecciona el texto y cópialo a mano.",
  "ui.legend": "Las marcas finas señalan 128, 192 y 256 bits (búsqueda de clave AES-128, 192 y 256). La marca gruesa es tu mínimo.",
  "ui.assumptions": "Supuestos del análisis", "ui.rate": "Intentos clásicos por segundo", "ui.qrate": "Iteraciones de Grover por segundo",
  "ui.qrate_ph": "sin valor por defecto",
  "ui.assumptions_note": "Se supone un secreto uniforme y un atacante que conoce el método y el alfabeto o la lista. La velocidad real depende del KDF y del hardware; estos dos campos son hipótesis tuyas, no datos.",
  "ui.footer": "Esta página no guarda ni envía nada. El valor generado solo existe en la memoria de esta pestaña y, si lo copias, en el portapapeles.",
  "ui.lang_switch": "Switch to English", "ui.ruler": "Entropía exacta: {bits} bits; mínimo fijado: {min} bits",
  "ui.s.entropy": "Entropía exacta", "ui.s.composition": "Composición", "ui.s.reference": "Referencia",
  "ui.s.classical": "Búsqueda clásica", "ui.s.grover": "Grover (secuencial)", "ui.s.warning": "Aviso",
  "ui.d.password": "{len} caracteres de un alfabeto de {size}",
  "ui.d.passphrase": "{words} palabras de una lista de {size} (SHA-256 {hash}…)", "ui.d.key": "{bytes} bytes aleatorios",
  "ui.classical": "~2^{log} intentos: {time} a {rate} por segundo",
  "ui.grover": "~2^{log} iteraciones", "ui.grover_t": ": {time}", "ui.grover_hint": " (indica un ritmo en Supuestos del análisis para estimar el tiempo)",
  "ui.wl.searching": "Buscando wordlists/eff_large_wordlist.txt…",
  "ui.wl.loaded": "Lista cargada: {n} palabras ({bits} bits por palabra). SHA-256: {hash}…",
  "ui.wl.missing": "No hay lista en wordlists/eff_large_wordlist.txt. Cárgala con el selector de archivo.",
  "ui.wl.needed": "Falta la lista de palabras. Guarda eff_large_wordlist.txt en wordlists/ y recarga, o cárgala con el selector de archivo.",
  "ui.err.length": "La longitud debe ser un entero positivo.", "ui.err.words": "El número de palabras debe ser un entero positivo.",
  "ui.err.bytes": "El número de bytes debe ser un entero positivo.", "ui.err.rate": "Los intentos clásicos por segundo deben ser un número positivo (p. ej. 1e12).",
  "ui.err.qrate": "Las iteraciones de Grover por segundo deben ser un número positivo (p. ej. 1e6).", "ui.raw": "{m}",
};

export const CATALOGS = { en, es };

/** Translate `key` into `lang` (falls back to English, then to the key itself). */
export function t(lang, key, params = {}) {
  const s = (CATALOGS[lang] ?? en)[key] ?? en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
}

/** Error with a stable `code` (translatable) and an English `message`. */
export class ExactpassError extends Error {
  constructor(code, params = {}) {
    super(t("en", code, params));
    this.name = "ExactpassError";
    this.code = code;
    this.params = params;
  }
}
