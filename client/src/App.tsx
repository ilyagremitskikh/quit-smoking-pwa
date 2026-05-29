import { BarChart3, Home, PlayCircle, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { clearDemoNow, getDemoNow } from "./lib/api.js";
import { ProgressPage } from "./pages/ProgressPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { TodayPage } from "./pages/TodayPage.js";
import { VideoPage } from "./pages/VideoPage.js";

const navItems = [
  { to: "/", label: "Сегодня", icon: Home },
  { to: "/progress", label: "Прогресс", icon: BarChart3 },
  { to: "/video", label: "Видео", icon: PlayCircle },
  { to: "/settings", label: "Настройки", icon: Settings }
];

export function App() {
  const [demoNow, setDemoNowState] = useState(() => getDemoNow());

  useEffect(() => {
    function syncDemoNow() {
      setDemoNowState(getDemoNow());
    }
    window.addEventListener("quitkit-demo-now-change", syncDemoNow);
    window.addEventListener("storage", syncDemoNow);
    return () => {
      window.removeEventListener("quitkit-demo-now-change", syncDemoNow);
      window.removeEventListener("storage", syncDemoNow);
    };
  }, []);

  return (
    <div className="app-shell mx-auto flex min-h-screen w-full max-w-md flex-col pt-5 text-ink">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-mint">QuitKit</p>
          <h1 className="text-2xl font-semibold tracking-normal">Свобода по дням</h1>
        </div>
      </header>

      {demoNow ? (
        <div className="mb-4 flex min-w-0 items-center justify-between gap-3 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
          <span className="min-w-0 break-words">Демо-время: {new Date(demoNow).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
          <button
            onClick={() => {
              clearDemoNow();
              window.location.reload();
            }}
            className="tap-button shrink-0 rounded-md border border-amber/40 px-2 py-1 text-xs"
          >
            Выкл
          </button>
        </div>
      ) : null}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/video" element={<VideoPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>

      <nav className="safe-bottom sticky bottom-0 -mx-4 mt-5 border-t border-line bg-paper/95 px-4 pt-2 backdrop-blur">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "tap-button flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[11px] leading-tight transition min-[380px]:text-xs",
                    isActive ? "bg-panel text-mint shadow-sm" : "text-slate-500 hover:bg-panel/70 hover:text-ink"
                  ].join(" ")
                }
              >
                <Icon aria-hidden="true" size={20} />
                <span className="min-w-0 break-words">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
