// hooks/useProgressPhotos.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";

export interface ProgressPhoto {
  id: string;
  userId: string;
  imageUrl: string;
  weight: number | null;
  takenAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const QUERY_KEY = ["progress-photos"];

export function useProgressPhotos() {
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/progress-photos");
      if (!res.ok) throw new Error("Erro ao buscar fotos de progresso");
      const json = await res.json();
      return (json.photos ?? []) as ProgressPhoto[];
    },
    enabled: isSignedIn,
  });

  const photos = data ?? [];
  // API já ordena por takenAt asc — mais antiga primeiro, mais recente por último.
  const oldest = photos[0] ?? null;
  const newest = photos.length > 1 ? photos[photos.length - 1] : null;

  const addPhoto = useMutation({
    mutationFn: async (input: { file: File; weight?: number; notes?: string; takenAt?: string }) => {
      const formData = new FormData();
      formData.append("photo", input.file);
      if (input.weight !== undefined) formData.append("weight", String(input.weight));
      if (input.notes) formData.append("notes", input.notes);
      if (input.takenAt) formData.append("takenAt", input.takenAt);

      const res = await fetch("/api/progress-photos", { method: "POST", body: formData });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Erro ao salvar foto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Foto adicionada!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePhoto = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; weight?: number | null; notes?: string | null; takenAt?: string }) => {
      const res = await fetch(`/api/progress-photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Erro ao atualizar foto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Foto atualizada!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/progress-photos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error || "Erro ao excluir foto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Foto removida");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    photos,
    oldest,
    newest,
    isLoading,
    isError,
    addPhoto,
    updatePhoto,
    deletePhoto,
  };
}
