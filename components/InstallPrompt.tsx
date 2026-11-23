"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Scrim } from "./Sheets";

// Convite para adicionar o app à tela inicial.
// Android/Chrome: usa o instalador nativo. iPhone: mostra o passo a passo do Safari.
type Mode = "native" | "ios" | "ios-inapp";
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "a2hs-snooze";
const SNOOZE_DAYS = 3;
export const OPEN_INSTALL_EVENT = "abrir-instalacao";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): Mode | null {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!ios) return null;
  return /Instagram|FBAN|FBAV|WhatsApp|Line\/|TikTok/i.test(ua) ? "ios-inapp" : "ios";
}

function snoozed(): boolean {
  try {
    const v = Number(localStorage.getItem(KEY) || 0);
    return Date.now() < v;
  } catch {
    return false;
  }
}

function snooze(days: number) {
  try {
    localStorage.setItem(KEY, String(Date.now() + days * 86400000));
  } catch {}
}

const ShareGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a72e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
  </svg>
);

const AddGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8.5v7M8.5 12h7" />
  </svg>
);

export default function InstallPrompt({ ready }: { ready: boolean }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [open, setOpen] = useState(false);
  const deferred = useRef<BIPEvent | null>(null);

  // descobre a plataforma e guarda o instalador do Chrome/Android
  useEffect(() => {
    if (isStandalone()) return;
    const ios = detectIOS();
    if (ios) setMode(ios);

    const onBIP = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BIPEvent;
      setMode("native");
    };
    const onInstalled = () => {
      snooze(3650);
      setOpen(false);
    };
    const onManual = () => {
      setMode((m) => m ?? "ios");
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener(OPEN_INSTALL_EVENT, onManual);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener(OPEN_INSTALL_EVENT, onManual);
    };
  }, []);

  // abre sozinho um pouco depois da tela de abertura
  useEffect(() => {
    // só abre sozinho em celular/tablet; no computador fica o botão na aba "Nós"
    if (!ready || !mode || snoozed() || !window.matchMedia("(pointer: coarse)").matches) return;
    const t = setTimeout(() => setOpen(true), 1400);
    return () => clearTimeout(t);
  }, [ready, mode]);

  const later = () => {
    snooze(SNOOZE_DAYS);
    setOpen(false);
  };

  const install = async () => {
    const ev = deferred.current;
    if (!ev) return;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    deferred.current = null;
    snooze(outcome === "accepted" ? 3650 : SNOOZE_DAYS);
    setOpen(false);
  };

  const step = (i: number) => ({
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: 0.25 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <AnimatePresence>
      {open && <Scrim key="a2hs-scrim" onClose={later} z={95} />}
      {open && (
        <motion.div
          key="a2hs"
          className="install"
          role="dialog"
          aria-modal="true"
          aria-labelledby="a2hs-title"
          initial={{ y: "110%", opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "110%", opacity: 0.6 }}
          transition={{ type: "spring", stiffness: 360, damping: 34 }}
        >
          <motion.img
            src="/apple-touch-icon.png"
            alt=""
            className="install-icon"
            initial={{ scale: 0.4, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.12 }}
          />
          <h2 id="a2hs-title" className="display">Leve a viagem no bolso</h2>
          <p className="install-text">
            Adicione o roteiro à tela inicial. Ele abre em tela cheia, como um app de verdade 💗
          </p>

          {mode === "native" && (
            <div className="actions">
              <button className="btn primary" onClick={install}>Adicionar à tela inicial</button>
            </div>
          )}

          {mode === "ios" && (
            <ol className="install-steps">
              <motion.li {...step(0)}>
                <span className="n">1</span>
                <span>Toque em <b>Compartilhar</b> <ShareGlyph /> no Safari (se não aparecer, toque em <b>•••</b> primeiro)</span>
              </motion.li>
              <motion.li {...step(1)}>
                <span className="n">2</span>
                <span>Role e escolha <b>Adicionar à Tela de Início</b> <AddGlyph /></span>
              </motion.li>
              <motion.li {...step(2)}>
                <span className="n">3</span>
                <span>Toque em <b>Adicionar</b>, no canto de cima</span>
              </motion.li>
            </ol>
          )}

          {mode === "ios-inapp" && (
            <ol className="install-steps">
              <motion.li {...step(0)}>
                <span className="n">1</span>
                <span>Este link abriu dentro de outro app. Toque em <b>•••</b> e escolha <b>Abrir no Safari</b></span>
              </motion.li>
              <motion.li {...step(1)}>
                <span className="n">2</span>
                <span>No Safari, toque em <b>Compartilhar</b> <ShareGlyph /> e depois em <b>Adicionar à Tela de Início</b></span>
              </motion.li>
            </ol>
          )}

          <button className="btn danger" style={{ width: "100%", color: "var(--muted)" }} onClick={later}>
            Agora não
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
