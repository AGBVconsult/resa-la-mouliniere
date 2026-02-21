"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatConvexError } from "@/lib/formatError";
import { X, Check, Plus, Search, Tag } from "lucide-react";

interface TagSelectorPopupProps {
  clientId: Id<"clients">;
  currentTags: string[];
  onClose: () => void;
}

export function TagSelectorPopup({ clientId, currentTags, onClose }: TagSelectorPopupProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [newlyCreatedTags, setNewlyCreatedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const allTags = useQuery(api.tags.list) ?? [];
  const updateClient = useMutation(api.clients.update);
  const createTag = useMutation(api.tags.create);
  
  // Combiner les tags existants avec les nouveaux créés localement
  const availableTags = [...new Set([...allTags, ...newlyCreatedTags])].sort((a, b) => a.localeCompare(b, "fr"));

  // Filtrer les tags par recherche
  const filteredTags = availableTags.filter((tag) =>
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Vérifier si le nouveau tag existe déjà
  const newTagExists = availableTags.some(
    (tag) => tag.toLowerCase() === newTagInput.trim().toLowerCase()
  );

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNewTag = async () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (newTagExists) {
      toast.error("Ce tag existe déjà");
      return;
    }
    try {
      // Créer le tag dans Convex (persistant)
      await createTag({ name: trimmed });
      // Ajouter aux tags créés localement pour affichage immédiat
      setNewlyCreatedTags((prev) => [...prev, trimmed]);
      setNewTagInput("");
    } catch (error) {
      toast.error(formatConvexError(error));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateClient({
        clientId,
        patch: {
          tags: selectedTags,
        },
      });
      toast.success("Tags mis à jour");
      onClose();
    } catch (error) {
      toast.error(formatConvexError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100001] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900">Gérer les tags</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tags list */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          {filteredTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all",
                      isSelected
                        ? "bg-blue-500 text-white border border-blue-500"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : searchQuery ? (
            <p className="text-sm text-slate-400 italic text-center py-4">
              Aucun tag trouvé pour "{searchQuery}"
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic text-center py-4">
              Aucun tag existant
            </p>
          )}
        </div>

        {/* Create new tag */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs font-medium text-slate-500 mb-2">Créer un nouveau tag</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nom du tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNewTag()}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddNewTag}
              disabled={!newTagInput.trim() || newTagExists}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors",
                newTagInput.trim() && !newTagExists
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <Plus size={14} />
              Ajouter
            </button>
          </div>
          {newTagExists && newTagInput.trim() && (
            <p className="text-xs text-amber-600 mt-1">Ce tag existe déjà</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-medium transition-colors",
              isSaving
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            )}
          >
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
