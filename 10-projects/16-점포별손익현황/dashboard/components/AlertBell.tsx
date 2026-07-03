"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { stores, THRESHOLDS } from "@/lib/data";

export default function AlertBell() {
  const [enabled, setEnabled] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playBeep(frequency = 880, duration = 0.15) {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  function detectAnomalies(): string[] {
    const msgs: string[] = [];
    const latestMonth = 5;
    for (const store of stores) {
      const m = store.monthly.find((x) => x.month === latestMonth);
      if (!m) continue;
      if (m.laborRate >= THRESHOLDS.laborRate.danger) {
        msgs.push(`⚠️ ${store.name}: 인건비율 ${m.laborRate.toFixed(1)}% (위험)`);
      }
      if (m.operatingMargin <= THRESHOLDS.operatingMargin.danger) {
        msgs.push(`⚠️ ${store.name}: 영업이익율 ${m.operatingMargin.toFixed(1)}% (적자)`);
      }
      if (m.costRate >= THRESHOLDS.costRate.danger) {
        msgs.push(`⚠️ ${store.name}: 원가율 ${m.costRate.toFixed(1)}% (위험)`);
      }
    }
    return msgs;
  }

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    if (next) {
      // 초기화 시 beep 한 번 (사용자 제스처 바인딩)
      playBeep(440, 0.1);
      setTimeout(() => playBeep(880, 0.1), 120);
      const found = detectAnomalies();
      setAlerts(found);
      if (found.length > 0) {
        setTimeout(() => playBeep(660, 0.2), 300);
      }
    } else {
      setAlerts([]);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const found = detectAnomalies();
      setAlerts(found);
      if (found.length > 0) playBeep(660, 0.2);
    }, 30000); // 30초마다 재검사
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors"
        style={{
          background: enabled ? "var(--navy-50)" : "var(--card)",
          borderColor: enabled ? "var(--navy-400)" : "var(--border)",
          color: enabled ? "var(--navy-800)" : "var(--text-secondary)",
        }}
        title={enabled ? "알림 비활성화" : "알림 활성화 (이상 지표 소리 알림)"}
      >
        {enabled ? <Bell size={14} /> : <BellOff size={14} />}
        {enabled ? "알림 켜짐" : "알림 켜기"}
        {enabled && alerts.length > 0 && (
          <span
            className="inline-flex items-center justify-center w-4 h-4 text-xs rounded-full font-bold"
            style={{ background: "var(--down)", color: "#fff" }}
          >
            {alerts.length}
          </span>
        )}
      </button>
      {enabled && alerts.length > 0 && (
        <div
          className="absolute right-0 top-9 z-50 rounded-xl shadow-lg border p-3 w-72 flex flex-col gap-1"
          style={{ background: "var(--card)", borderColor: "#fca5a5" }}
        >
          <p className="text-xs font-bold mb-1" style={{ color: "var(--down)" }}>
            이상 지표 탐지 ({alerts.length}건)
          </p>
          {alerts.map((a, i) => (
            <p key={i} className="text-xs" style={{ color: "var(--text-primary)" }}>
              {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
