import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FormHeader from "@/components/FormHeader";
import { Home, User, X, Plus } from "lucide-react";

interface Props { onBack: () => void; }
interface Room { id: string; room_number: string; capacity: number; floor: string | null; notes: string | null; }
interface Resident { id: string; full_name: string; room_id: string | null; status: string; }

const RoomAssignment = ({ onBack }: Props) => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [assignResident, setAssignResident] = useState("");

  const loadData = async () => {
    const [{ data: r }, { data: res }] = await Promise.all([
      supabase.from('rooms').select('*').order('room_number'),
      supabase.from('residents').select('id, full_name, room_id, status').in('status', ['prueba', 'permanente']),
    ]);
    if (r) setRooms(r);
    if (res) setResidents(res);
  };

  useEffect(() => { loadData(); }, []);

  const getRoomResidents = (roomId: string) => residents.filter(r => r.room_id === roomId);
  const unassigned = residents.filter(r => !r.room_id);

  const handleAssign = async () => {
    if (!selectedRoom || !assignResident) return;
    const { error } = await supabase.from('residents').update({ room_id: selectedRoom.id }).eq('id', assignResident);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Asignado", description: "Residente asignado a la habitación" });
      setAssignResident("");
      setShowModal(false);
      loadData();
    }
  };

  const handleUnassign = async (residentId: string) => {
    const { error } = await supabase.from('residents').update({ room_id: null }).eq('id', residentId);
    if (!error) { toast({ title: "Desasignado" }); loadData(); }
  };

  const createDefaultRooms = async () => {
    const existing = rooms.length;
    if (existing >= 20) return;
    const newRooms = [];
    for (let i = existing + 1; i <= 20; i++) {
      newRooms.push({ room_number: `H-${String(i).padStart(2, '0')}`, capacity: 2, floor: i <= 10 ? 'Piso 1' : 'Piso 2' });
    }
    await supabase.from('rooms').insert(newRooms);
    loadData();
    toast({ title: "Habitaciones creadas" });
  };

  return (
    <div className="animate-fade-in">
      <FormHeader title="Asignación de Habitaciones" subtitle="Mapa visual de 20 habitaciones" onBack={onBack} />

      {rooms.length < 20 && (
        <button onClick={createDefaultRooms}
          className="mb-6 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-bold min-h-[48px]">
          <Plus size={14} className="inline mr-1" /> Crear {20 - rooms.length} habitaciones faltantes
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        {rooms.map(room => {
          const occupants = getRoomResidents(room.id);
          const isFull = occupants.length >= room.capacity;
          const isEmpty = occupants.length === 0;
          return (
            <button key={room.id}
              onClick={() => { setSelectedRoom(room); setShowModal(true); }}
              className={`relative bg-card border-2 rounded-2xl p-4 text-left transition-all hover:shadow-lg min-h-[120px] ${
                isEmpty ? 'border-cat-nutritional/30 hover:border-cat-nutritional' :
                isFull ? 'border-destructive/30 hover:border-destructive' :
                'border-primary/30 hover:border-primary'
              }`}>
              <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${isEmpty ? 'bg-cat-nutritional' : isFull ? 'bg-destructive' : 'bg-primary'}`} />
              <Home size={20} className={`mb-2 ${isEmpty ? 'text-cat-nutritional' : 'text-primary'}`} />
              <p className="text-sm font-black">{room.room_number}</p>
              <p className="text-[10px] text-muted-foreground">{room.floor} • Cap: {room.capacity}</p>
              <div className="mt-2 space-y-1">
                {occupants.map(o => (
                  <div key={o.id} className="flex items-center gap-1 text-[10px] font-medium text-foreground">
                    <User size={10} className="text-primary" />
                    <span className="truncate">{o.full_name}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-cat-nutritional" /> Disponible</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary" /> Parcial</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-destructive" /> Completa</span>
      </div>

      {/* Modal */}
      {showModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">{selectedRoom.room_number}</h3>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <p className="text-xs text-muted-foreground mb-4">{selectedRoom.floor} • Capacidad: {selectedRoom.capacity}</p>

            {/* Current occupants */}
            <div className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Ocupantes actuales</p>
              {getRoomResidents(selectedRoom.id).map(r => (
                <div key={r.id} className="flex items-center justify-between bg-muted rounded-xl px-4 py-2 mb-1">
                  <span className="text-sm font-medium">{r.full_name}</span>
                  <button onClick={() => handleUnassign(r.id)} className="text-destructive text-xs font-bold">Quitar</button>
                </div>
              ))}
              {getRoomResidents(selectedRoom.id).length === 0 && <p className="text-sm text-muted-foreground">Sin ocupantes</p>}
            </div>

            {/* Assign new */}
            {getRoomResidents(selectedRoom.id).length < selectedRoom.capacity && unassigned.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Asignar residente</p>
                <select value={assignResident} onChange={e => setAssignResident(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm mb-3">
                  <option value="">-- Seleccionar --</option>
                  {unassigned.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                </select>
                <button onClick={handleAssign} disabled={!assignResident}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-xs font-bold disabled:opacity-40 min-h-[48px]">
                  Asignar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAssignment;
