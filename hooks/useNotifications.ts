"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MealItem } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationsState {
  permission:        NotificationPermission | "unsupported";
  isScheduled:       boolean;
  requestPermission: () => Promise<boolean>;
  scheduleForToday:  (meals: MealItem[]) => void;
  cancelAll:         () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function msUntil(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  return target.getTime() - Date.now();
}

function notify(title: string, body: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon.svg", badge: "/icons/icon.svg" });
  } catch {}
}

const ASKED_KEY = "tiva_notif_asked";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications(autoAsk = false): NotificationsState {
  const supported = typeof window !== "undefined" && "Notification" in window;

  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => (supported ? Notification.permission : "unsupported")
  );
  const [isScheduled, setIsScheduled] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keep permission state in sync with browser
  useEffect(() => {
    if (!supported) return;
    const id = setInterval(() => setPermission(Notification.permission), 5000);
    return () => clearInterval(id);
  }, [supported]);

  // Auto-ask on first dashboard visit (after 2 s so the page feels settled)
  useEffect(() => {
    if (!supported || !autoAsk) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(ASKED_KEY)) return;

    const id = setTimeout(async () => {
      localStorage.setItem(ASKED_KEY, "1");
      const result = await Notification.requestPermission();
      setPermission(result);
    }, 2000);

    return () => clearTimeout(id);
  }, [supported, autoAsk]);

  // Cleanup on unmount
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const cancelAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setIsScheduled(false);
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    localStorage.setItem(ASKED_KEY, "1");
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, [supported]);

  const scheduleForToday = useCallback(
    (meals: MealItem[]) => {
      if (!supported || Notification.permission !== "granted") return;
      cancelAll();

      const ids: ReturnType<typeof setTimeout>[] = [];
      const isSunday = new Date().getDay() === 0;

      // Each meal: notification 10 min before
      meals.forEach(meal => {
        const ms = msUntil(meal.time) - 10 * 60_000;
        if (ms <= 0) return;
        ids.push(
          setTimeout(() => {
            const preview = meal.items.slice(0, 2).join(" · ");
            notify(`${meal.emoji} ${meal.name} em 10 min`, preview);
          }, ms)
        );
      });

      // 20:00 daily — marmita alert
      const marmitaMs = msUntil("20:00");
      if (marmitaMs > 0) {
        ids.push(
          setTimeout(
            () => notify("🍱 Hora de preparar a marmita!", "Prepara a refeição de amanhã enquanto jantas."),
            marmitaMs
          )
        );
      }

      // 21:30 Sundays — extra cooking reminder
      if (isSunday) {
        const extraMs = msUntil("21:30");
        if (extraMs > 0) {
          ids.push(
            setTimeout(
              () => notify("🍳 Cozinha extra!", "Prepara o frango e arroz extra para Segunda e Terça!"),
              extraMs
            )
          );
        }
      }

      timers.current = ids;
      setIsScheduled(ids.length > 0);
    },
    [supported, cancelAll]
  );

  if (!supported) {
    return {
      permission:        "unsupported",
      isScheduled:       false,
      requestPermission: async () => false,
      scheduleForToday:  () => {},
      cancelAll:         () => {},
    };
  }

  return { permission, isScheduled, requestPermission, scheduleForToday, cancelAll };
}
