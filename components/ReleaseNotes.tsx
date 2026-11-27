"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Scrim } from "./Sheets";

// Notas da versão: aparece uma vez por versão. Para uma versão nova,
// troque VERSION e o texto; quem já viu a anterior verá a nova uma vez.
export const VERSION = "1.2.5";
const KEY = "notas-versao-vista";

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === VERSION;
  } catch {
    return true;
  }
}

export default function ReleaseNotes({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (seen()) {
      onDone();
      return;
    }
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [ready, onDone]);

  const close = () => {
    try {
      localStorage.setItem(KEY, VERSION);
    } catch {}
    setOpen(false);
    onDone();
  };

  return (
    <AnimatePresence>
      {open && <Scrim key="notes-scrim" onClose={close} z={95} />}
      {open && (
        <motion.div
          key="notes"
          className="install notes"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notes-title"
          initial={{ y: "110%", opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "110%", opacity: 0.6 }}
          transition={{ type: "spring", stiffness: 360, damping: 34 }}
        >
          <p className="notes-version">Versão {VERSION}</p>
          <h2 id="notes-title" className="display">❤️ Uma nova atualização para nossa aventura!</h2>
          <div className="notes-text">
            <p>
              Meu amor, com esta atualização, agora podemos visualizar nossos ingressos diretamente pelo app,
              inclusive offline, sem depender de internet!
            </p>
            <p>
              Tudo para facilitar nossa viagem e deixar nossa única preocupação ser aproveitar cada momento juntos.
            </p>
            <p>Porque o melhor destino sempre será estar ao seu lado, Rayza. ❤️</p>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={close}>Continuar</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
