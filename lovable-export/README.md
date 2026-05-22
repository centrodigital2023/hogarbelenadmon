# 🎯 INSTRUCCIONES RÁPIDAS - LOVABLE INTEGRATION

## ¿Qué es esto?

Este es tu **kit de integración HB-F22 para Lovable**. Contiene todos los archivos necesarios para sincronizar el Informe Inteligente con tu proyecto.

---

## 🚀 OPCIÓN 1: Sincronización Automática (⭐ Recomendado)

**Requisito**: Tu proyecto Lovable debe estar conectado a GitHub

### Paso 1: Configurar Conexión GitHub en Lovable

1. Abre tu proyecto en Lovable:  
   👉 https://lovable.dev/projects/ea6fc079-e3d3-421b-9a3b-b62e3ddcdc44
   👉 O usa el magic link si lo tienes: `https://lovable.dev/projects/ea6fc079-e3d3-421b-9a3b-b62e3ddcdc44?magic_link=mc_9e427cc0-6ae2-43eb-9a14-82b9c65eb2d0`

2. Haz clic en el **engranaje** (⚙️) en la esquina superior derecha
> Nota: tu proyecto puede estar conectado a `centrodigital2023/hogarbelenadmon` o a `centrodigital2023/humanix-care-connect`.

> Desde la raíz del repositorio también puedes ejecutar:
>
> ```bash
> npm run sync:lovable
> ```>
> Para sincronizar automáticamente al guardar cambios locales, usa:
>
> ```bash
> npm run watch:lovable
> ```
>
> Esto mantiene `lovable-export/` actualizado con los archivos HB-F22 cada vez que se editan.3. Ve a **Repository** / **Repositorio**

4. Si no está conectado a GitHub:
   - Haz clic en **"Connect to GitHub"** / **"Conectar a GitHub"**
   - Selecciona: `centrodigital2023/hogarbelenadmon`
   - Haz clic en **Authorize** / **Autorizar**

5. Confirma que el branch es **main**

### Paso 2: Sincronizar Cambios

1. En Lovable, haz clic en **Sync** (esquina superior derecha)

2. Haz clic en **"Pull from GitHub"** / **"Traer de GitHub"**

3. Verifica los cambios a sincronizar

4. Haz clic en **Sync**

### Paso 3: Verificar Sincronización

Espera 1-2 minutos. Luego verifica en el **File Tree** (izquierda):

```
✅ src/lib/hb-f22-report.ts
✅ src/lib/hb-f22-export.ts
✅ src/components/GeneradorHBF22.tsx
✅ src/lib/hb-f22-validation.ts
```

---

## 📋 OPCIÓN 2: Importación Manual

**Si no tienes GitHub conectado o prefieres copy/paste**

### Paso 1: Crear Archivos en Lovable

En tu proyecto Lovable:

#### Archivo 1: `src/lib/hb-f22-report.ts`

1. Haz clic en **New File** (botón "+")
2. Nombre: `src/lib/hb-f22-report.ts`
3. Abre `hb-f22-report.ts` en esta carpeta (lovable-export)
4. Copia **TODO el contenido**
5. Pega en Lovable
6. Haz clic en **Save** (Ctrl+S)

**Repite para**:
- `hb-f22-export.ts` → `src/lib/hb-f22-export.ts`
- `hb-f22-validation.ts` → `src/lib/hb-f22-validation.ts`
- `GeneradorHBF22.tsx` → `src/components/GeneradorHBF22.tsx`

### Paso 2: Verificar Dependencias

En Lovable, abre `package.json` y asegúrate que tiene:

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "docx": "^9.5.0",
    "exceljs": "^4.4.0",
    "file-saver": "^2.0.5",
    "react": "^18.3.1"
  }
}
```

Si no están, agrégalas y guarda.

---

## ✅ VERIFICACIÓN POST-IMPORTACIÓN

Abre la **consola de desarrollador** (F12) y verifica:

```javascript
// En la consola, ejecuta:
console.log("HB-F22 Integration Check");

// Debería poder importar:
import { buildHBF22Report } from "@/lib/hb-f22-report";
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";

console.log("✅ Imports OK");
```

Si ves errores rojos, verifica:
- [ ] Los archivos están en la ruta correcta
- [ ] No hay errores de sintaxis
- [ ] Las dependencias están instaladas

---

## 🔧 USAR EN TU COMPONENTE

Una vez sincronizado, usa en cualquier componente:

```typescript
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";

export function TuComponente() {
  return (
    <GeneradorHBF22
      residentId="123"
      residentName="Juan Pérez"
      residentAge={75}
      residentGender="M"
      docId="12345678"
      assessmentResults={{
        barthel: { score: 45 },
        lawton: { score: 3 },
        tinetti: { score: 18 },
        mna: { score: 16 },
        pfeiffer: { score: 7 },
        mmse: { score: 18 },
        yesavage: { score: 12 },
        gijón: { score: 11 },
        braden: { score: 12 },
        charlson: { score: 3 },
        zarit: { score: 25 }
      }}
      professionalName="Dr. García"
      role="Geriatra"
      nit="901.904.984-0"
      onReportGenerated={(report) => {
        console.log("Informe generado:", report);
      }}
    />
  );
}
```

---

## 📊 ¿QUÉ HACE?

El **Informe Inteligente HB-F22** proporciona:

✨ **Análisis Inteligente**
- Correlaciona 12 escalas geriátricas automáticamente
- Genera alertas inteligentes (ALTO/MODERADO/BAJO)
- Crea plan de cuidado personalizado (9 programas)

📄 **Exportación Multi-Formato**
- 📕 PDF profesional con logo corporativo
- 📗 Word editable (compatible Microsoft Office)
- 📙 Excel con 4 hojas de análisis

🎨 **Estilos Corporativos**
- Color Hogar Belén (#C8102E)
- Márgenes profesionales 2cm
- Logo integrado

---

## 🐛 TROUBLESHOOTING

### ❌ "Cannot find module"

**Solución**:
```typescript
// ❌ Mal
import { GeneradorHBF22 } from "./GeneradorHBF22";

// ✅ Bien
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";
```

### ❌ "jsPDF not found"

**Solución**:
1. Ve a `package.json`
2. Agrega en `dependencies`:
   ```json
   "jspdf": "^2.5.1",
   "docx": "^9.5.0",
   "exceljs": "^4.4.0",
   "file-saver": "^2.0.5"
   ```
3. Guarda
4. Lovable instalará automáticamente

### ❌ Los cambios de GitHub no se sincronizaban

**Solución**:
1. En Lovable Settings → Repository
2. Haz clic en **Resync**
3. O tira manualmente: **Sync** → **Pull from GitHub**

---

## 📚 ARCHIVOS INCLUIDOS

```
hb-f22-report.ts           (700 líneas) - Lógica de análisis
hb-f22-export.ts           (1100 líneas) - Exportación multi-formato
GeneradorHBF22.tsx         (300 líneas) - Componente React
hb-f22-validation.ts       (250 líneas) - Validador
sync.sh                    - Script de sincronización
README.md                  - Estas instrucciones
```

---

## 📞 DOCUMENTACIÓN COMPLETA

Para documentación más detallada, ver:
- `../LOVABLE_INTEGRATION_GUIDE.md` - Guía completa
- `../README_HB-F22.md` - Referencia rápida
- `../IMPLEMENTATION_SUMMARY.md` - Resumen ejecutivo

---

## ✨ ¡LISTO!

Tu proyecto Lovable ahora tiene el Informe Inteligente HB-F22 completamente integrado.

**¿Dudas?** Revisa la guía completa en `LOVABLE_INTEGRATION_GUIDE.md`
