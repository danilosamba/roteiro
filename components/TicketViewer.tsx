"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/types";
import { attachmentDownloadUrl, attachmentUrl, fileSize, isPdf } from "@/lib/client";
import { CloseIcon, DownloadIcon } from "./Icons";

// Abre o ingresso em tela cheia: imagem direto, PDF desenhado página a página com o pdf.js.
export default function TicketViewer({
  file,
  onClose,
  onDelete,
}: {
  file: Attachment;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const remove = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={file.name}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      data-noheart
    >
      <div className="viewer-bar">
        <button className="viewer-btn" onClick={onClose} aria-label="Fechar">
          <CloseIcon />
        </button>
        <div className="viewer-name">
          <b>{file.name}</b>
          <small>{isPdf(file) ? "PDF" : "Imagem"} · {fileSize(file.size)}</small>
        </div>
        <a className="viewer-btn" href={attachmentDownloadUrl(file.id)} download={file.name} aria-label="Baixar">
          <DownloadIcon />
        </a>
      </div>

      <div className="viewer-body">
        {isPdf(file) ? (
          <PdfPages url={attachmentUrl(file.id)} />
        ) : (
          <img className="viewer-img" src={attachmentUrl(file.id)} alt={file.name} />
        )}
      </div>

      <div className="viewer-foot">
        <a className="btn primary" href={attachmentDownloadUrl(file.id)} download={file.name}>
          <DownloadIcon /> Baixar arquivo
        </a>
        <button className="btn danger" onClick={remove} disabled={busy}>
          {busy ? "Removendo…" : confirm ? "Toque de novo para remover" : "Remover anexo"}
        </button>
        {err && <p className="error" style={{ textAlign: "center" }}>{err}</p>}
      </div>
    </motion.div>
  );
}

function PdfPages({ url }: { url: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url });
        destroy = () => void task.destroy();
        const doc = await task.promise;
        const el = box.current;
        if (cancelled || !el) return;
        el.replaceChildren();
        const width = el.clientWidth;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);

        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width * dpr) / base.width });
          const canvas = document.createElement("canvas");
          canvas.className = "viewer-page";
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.setAttribute("aria-label", `Página ${n} de ${doc.numPages}`);
          el.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
          if (n === 1) setState("ok");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [url]);

  return (
    <>
      {state === "loading" && <p className="viewer-msg">Abrindo o PDF…</p>}
      {state === "error" && (
        <p className="viewer-msg">Não consegui mostrar este PDF aqui. Use o botão Baixar para abrir no celular.</p>
      )}
      <div ref={box} className="viewer-pages" />
    </>
  );
}
