import { useSearchParams } from "react-router-dom";
import type { AttentionTarget } from "@/lib/resident-attention";

/** Abre el módulo, formulario o residente al que apunta un pendiente. */
export const useAttentionNavigation = () => {
  const [, setSearchParams] = useSearchParams();
  return (target: AttentionTarget) => {
    const params = new URLSearchParams({ modulo: target.modulo });
    if (target.form) params.set("form", target.form);
    if (target.residente) params.set("residente", target.residente);
    setSearchParams(params);
    window.scrollTo({ top: 0 });
  };
};
