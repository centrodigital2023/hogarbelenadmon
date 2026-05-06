/**
 * Hook para gestionar el historial de módulos gerenciales
 * Retrieves and manages up to 180 days of historical data
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLast180Days } from '@/lib/gerencial-export';

export interface HistoricalRecord {
  id: string;
  module_id: string;
  created_at: string;
  responsible?: string;
  period_month?: number;
  period_year?: number;
  period_quarter?: number;
  observations?: string;
  [key: string]: any;
}

export interface UseGerencialHistoryReturn {
  records: HistoricalRecord[];
  loading: boolean;
  error: Error | null;
  dateRange: { start: Date; end: Date };
  filteredRecords: HistoricalRecord[];
  filterByMonth: (month: number, year: number) => void;
  filterByQuarter: (quarter: number, year: number) => void;
  resetFilter: () => void;
  totalRecords: number;
  averageRecordsPerMonth: number;
}

/**
 * Hook que carga y gestiona el historial de 180 días de un módulo
 * @param moduleId - ID del módulo (HB-G01, HB-G02, etc.)
 * @param tableName - Nombre de la tabla en Supabase
 * @returns Object con records, loading, error y funciones de filtrado
 */
export const useGerencialHistory = (
  moduleId: string,
  tableName: string
): UseGerencialHistoryReturn => {
  const [records, setRecords] = useState<HistoricalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<HistoricalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dateRange] = useState(() => getLast180Days());

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calcular fecha de hace 180 días
        const { start } = getLast180Days();
        const startDateStr = start.toISOString().split('T')[0];

        // Realizar query a Supabase
        const { data, error: supabaseError } = await supabase
          .from(tableName)
          .select('*')
          .gte('created_at', startDateStr)
          .order('created_at', { ascending: false });

        if (supabaseError) {
          throw supabaseError;
        }

        const typedData = (data || []) as HistoricalRecord[];
        setRecords(typedData);
        setFilteredRecords(typedData);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error fetching gerencial history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [moduleId, tableName]);

  const filterByMonth = (month: number, year: number) => {
    const filtered = records.filter(
      r => r.period_month === month && r.period_year === year
    );
    setFilteredRecords(filtered);
  };

  const filterByQuarter = (quarter: number, year: number) => {
    const filtered = records.filter(
      r => r.period_quarter === quarter && r.period_year === year
    );
    setFilteredRecords(filtered);
  };

  const resetFilter = () => {
    setFilteredRecords(records);
  };

  const totalRecords = records.length;
  const averageRecordsPerMonth = Math.round(totalRecords / 6); // 180 days ≈ 6 months

  return {
    records,
    loading,
    error,
    dateRange,
    filteredRecords,
    filterByMonth,
    filterByQuarter,
    resetFilter,
    totalRecords,
    averageRecordsPerMonth,
  };
};
