import { useState } from 'react';
import { Trash2, Image as ImageIcon, Pencil, Check, X } from 'lucide-react';
import { usePalaceStore } from '@/lib/store';
import { getDueAnnotations } from '@/lib/fsrs';

export default function PalaceList() {
  const { palaces, currentPalaceId, setCurrentPalace, deletePalace, updatePalace } = usePalaceStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this palace? This action cannot be undone.')) {
      await deletePalace(id);
    }
  };

  const startRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const commitRename = async (id: string) => {
    const name = renameValue.trim();
    if (name && name !== palaces.find(p => p._id === id)?.name) {
      await updatePalace(id, { name });
    }
    setRenamingId(null);
  };

  const cancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenamingId(null);
  };

  if (palaces.length === 0) {
    return (
      <div className="text-center py-8">
        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-white/20" />
        <p className="text-sm text-muted">No palaces yet</p>
        <p className="text-xs text-white/30 mt-1">Click &quot;+ New&quot; to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {palaces.map((palace) => {
        const isActive = currentPalaceId === palace._id;
        const isRenaming = renamingId === palace._id;
        const dueCount = getDueAnnotations(
          palace.images.flatMap(img => img.annotations)
        ).length;

        return (
          <div
            key={palace._id}
            onClick={() => !isRenaming && setCurrentPalace(palace._id)}
            className={`group relative w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
              isActive
                ? 'bg-accent/15 border-accent/40 shadow-sm'
                : 'bg-white/5 border-white/8 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {/* Due badge */}
            {dueCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 z-10 px-1.5 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full leading-none">
                {dueCount}
              </span>
            )}

            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.stopPropagation(); commitRename(palace._id); }
                      if (e.key === 'Escape') { e.stopPropagation(); cancelRename(); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-background border border-accent/50 rounded-md px-2 py-0.5 text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                ) : (
                  <p className={`text-sm font-semibold truncate ${isActive ? 'text-foreground' : 'text-foreground/80'}`}>
                    {palace.name}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
                  <span>{palace.images.length} rooms</span>
                  <span>
                    {palace.images.reduce((s, i) => s + i.annotations.length, 0)} notes
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isRenaming ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); commitRename(palace._id); }}
                      className="p-1.5 hover:bg-success/20 rounded-lg transition-colors"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5 text-success" />
                    </button>
                    <button
                      onClick={cancelRename}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5 text-muted" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => startRename(palace._id, palace.name, e)}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(palace._id, e)}
                      className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
