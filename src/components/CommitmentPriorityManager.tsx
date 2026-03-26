import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Commitment } from '../types';
import { GripVertical, X, Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchCommitments as fetchCommitmentsApi, updateCommitment } from '../api';

interface CommitmentPriorityManagerProps {
  onClose: () => void;
  onUpdate: () => void;
}

interface SortableItemProps {
  commitment: Commitment;
  index: number;
  key?: React.Key;
}

function SortableItem({ commitment, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: commitment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm mb-2 ${
        isDragging ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="flex-none w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold text-slate-600">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 truncate">{commitment.cliente}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
            {commitment.commessa}
          </span>
        </div>
        <div className="text-xs text-slate-500 truncate">
          {commitment.articolo_nome} ({commitment.quantita} pz)
        </div>
      </div>

      <div className="flex-none text-right">
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
          commitment.stato_lavorazione === 'In Lavorazione' ? 'bg-blue-100 text-blue-700' :
          commitment.stato_lavorazione === 'Completato' ? 'bg-emerald-100 text-emerald-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {commitment.stato_lavorazione || 'Pianificato'}
        </div>
      </div>
    </div>
  );
}

export default function CommitmentPriorityManager({ onClose, onUpdate }: CommitmentPriorityManagerProps) {
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCommitments();
  }, []);

  const fetchCommitments = async () => {
    try {
      const data = await fetchCommitmentsApi();
      const sortedData = data.sort((a, b) => (a.priorita || 0) - (b.priorita || 0));
      setCommitments(sortedData);
    } catch (error) {
      console.error(error);
      toast.error("Errore nel caricamento impegni");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCommitments((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < commitments.length; i++) {
        await updateCommitment(commitments[i].id, { priorita: i + 1 });
      }

      toast.success("Priorità aggiornate con successo!");
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-slate-50 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Gestione Priorità Produzione</h2>
            <p className="text-sm text-slate-500">Trascina le righe per cambiare l'ordine di evasione</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p>Caricamento impegni...</p>
            </div>
          ) : commitments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
              <p>Nessun impegno attivo da ordinare.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={commitments.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {commitments.map((c, index) => (
                  <SortableItem key={c.id} commitment={c} index={index} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || commitments.length === 0}
            className="flex items-center gap-2 px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            Salva Nuovo Ordine
          </button>
        </div>
      </div>
    </div>
  );
}
