import fs from 'fs';

const p =
  'C:/Users/gabri/.cursor/projects/c-Users-gabri-OneDrive-Documentos-qthreats/agent-tools/72651fbf-a627-45c7-a546-cffb405ea8e8.txt';
const t = fs.readFileSync(p, 'utf8');
const start = t.indexOf('{"type":"Topology"');
let depth = 0;
let end = start;
for (let i = start; i < t.length; i++) {
  if (t[i] === '{') depth++;
  if (t[i] === '}') depth--;
  if (depth === 0) {
    end = i + 1;
    break;
  }
}
const json = t.slice(start, end);
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/guatemala.topojson', json);
console.log('written bytes', json.length);
