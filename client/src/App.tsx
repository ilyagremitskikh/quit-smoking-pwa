import { BarChart3, Home, PlayCircle, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { LaunchScreen } from "./components/LaunchScreen.js";
import { clearDemoNow, demoEnabled, getDemoNow } from "./lib/api.js";
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
  const [launchVisible, setLaunchVisible] = useState(true);
  const [launchExiting, setLaunchExiting] = useState(false);

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

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      const quickTimer = window.setTimeout(() => setLaunchVisible(false), 220);
      return () => window.clearTimeout(quickTimer);
    }

    const exitTimer = window.setTimeout(() => setLaunchExiting(true), 1450);
    const hideTimer = window.setTimeout(() => setLaunchVisible(false), 1850);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {launchVisible ? <LaunchScreen exiting={launchExiting} /> : null}
      <div className="app-shell mx-auto flex min-h-screen w-full max-w-md flex-col pt-8 text-ink">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-[2.12rem] font-black leading-none tracking-normal">
              Quit<span className="text-mint">Kit</span>
            </h1>
          </div>
        </header>

        {demoEnabled && demoNow ? (
          <div className="mb-4 flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-amber/30 bg-amber/10 px-3 py-2 text-sm font-semibold text-amber">
            <span className="min-w-0 break-words">Демо-время: {new Date(demoNow).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            <button
              onClick={() => {
                clearDemoNow();
                window.location.reload();
              }}
              className="tap-button shrink-0 rounded-xl border border-amber/40 px-2 py-1 text-xs"
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

        <nav className="safe-bottom sticky bottom-0 -mx-4 mt-4 border-t border-line/70 bg-paper/90 px-4 pt-2 shadow-[0_-18px_34px_rgba(14,35,28,0.08)] backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "tap-button flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center text-[11px] font-bold leading-tight transition min-[380px]:text-xs",
                      isActive ? "text-mint" : "text-slate-500 hover:bg-panel/60 hover:text-ink"
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={["grid h-9 w-12 place-items-center rounded-2xl", isActive ? "bg-mint/10" : ""].join(" ")}>
                        <Icon aria-hidden="true" size={20} />
                      </span>
                      <span className="min-w-0 break-words">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
