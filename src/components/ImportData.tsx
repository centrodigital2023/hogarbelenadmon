import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, X } from "lucide-react";

interface ImportDataProps {
  onImported: () => void;
}

const EXPECTED_COLUMNS = [
  "full_name",
  "document_id",
  "birth_date",
  "birth_place",
  "gender",
  "eps",
  "blood_type",
  "allergies",
  "special_diet",
  "emergency_contact_1_name",
  "emergency_contact_1_phone",
  "emergency_contact_1_relation",
  "responsible_family_name",
  "responsible_family_phone",
  "treating_doctor_name",
  "notes",
];

const COLUMN_LABELS: Record<string, string> = {
  full_name: "Nombre completo",
  document_id: "Documento",
  birth_date: "Fecha nacimiento",
  birth_place: "Lugar nacimiento",
  gender: "Género (M/F)",
  eps: "EPS",
  blood_type: "Tipo sangre",
  allergies: "Alergias",
  special_diet: "Dieta especial",
  emergency_contact_1_name: "Contacto emergencia (nombre)",
  emergency_contact_1_phone: "Contacto emergencia (teléfono)",
  emergency_contact_1_relation: "Contacto emergencia (parentesco)",
  responsible_family_name: "Familiar responsable (nombre)",
  responsible_family_phone: "Familiar responsable (teléfono)",
  treating_doctor_name: "Médico tratante",
  notes: "Notas",
};

const TRIAL_PERIOD_DAYS = 15;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(field.trim());
        field = "";
      } else {
        field += ch;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function downloadTemplate() {
  const bom = "\uFEFF";
  const header = EXPECTED_COLUMNS.join(",");
  const example = [
    "María García López",
    "12345678",
    "1945-03-15",
    "Buesaco",
    "F",
    "Sura",
    "O+",
    "Penicilina",
    "Sin sal",
    "Ana García",
    "3001234567",
    "Hija",
    "Carlos García",
    "3009876543",
    "Dr. Pérez",
    "",
  ].join(",");
  const csv = `${bom}${header}\n${example}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_residentes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const ImportData = ({ onImported }: ImportDataProps) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Solo se admiten archivos CSV", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setImported(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      const errs: string[] = [];
      parsed.forEach((row, i) => {
        if (!row.full_name) errs.push(`Fila ${i + 2}: falta el nombre completo.`);
      });
      setErrors(errs);
      setRows(parsed);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setRows([]);
    setFileName("");
    setErrors([]);
    setImported(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.full_name);
    if (validRows.length === 0) return;
    setImporting(true);

    const today = new Date().toISOString().split("T")[0];
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_PERIOD_DAYS);
    const trialEndStr = trialEnd.toISOString().split("T")[0];

    const records = validRows.map((r) => ({
      full_name: r.full_name,
      document_id: r.document_id || null,
      birth_date: r.birth_date || null,
      birth_place: r.birth_place || null,
      gender: ["M", "F"].includes((r.gender || "").toUpperCase())
        ? (r.gender || "").toUpperCase()
        : "M",
      eps: r.eps || null,
      blood_type: r.blood_type || null,
      allergies: r.allergies || null,
      special_diet: r.special_diet || null,
      emergency_contact_1_name: r.emergency_contact_1_name || null,
      emergency_contact_1_phone: r.emergency_contact_1_phone || null,
      emergency_contact_1_relation: r.emergency_contact_1_relation || null,
      responsible_family_name: r.responsible_family_name || null,
      responsible_family_phone: r.responsible_family_phone || null,
      treating_doctor_name: r.treating_doctor_name || null,
      notes: r.notes || null,
      admission_date: today,
      trial_end_date: trialEndStr,
      status: "prueba",
    }));

    const { error } = await supabase.from("residents").insert(records);

    setImporting(false);
    if (error) {
      toast({ title: "Error al importar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${validRows.length} residente(s) importado(s)` });
      setImported(true);
      onImported();
      reset();
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-black text-foreground">📥 Importar residentes desde CSV</h3>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 bg-muted text-foreground px-3 py-2 rounded-xl text-xs font-bold hover:bg-muted/80 transition-colors min-h-[36px]"
        >
          <FileSpreadsheet size={13} /> Descargar plantilla
        </button>
      </div>

      {!rows.length ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-input rounded-xl p-8 flex flex-col items-center gap-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={28} className="text-muted-foreground" />
          <p className="text-sm font-bold text-foreground">Arrastra tu CSV aquí o haz clic para seleccionar</p>
          <p className="text-xs text-muted-foreground">Solo archivos .csv • Máx. 5 MB</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <FileSpreadsheet size={14} className="text-primary" />
              {fileName}
              <span className="text-muted-foreground font-medium">— {rows.length} fila(s)</span>
            </div>
            <button onClick={reset} className="text-muted-foreground hover:text-destructive transition-colors">
              <X size={16} />
            </button>
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-xs space-y-1">
              <p className="font-black flex items-center gap-2"><AlertCircle size={14} /> {errors.length} error(es) encontrado(s):</p>
              {errors.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          {/* Preview table */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left font-bold text-muted-foreground">#</th>
                  <th className="px-3 py-2 text-left font-bold text-muted-foreground">Nombre completo</th>
                  <th className="px-3 py-2 text-left font-bold text-muted-foreground">Documento</th>
                  <th className="px-3 py-2 text-left font-bold text-muted-foreground">Nacimiento</th>
                  <th className="px-3 py-2 text-left font-bold text-muted-foreground">EPS</th>
                  <th className="px-3 py-2 text-left font-bold text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const hasError = !row.full_name;
                  return (
                    <tr key={i} className={`border-t border-border ${hasError ? "bg-destructive/5" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {row.full_name || <span className="text-destructive">⚠ vacío</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.document_id || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.birth_date || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.eps || "—"}</td>
                      <td className="px-3 py-2">
                        {hasError
                          ? <span className="text-destructive font-bold">Error</span>
                          : <span className="text-cat-nutritional font-bold">✓ OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {imported && (
            <div className="flex items-center gap-2 text-cat-nutritional text-xs font-bold">
              <CheckCircle2 size={14} /> Importación completada
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleImport}
              disabled={importing || rows.filter((r) => r.full_name).length === 0}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40 min-h-[40px]"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {importing ? "Importando..." : `Importar ${rows.filter((r) => r.full_name).length} residente(s)`}
            </button>
            <button
              onClick={reset}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors min-h-[40px]"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      <p className="text-[10px] text-muted-foreground">
        Columnas admitidas: {EXPECTED_COLUMNS.map((c) => COLUMN_LABELS[c] || c).join(" • ")}
      </p>
    </div>
  );
};

export default ImportData;
