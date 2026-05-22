const { spawn } = require('child_process');
const { watch, existsSync } = require('fs');
const path = require('path');

const watchedFiles = [
  'src/lib/hb-f22-report.ts',
  'src/lib/hb-f22-export.ts',
  'src/components/GeneradorHBF22.tsx',
  'src/lib/hb-f22-validation.ts',
  'README_HB-F22.md',
  'IMPLEMENTATION_SUMMARY.md',
];

const root = path.resolve(__dirname, '..');
const debounceMs = 300;
let debounceTimer = null;

const runSync = () => {
  console.log('\n🔄 Cambios detectados. Sincronizando con Lovable...');
  const sync = spawn('bash', ['lovable-export/sync.sh'], {
    cwd: root,
    stdio: 'inherit',
  });

  sync.on('close', code => {
    console.log(`✅ Sincronización completada (${code === 0 ? 'ok' : `error ${code}`})`);
    if (code !== 0) {
      console.error('⚠️ Revisa los mensajes anteriores para ver el error de sincronización.');
    }
  });
};

const scheduleSync = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runSync, debounceMs);
};

console.log('👀 Watcher Lovable iniciado. Escuchando cambios en archivos clave...');

watchedFiles.forEach(relativePath => {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    console.warn(`⚠️ Archivo no encontrado, se omitirá: ${relativePath}`);
    return;
  }

  watch(filePath, (eventType) => {
    if (eventType === 'rename' || eventType === 'change') {
      scheduleSync();
    }
  });

  console.log(`  - ${relativePath}`);
});

console.log('\nEjecuta este watcher con: npm run watch:lovable');
