import fs from 'fs';

const t = fs.readFileSync(
  'C:/Users/gabri/.cursor/projects/c-Users-gabri-OneDrive-Documentos-qthreats/agent-tools/72651fbf-a627-45c7-a546-cffb405ea8e8.txt',
  'utf8',
);
const idx = t.indexOf('## index.html');
console.log(t.slice(idx, idx + 5000));
