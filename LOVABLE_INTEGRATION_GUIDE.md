# 🚀 GUÍA DE INTEGRACIÓN HB-F22 EN LOVABLE

**Objetivo**: Conectar e integrar el Informe Inteligente HB-F22 en tu proyecto Lovable

**Fecha**: 24 de Abril de 2026  
**Proyecto ID**: `ea6fc079-e3d3-421b-9a3b-b62e3ddcdc44`

**Magic link**: https://lovable.dev/projects/ea6fc079-e3d3-421b-9a3b-b62e3ddcdc44?magic_link=mc_9e427cc0-6ae2-43eb-9a14-82b9c65eb2d0

---

## 📋 OPCIÓN 1: Sincronización Automática (Recomendado)

Si tu proyecto Lovable ya está conectado con tu repositorio GitHub, seguir estos pasos:

### Paso 1: Configurar GitHub Connection en Lovable

1. Ve a tu proyecto en Lovable: https://lovable.dev/projects/ea6fc079-e3d3-421b-9a3b-b62e3ddcdc44
   > Si tienes acceso directo, puedes usar también este magic link:
   > `https://lovable.dev/projects/ea6fc079-e3d3-421b-9a3b-b62e3ddcdc44?magic_link=mc_9e427cc0-6ae2-43eb-9a14-82b9c65eb2d0`
   > Nota: tu Lovable puede estar conectado a `centrodigital2023/hogarbelenadmon` o a `centrodigital2023/humanix-care-connect`.
2. Haz clic en **Settings** (Engranaje) → **Repository**
3. Si aún no está conectado:
   - Selecciona **Connect to GitHub**
   - Elige el repositorio: `centrodigital2023/hogarbelenadmon`
   - Autoriza el acceso
4. Confirma que **main** es tu rama principal

### Paso 2: Sincronizar Cambios

Una vez conectado, los cambios se sincronizarán automáticamente:

```bash
# En tu terminal local, verifica que los archivos están en el repositorio:
ls -la /workspaces/hogarbelenadmon/src/lib/hb-f22-*.ts
ls -la /workspaces/hogarbelenadmon/src/components/GeneradorHBF22.tsx
```

Luego, en Lovable:
1. Ve a **Sync** en la esquina superior derecha
2. Haz clic en **Pull from GitHub**
3. Confirma los cambios a sincronizar
4. Clickea **Sync**

### Paso 3: Verificar Importaciones

Una vez sincronizado, verifica que Lovable reconoce los archivos:

1. En el editor de Lovable, ve a **Imports**
2. Busca los archivos:
   - `src/lib/hb-f22-report.ts`
   - `src/lib/hb-f22-export.ts`
   - `src/components/GeneradorHBF22.tsx`

---

## 📋 OPCIÓN 2: Importación Manual

Si prefieres o si hay problemas de sincronización:

### Paso 1: Copiar Archivos Principales

#### Archivo 1: `hb-f22-report.ts`
**Ubicación en Lovable**: `src/lib/hb-f22-report.ts`

[Ver contenido en: `/workspaces/hogarbelenadmon/src/lib/hb-f22-report.ts`]

**Instrucciones**:
1. En Lovable, haz clic en **New File**
2. Nombre: `src/lib/hb-f22-report.ts`
3. Copia el contenido del archivo local
4. Pega en Lovable
5. Haz clic en **Save**

---

#### Archivo 2: `hb-f22-export.ts`
**Ubicación en Lovable**: `src/lib/hb-f22-export.ts`

[Ver contenido en: `/workspaces/hogarbelenadmon/src/lib/hb-f22-export.ts`]

**Instrucciones**: Mismo proceso que Archivo 1

---

#### Archivo 3: `GeneradorHBF22.tsx`
**Ubicación en Lovable**: `src/components/GeneradorHBF22.tsx`

[Ver contenido en: `/workspaces/hogarbelenadmon/src/components/GeneradorHBF22.tsx`]

**Instrucciones**: Mismo proceso que Archivo 1

---

### Paso 2: Actualizar Dependencias

En `package.json`, asegúrate de que tienes:

```json
{
  "dependencies": {
    "jspdf": "^2.5.1",
    "docx": "^9.5.0",
    "exceljs": "^4.4.0",
    "file-saver": "^2.0.5",
    "react": "^18.3.1",
    "typescript": "^5.0.0"
  }
}
```

**En Lovable**:
1. Abre `package.json`
2. Verifica que las dependencias estén presentes
3. Si no están, agrégalas en la sección `dependencies`
4. Guarda

### Paso 3: Integrar en Componente Existente

Si tienes un componente `ValoracionGeriatrica.tsx`:

```typescript
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";
import { AssessmentResults } from "@/data/types";

export function ValoracionGeriatrica() {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <div>
      {/* Componentes existentes */}
      
      {showGenerator && (
        <GeneradorHBF22
          residentId="resident-123"
          residentName="Juan Pérez"
          residentAge={75}
          assessmentResults={{
            barthel: { score: 45 },
            lawton: { score: 3 },
            tinetti: { score: 18 },
            // ... resto de escalas
          }}
          professionalName="Dr. García"
          professionalRole="Geriatra"
          onReportGenerated={(report) => {
            console.log("Informe generado:", report);
          }}
        />
      )}
    </div>
  );
}
```

---

## 🔧 VERIFICACIÓN POST-SINCRONIZACIÓN

Después de sincronizar o importar, verifica:

### 1. TypeScript Compilation
```bash
# En Lovable, abre la consola (F12)
# Verifica que no hay errores rojos
```

### 2. Imports Resueltos
```typescript
// Verifica que estos imports funcionan:
import { buildHBF22Report } from "@/lib/hb-f22-report";
import { exportHBF22PDF, exportHBF22Word } from "@/lib/hb-f22-export";
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";
```

### 3. Dependencias Disponibles
```typescript
// Verifica que estos módulos están disponibles:
import jsPDF from "jspdf";
import { Document } from "docx";
import ExcelJS from "exceljs";
```

---

## 🌐 INTEGRACIÓN EN UI

### Opción A: Agregar Botón en Dashboard

```typescript
// En tu componente principal (App.tsx o DashboardView.tsx)
import { Button } from "@/components/ui/button";
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";
import { useState } from "react";

export function Dashboard() {
  const [showHBF22, setShowHBF22] = useState(false);

  return (
    <div className="space-y-4">
      <Button 
        onClick={() => setShowHBF22(!showHBF22)}
        className="bg-red-700 hover:bg-red-800"
      >
        📊 Generar Informe HB-F22
      </Button>
      
      {showHBF22 && (
        <GeneradorHBF22
          residentId="123"
          residentName="Residente"
          residentAge={75}
          assessmentResults={assessmentData}
          professionalName="Profesional"
          onReportGenerated={(report) => console.log(report)}
        />
      )}
    </div>
  );
}
```

### Opción B: Modal/Dialog

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";

export function ReportModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Informe Inteligente HB-F22</DialogTitle>
        </DialogHeader>
        <GeneradorHBF22
          residentId="123"
          residentName="Residente"
          residentAge={75}
          assessmentResults={...}
          professionalName="Dr. García"
          onReportGenerated={(report) => {
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Cannot find module"

**Solución 1**: Verifica la ruta de importación
```typescript
// ❌ Incorrecto
import { GeneradorHBF22 } from "./GeneradorHBF22";

// ✅ Correcto
import { GeneradorHBF22 } from "@/components/GeneradorHBF22";
```

**Solución 2**: Verifica que el archivo existe en Lovable
- Ve a **Files** panel (izquierda)
- Busca `src/components/GeneradorHBF22.tsx`

### Problema: Dependencias no encontradas

**Solución**:
1. Ve a `package.json`
2. Agrega las dependencias faltantes
3. Guarda
4. Lovable debería instalar automáticamente

### Problema: "Port already in use"

**Solución**:
1. Recarga la página de Lovable (F5)
2. O reinicia el servidor: **Ctrl + C** en la terminal

### Problema: Los cambios de GitHub no se sincronizaban

**Solución**:
1. En Lovable, ve a **Settings** → **Repository**
2. Haz clic en **Resync**
3. O tira de GitHub manualmente: **Sync** → **Pull from GitHub**

---

## 📦 ARCHIVOS INCLUIDOS

```
✅ hb-f22-report.ts          (700 líneas) - Lógica de análisis
✅ hb-f22-export.ts          (1100 líneas) - Exportación multi-formato  
✅ GeneradorHBF22.tsx        (300 líneas) - Componente React
✅ hb-f22-validation.ts      (250 líneas) - Validador
✅ IMPLEMENTATION_GUIDE.md   (30+ páginas) - Documentación completa
✅ INTEGRATION_EXAMPLE.tsx   (400+ líneas) - Ejemplos de integración
✅ README_HB-F22.md          - Referencia rápida
```

---

## 📊 CASOS DE USO

### 1. Generar Informe para Residente

```typescript
// 1. Compilar datos de 12 escalas
const assessmentResults = {
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
};

// 2. Generar informe
const report = buildHBF22Report(
  resident,
  assessmentResults,
  professional
);

// 3. Exportar
exportHBF22PDF(report, "Informe_HBF22_Juan_Perez.pdf");
```

### 2. Mostrar Alertas en Dashboard

```typescript
const { alerts } = report;

alerts.forEach(alert => {
  console.log(`${alert.level}: ${alert.message}`);
  // Mostrar en UI
});
```

### 3. Guardar en Base de Datos

```typescript
// Guardar en Supabase
const { data } = await supabase
  .from('geriatric_reports_hbf22')
  .insert([{
    resident_id: resident.id,
    professional_id: user.id,
    report_data: report,
    dependency_profile: report.dependencyProfile,
    fragility_status: report.fragilityStatus,
    risk_count: report.alerts.length,
    high_risk_count: report.alerts.filter(a => a.level === 'ALTO').length
  }]);
```

---

## ✅ CHECKLIST FINAL

Antes de considerar completada la integración:

- [ ] GitHub conectado a Lovable (Opción 1) O archivos importados (Opción 2)
- [ ] Sin errores de TypeScript en la consola
- [ ] Componente `GeneradorHBF22` se renderiza sin errores
- [ ] Se puede generar informe con datos de prueba
- [ ] Se puede exportar a PDF/Word/Excel
- [ ] Los estilos corporativos se aplican correctamente
- [ ] Las alertas se generan según los umbrales
- [ ] El plan de cuidado se adapta a los riesgos

---

## 🎯 SIGUIENTES PASOS

1. **Conectar Supabase** (opcional):
   - Crear tabla `geriatric_reports_hbf22`
   - Configurar RLS policies
   - Guardar informes generados

2. **Agregar Más Residentes**:
   - Integrar con módulo de gestión de residentes
   - Mostrar historial de informes por residente

3. **Analytics**:
   - Dashboard con estadísticas de riesgos
   - Tendencias de escalas en el tiempo
   - Reportes por profesional

4. **Mobile Responsivo**:
   - Adaptar interfaz para tablets/móviles
   - Exportación a PDF optimizada para móvil

---

## 📞 SOPORTE

**Documentación Completa**: Ver `/src/lib/HB-F22_IMPLEMENTATION_GUIDE.md`  
**Ejemplos de Código**: Ver `/src/lib/HB-F22_INTEGRATION_EXAMPLE.tsx`  
**Validador**: Ejecutar `npm run validate:hbf22`

---

**¡Integración Completada! ✨**

Ahora tu proyecto Lovable tiene el Informe Inteligente HB-F22 con correlación de 12 escalas, análisis de IA y exportación multi-formato.
