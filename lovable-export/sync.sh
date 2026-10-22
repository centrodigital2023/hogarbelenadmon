#!/bin/bash

# 🚀 SCRIPT DE SINCRONIZACIÓN LOVABLE - HB-F22
# Este script prepara todo para sincronizar con Lovable

echo "🔄 Preparando sincronización con Lovable..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json no encontrado"
  echo "Ejecuta este script desde la raíz del proyecto"
  exit 1
fi

echo "✅ Estructura de proyecto verificada"

# Crear carpeta de exportación si no existe
mkdir -p lovable-export

# Copiar archivos necesarios
echo "📋 Copiando archivos HB-F22..."
cp src/lib/hb-f22-report.ts lovable-export/
cp src/lib/hb-f22-export.ts lovable-export/
cp src/components/GeneradorHBF22.tsx lovable-export/
cp README_HB-F22.md lovable-export/
cp IMPLEMENTATION_SUMMARY.md lovable-export/
echo "✅ Archivos copiados"

# Verificar dependencias
echo "🔍 Verificando dependencias..."
if grep -q '"jspdf"' package.json; then
  echo "✅ jsPDF presente"
else
  echo "⚠️ Advertencia: jsPDF no encontrado en package.json"
fi

if grep -q '"docx"' package.json; then
  echo "✅ docx presente"
else
  echo "⚠️ Advertencia: docx no encontrado en package.json"
fi

if grep -q '"exceljs"' package.json; then
  echo "✅ ExcelJS presente"
else
  echo "⚠️ Advertencia: ExcelJS no encontrado en package.json"
fi

# Contar líneas de código
echo ""
echo "📊 Estadísticas:"
echo "Archivos copiados: 4"
TOTAL_LINES=$(wc -l lovable-export/*.ts 2>/dev/null | tail -1 | awk '{print $1}')
echo "Líneas de código total: $TOTAL_LINES"

echo ""
echo "✨ PRÓXIMOS PASOS:"
echo "1. Ve a tu proyecto Lovable: https://lovable.dev/projects/c9a020a5-6f2c-4b89-aaec-9b2c898ae954"
echo "2. Si aún no está conectado, ve a Settings → Repository → Connect to GitHub"
echo "3. Haz clic en Sync → Pull from GitHub"
echo "4. Los archivos se sincronizarán automáticamente"
echo ""
echo "✅ ¡Sincronización preparada!"
