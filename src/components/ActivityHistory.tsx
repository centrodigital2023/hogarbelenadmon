import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Download, Eye, Trash2, Loader2 } from "lucide-react";

interface ActivityHistoryProps {
  tableName: string;
  residentId?: string;
  columns: Array<{ key: string; label: string; format?: (val: any) => string }>;
  onReexport: (id: string, format: 'pdf' | 'word' | 'excel') => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  pageSize?: number;
}

interface ActivityRecord {
  id: string;
  created_at: string;
  [key: string]: any;
}

export const ActivityHistory = ({
  tableName,
  residentId,
  columns,
  onReexport,
  onDelete,
  pageSize = 10,
}: ActivityHistoryProps) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      let query = supabase.from(tableName).select('*', { count: 'exact' });

      if (residentId) {
        query = query.eq('resident_id', residentId);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      setRecords(data || []);
      setTotalRecords(count || 0);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "No se pudieron cargar los registros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [currentPage, residentId]);

  const handleReexport = async (id: string, format: 'pdf' | 'word' | 'excel') => {
    setExporting(id);
    try {
      await onReexport(id, format);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Error al reexportar",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este registro?")) return;
    setDeleting(id);
    try {
      if (onDelete) {
        await onDelete(id);
        toast({ title: "Registro eliminado" });
        loadRecords();
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  if (loading && records.length === 0) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left font-bold">
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-muted-foreground">
                    Sin registros
                  </td>
                </tr>
              ) : (
                records.map(record => (
                  <tr key={record.id} className="hover:bg-muted/30 transition">
                    {columns.map(col => (
                      <td key={`${record.id}-${col.key}`} className="px-4 py-3">
                        {col.format ? col.format(record[col.key]) : record[col.key]}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReexport(record.id, 'pdf')}
                          disabled={exporting === record.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold disabled:opacity-50"
                        >
                          {exporting === record.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                          PDF
                        </button>
                        <button
                          onClick={() => handleReexport(record.id, 'word')}
                          disabled={exporting === record.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold disabled:opacity-50"
                        >
                          {exporting === record.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                          Word
                        </button>
                        <button
                          onClick={() => handleReexport(record.id, 'excel')}
                          disabled={exporting === record.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold disabled:opacity-50"
                        >
                          {exporting === record.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                          Excel
                        </button>
                        {onDelete && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            disabled={deleting === record.id}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 text-xs font-semibold disabled:opacity-50"
                          >
                            {deleting === record.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages} ({totalRecords} registros)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-50"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
