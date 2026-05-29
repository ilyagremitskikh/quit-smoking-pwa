import { X } from "lucide-react";

interface VideoModalProps {
  onClose: () => void;
}

export function VideoModal({ onClose }: VideoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/50 p-4 sm:items-center">
      <div className="mx-auto w-full max-w-md rounded-md border border-line bg-panel p-3 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium">Сначала посмотри это</p>
          <button
            aria-label="Закрыть"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <video src="/media/video.mp4" controls playsInline className="aspect-video w-full rounded-md bg-ink" />
      </div>
    </div>
  );
}
