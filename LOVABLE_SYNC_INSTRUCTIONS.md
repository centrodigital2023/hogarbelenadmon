# 🔄 GUÍA DE SINCRONIZACIÓN CON LOVABLE

## Opción 1: Sincronización Automática (Recomendado)

Si tu proyecto Lovable está conectado a GitHub:

```bash
# En tu terminal local
cd /workspaces/hogarbelenadmon

# 1. Verifica que todo esté en git
git status

# 2. Agrega todos los cambios
git add .

# 3. Crea un commit descriptivo
git commit -m "feat: agregar historial de 180 días con exportación a Word, PDF, Excel para módulos HB-G01 a HB-G06"

# 4. Sube a GitHub
git push origin main
```

Luego en Lovable:
1. Abre tu proyecto
2. Ve a Settings → Git Sync
3. Haz clic en "Pull Latest Changes"
4. Los cambios se sincronizarán automáticamente

---

## Opción 2: Importar Archivos en Lovable (Manual)

Si prefieres importar manualmente, copia estos archivos en Lovable:

### 1️⃣ Crear archivo: `src/lib/gerencial-export.ts`
**Ruta en Lovable**: `src/lib/gerencial-export.ts`

[Contenido: Ver archivo local en `/workspaces/hogarbelenadmon/src/lib/gerencial-export.ts`]

### 2️⃣ Crear archivo: `src/hooks/useGerencialHistory.ts`
**Ruta en Lovable**: `src/hooks/useGerencialHistory.ts`

[Contenido: Ver archivo local en `/workspaces/hogarbelenadmon/src/hooks/useGerencialHistory.ts`]

### 3️⃣ Crear archivo: `src/components/HistorialGerencial.tsx`
**Ruta en Lovable**: `src/components/HistorialGerencial.tsx`

[Contenido: Ver archivo local en `/workspaces/hogarbelenadmon/src/components/HistorialGerencial.tsx`]

### 4️⃣ Actualizar 6 módulos HB-G

Agrega esta línea de importación al inicio de cada archivo:

```typescript
import HistorialGerencial from "@/components/HistorialGerencial";
```

Luego agrega el componente antes del cierre del return:

```tsx
<HistorialGerencial 
  moduleId="HB-G01"  // Cambia según el módulo
  moduleName="Nombre del Módulo"
  tableName="nombre_tabla_supabase"
/>
```

#### Módulos a Actualizar:

**a) HB-G01 - WasteManagement.tsx**
```tsx
<HistorialGerencial 
  moduleId="HB-G01" 
  moduleName="HB-G01: Plan de Gestión Integral de Residuos (PEGIR)"
  tableName="waste_management"
/>
```

**b) HB-G02 - PestControl.tsx**
```tsx
<HistorialGerencial 
  moduleId="HB-G02" 
  moduleName="HB-G02: Control Integrado de Plagas"
  tableName="pest_control"
/>
```

**c) HB-G03 - HazardousWaste.tsx**
```tsx
<HistorialGerencial 
  moduleId="HB-G03" 
  moduleName="HB-G03: Manejo de Residuos Peligrosos (RESPEL)"
  tableName="hazardous_waste"
/>
```

**d) HB-G04 - SanitationRecord.tsx**
```tsx
<HistorialGerencial 
  moduleId="HB-G04" 
  moduleName="HB-G04: Saneamiento Básico"
  tableName="sanitation_record"
/>
```

**e) HB-G05 - EmergencyPlan.tsx**
```tsx
<HistorialGerencial 
  moduleId="HB-G05" 
  moduleName="HB-G05: Plan de Emergencias y Evacuación"
  tableName="emergency_plan"
/>
```

**f) HB-G06 - ManagerialDashboard.tsx**
```tsx
<HistorialGerencial 
  moduleId="HB-G06" 
  moduleName="HB-G06: Tablero de Control Gerencial"
  tableName="managerial_dashboard"
/>
```

---

## Opción 3: Usar el Script de Sincronización (Si existe)

Si tu proyecto tiene un script sync:

```bash
cd /workspaces/hogarbelenadmon
./lovable-export/sync.sh
```

---

## ✅ Verificación Después de Sincronizar

### En Lovable, verifica:

1. **Los 3 nuevos archivos existen:**
   - ✅ `src/lib/gerencial-export.ts`
   - ✅ `src/hooks/useGerencialHistory.ts`
   - ✅ `src/components/HistorialGerencial.tsx`

2. **Los 6 módulos HB-G tienen el componente:**
   - ✅ WasteManagement.tsx tiene HistorialGerencial
   - ✅ PestControl.tsx tiene HistorialGerencial
   - ✅ HazardousWaste.tsx tiene HistorialGerencial
   - ✅ SanitationRecord.tsx tiene HistorialGerencial
   - ✅ EmergencyPlan.tsx tiene HistorialGerencial
   - ✅ ManagerialDashboard.tsx tiene HistorialGerencial

3. **No hay errores de compilación:**
   - ✅ Build sin errores
   - ✅ Los módulos cargan correctamente
   - ✅ No hay imports faltantes

4. **Funcionalidad visible:**
   - ✅ Al ir a un módulo HB-G, ves la sección "Historial"
   - ✅ Puedes expandir/contraer el historial
   - ✅ Se muestran estadísticas (fecha, total, promedio)
   - ✅ Botones de descarga están disponibles (PDF, Word, Excel)

---

## 🧪 Probar Funcionalidad

### Pasos para probar en Lovable:

1. **Ve a cualquier módulo HB-G** (ej: HB-G01)
   
2. **Scroll al final** del formulario

3. **Busca la sección** "📊 Historial (Últimos 180 Días)"

4. **Haz clic para expandir**
   - Deberías ver 4 casillas con información
   - Deberías ver una tabla con registros
   - Deberías ver 3 botones: PDF, Word, Excel

5. **Prueba descargar un archivo:**
   - Haz clic en "Descargar PDF"
   - Verifica que se descargue `HB-G01_historial_[fecha].pdf`
   - Abre el PDF y verifica que tenga contenido

6. **Prueba los otros formatos:**
   - Repite con "Descargar Word" → archivo `.docx`
   - Repite con "Descargar Excel" → archivo `.xlsx`

---

## ⚠️ Solución de Problemas

### Problema: "Module not found: xlsx"
**Solución**: En Lovable, asegúrate de que `xlsx` esté en `package.json`:
```json
{
  "dependencies": {
    "xlsx": "^0.18.5"
  }
}
```

### Problema: "Component not found: HistorialGerencial"
**Solución**: Verifica que el archivo existe en `src/components/HistorialGerencial.tsx`

### Problema: No aparece el historial
**Solución**: 
- Verifica que la tabla Supabase existe
- Verifica que hay datos en la tabla
- Revisa la consola de errores (F12)

### Problema: Botones de descarga no funcionan
**Solución**:
- Verifica que jsPDF, docx, y xlsx estén instalados
- Revisa la consola para errores
- Intenta limpiar la caché del navegador

---

## 📞 Contacto y Soporte

Si necesitas ayuda:
- 📧 Email: hogarbelen2022@gmail.com
- 📱 Teléfono: 3117301245
- 🏢 Hogar Belén Buesaco S.A.S.

---

## 📋 Resumen de Cambios

| Acción | Archivo | Tipo |
|--------|---------|------|
| Crear | `src/lib/gerencial-export.ts` | Nuevo |
| Crear | `src/hooks/useGerencialHistory.ts` | Nuevo |
| Crear | `src/components/HistorialGerencial.tsx` | Nuevo |
| Actualizar | `src/components/forms/WasteManagement.tsx` | Modificado |
| Actualizar | `src/components/forms/PestControl.tsx` | Modificado |
| Actualizar | `src/components/forms/HazardousWaste.tsx` | Modificado |
| Actualizar | `src/components/forms/SanitationRecord.tsx` | Modificado |
| Actualizar | `src/components/forms/EmergencyPlan.tsx` | Modificado |
| Actualizar | `src/components/forms/ManagerialDashboard.tsx` | Modificado |

---

**Versión**: 1.0  
**Fecha**: Mayo 6, 2026  
**Estado**: ✅ Listo para sincronizar
