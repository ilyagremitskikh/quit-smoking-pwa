import { useState } from "react";
import { PlayCircle } from "lucide-react";

export function VideoPage() {
  const [missing, setMissing] = useState(false);

  return (
    <div className="space-y-4">
      <section className="surface-in rounded-md border border-line bg-panel p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <PlayCircle className="text-mint" size={22} />
          <h2 className="text-lg font-semibold">Послание себе</h2>
        </div>
        {missing ? (
          <div className="grid aspect-video place-items-center rounded-md border border-dashed border-line bg-paper p-6 text-center text-sm text-slate-500">
            Видео пока не найдено. На сервере нужен файл `/media/video.mp4`.
          </div>
        ) : (
          <video
            src="/media/video.mp4"
            controls
            playsInline
            className="aspect-video w-full rounded-md bg-ink"
            onError={() => setMissing(true)}
          />
        )}
      </section>
    </div>
  );
}
