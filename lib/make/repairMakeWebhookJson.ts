/**
 * Make a veces devuelve pseudo-arrays inválidos:
 * "conflicted_deputies": { ... }, { ... }
 * en lugar de [ { ... }, { ... } ]
 */
function repairPseudoArrayField(json: string, key: string): string {
  const needle = `"${key}"`;
  const idx = json.indexOf(needle);
  if (idx === -1) return json;

  const colon = json.indexOf(':', idx + needle.length);
  if (colon === -1) return json;

  let pos = colon + 1;
  while (pos < json.length && /\s/.test(json[pos])) pos++;
  if (json[pos] !== '{') return json;

  const start = pos;
  let depth = 0;
  let i = start;
  let ended = false;

  for (; i < json.length; i++) {
    const ch = json[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        let j = i + 1;
        while (j < json.length && /\s/.test(json[j])) j++;
        if (json[j] === ',') {
          let k = j + 1;
          while (k < json.length && /\s/.test(json[k])) k++;
          if (json[k] === '{') {
            i = j;
            continue;
          }
        }
        ended = true;
        break;
      }
    }
  }

  if (!ended) return json;

  const block = json.slice(start, i + 1);
  const parts = block.split(/\}\s*,\s*\{/);
  const items = parts.map((part, partIdx, arr) => {
    let p = part.trim();
    if (partIdx === 0 && !p.startsWith('{')) p = `{${p}`;
    else if (partIdx > 0) p = `{${p}`;
    if (partIdx < arr.length - 1 && !p.endsWith('}')) p = `${p}}`;
    return p;
  });

  const array = `[${items.join(',')}]`;
  return json.slice(0, pos - 1) + array + json.slice(i + 1);
}

export function repairMakeWebhookJson(raw: string): string {
  let s = raw;
  for (const key of ['conflicted_deputies', 'relationships']) {
    s = repairPseudoArrayField(s, key);
  }
  return s;
}

export function parseMakeWebhookJson<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const repaired = repairMakeWebhookJson(raw);
    return JSON.parse(repaired) as T;
  }
}
