/**
 * Componente para visualizar y exportar el historial de módulos gerenciales
 * Muestra registros de hasta 180 días con opciones de exportación
 */

import React, { useState } from 'react';
import { ChevronDown, Download, Loader, AlertCircle } from 'lucide-react';
import { useGerencialHistory, UseGerencialHistoryReturn } from '@/hooks/useGerencialHistory';
import { 
  exportGerencialHistory, 
  formatDate, 
  HistoryExportOptions,
  MODULE_INFO 
} from '@/lib/gerencial-export';
import { useToast } from '@/hooks/use-toast';

interface HistorialGerencialProps {
  moduleId: string;
  moduleName: string;
  tableName: string;
}

const HistorialGerencial: React.FC<HistorialGerencialProps> = ({
  moduleId,
  moduleName,
  tableName,
}) => {
  const { toast } = useToast();
  const historyData = useGerencialHistory(moduleId, tableName);
  const [isExpanded, setIsExpanded] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'word' | 'excel' | null>(null);

  const {
    records,
    loading,
    error,
    dateRange,
    filteredRecords,
    totalRecords,
    averageRecordsPerMonth,
  } = historyData;

  const handleExport = async (format: 'pdf' | 'word' | 'excel') => {
    try {
      setExporting(format);

      const exportOptions: HistoryExportOptions = {
        moduleId,
        moduleName: MODULE_INFO[moduleId]?.title || moduleName,
        records: filteredRecords.length > 0 ? filteredRecords : records,
        dateRange,
      };

      await exportGerencialHistory(format, exportOptions);

      toast({
        title: 'Éxito',
        description: `Historial exportado a ${format.toUpperCase()}`,
        variant: 'default',
      });
    } catch (error) {
      console.error(`Export error: ${format}`, error);
      toast({
        title: 'Error',
        description: `No se pudo exportar a ${format.toUpperCase()}`,
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
      {/* ENCABEZADO COLAPSIBLE */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-accent/10 hover:bg-accent/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            size={20}
            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
          <div className="text-left">
            <h3 className="font-bold text-sm">📊 Historial (Últimos 180 Días)</h3>
            <p className="text-xs text-muted-foreground">
              {totalRecords} registros • Promedio: {averageRecordsPerMonth} por mes
            </p>
          </div>
        </div>
        <span className="text-xs bg-accent/30 px-3 py-1 rounded-full">
          {exporting ? 'Exportando...' : 'Descargar'}
        </span>
      </button>

      {/* CONTENIDO COLAPSIBLE */}
      {isExpanded && (
        <div className="border-t border-border p-6 space-y-4">
          {/* INFORMACIÓN DEL RANGO */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase">Fecha Inicio</p>
              <p className="text-sm font-semibold">{formatDate(dateRange.start)}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase">Fecha Fin</p>
              <p className="text-sm font-semibold">{formatDate(dateRange.end)}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase">Total Registros</p>
              <p className="text-sm font-semibold">{totalRecords}</p>
            </div>
            <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs font-bold text-muted-foreground uppercase">Por Mes</p>
              <p className="text-sm font-semibold">{averageRecordsPerMonth}</p>
            </div>
          </div>

          {/* ESTADO DE CARGA */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader size={18} className="animate-spin" />
              <span>Cargando historial...</span>
            </div>
          )}

          {/* MENSAJES DE ERROR */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              <AlertCircle size={16} />
              <span>Error al cargar el historial: {error.message}</span>
            </div>
          )}

          {/* TABLA DE REGISTROS */}
          {!loading && !error && records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2 text-left font-bold">Fecha</th>
                    <th className="px-4 py-2 text-left font-bold">Responsable</th>
                    <th className="px-4 py-2 text-left font-bold">Período</th>
                    <th className="px-4 py-2 text-left font-bold">Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredRecords.length > 0 ? filteredRecords : records).slice(0, 10).map((record) => (
                    <tr key={record.id} className="border-b border-border hover:bg-muted/20">
                      <td className="px-4 py-2">{formatDate(record.created_at)}</td>
                      <td className="px-4 py-2">{record.responsible || 'No especificado'}</td>
                      <td className="px-4 py-2">
                        {record.period_month
                          ? `${record.period_month}/${record.period_year}`
                          : record.period_quarter
                          ? `Q${record.period_quarter}/${record.period_year}`
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs max-w-xs truncate">
                        {record.observations || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(filteredRecords.length > 0 ? filteredRecords : records).length > 10 && (
                <p className="text-xs text-muted-foreground text-center mt-2 py-2">
                  Mostrando 10 de {(filteredRecords.length > 0 ? filteredRecords : records).length} registros
                </p>
              )}
            </div>
          )}

          {/* SIN REGISTROS */}
          {!loading && !error && records.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">No hay registros en los últimos 180 días</p>
            </div>
          )}

          {/* BOTONES DE EXPORTACIÓN */}
          {!loading && records.length > 0 && (
            <div className="flex gap-2 pt-4 border-t border-border flex-wrap">
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {exporting === 'pdf' ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Descargar PDF
                  </>
                )}
              </button>

              <button
                onClick={() => handleExport('word')}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {exporting === 'word' ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Descargar Word
                  </>
                )}
              </button>

              <button
                onClick={() => handleExport('excel')}
                disabled={exporting !== null}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {exporting === 'excel' ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Descargar Excel
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistorialGerencial;
