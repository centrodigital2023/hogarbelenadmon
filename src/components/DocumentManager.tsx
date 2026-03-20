import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { Upload, Download, Trash2, FileText, FileSpreadsheet, File, Search, Loader2 } from "lucide-react";

interface Props { onBack: () => void; }

const FILE_ICONS: Record<string, any> = {
  'pdf': FileText,
  'doc': File,
  'docx': File,
  'xls': FileSpreadsheet,
  'xlsx': FileSpreadsheet,
};

const DocumentManager = ({ onBack }: Props) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [docName, setDocName] = useState("");

  const loadDocs = async () => {
    const { data } = await supabase.from('institutional_documents').select('*').order('created_at', { ascending: false });
    if (data) setDocs(data);
  };

  useEffect(() => { loadDocs(); }, []);

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Error", description: "Máximo 10 MB", variant: "destructive" });
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext || '')) {
      toast({ title: "Error", description: "Solo PDF, Word o Excel", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileName = `institutional/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
    if (uploadError) {
      toast({ title: "Error", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

    await supabase.from('institutional_documents').insert({
      name: docName || file.name.replace(/\.[^.]+$/, ''),
      original_name: file.name,
      file_url: urlData.publicUrl,
      file_type: ext,
      file_size: file.size,
      uploaded_by: user.id,
    });

    setDocName("");
    setUploading(false);
    toast({ title: "Documento subido" });
    loadDocs();
  };

  const handleDelete = async (doc: any) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await supabase.from('institutional_documents').delete().eq('id', doc.id);
    toast({ title: "Eliminado" });
    loadDocs();
  };

  const handleDownload = (doc: any) => {
    window.open(doc.file_url, '_blank');
  };

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.original_name.toLowerCase().includes(search.toLowerCase()));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="Documentos Institucionales" subtitle="Manual de procesos, reglamento, contratos" onBack={onBack} />

      {/* Upload section */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-black text-foreground mb-4">Subir documento</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-muted-foreground uppercase">Nombre descriptivo</label>
              <input type="text" value={docName} onChange={e => setDocName(e.target.value)}
                placeholder="Ej: Reglamento Interno 2026"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-input bg-background text-sm" />
            </div>
            <label className={`flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold cursor-pointer min-h-[48px] ${uploading ? 'opacity-40' : 'hover:opacity-90'}`}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={uploading}
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar documento..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm" />
      </div>

      {/* Document list */}
      <div className="space-y-2">
        {filtered.map(doc => {
          const Icon = FILE_ICONS[doc.file_type] || File;
          return (
            <div key={doc.id} className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{doc.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {doc.original_name} • {formatSize(doc.file_size || 0)} • {new Date(doc.created_at).toLocaleDateString('es-CO')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => handleDownload(doc)}
                  className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20">
                  <Download size={14} />
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(doc)}
                    className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">No hay documentos</p>
        )}
      </div>
    </div>
  );
};

export default DocumentManager;
