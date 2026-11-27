"use client";

import { motion, useDragControls, type PanInfo } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import type { Attachment, Item } from "@/lib/types";
import { CATEGORY_EMOJI, CATEGORY_LABEL, PERIOD_LABEL } from "@/lib/types";
import { attachmentUrl, fileSize, googleMapsUrl, isPdf, longDate, wazeUrl } from "@/lib/client";
import { SafeImg, StatusBadge, Rating } from "./ItemCard";
import {
  CalendarIcon, ClockIcon, CloseIcon, EditIcon, ExternalIcon, FileIcon, NavIcon, PinIcon, TicketIcon,
} from "./Icons";

const spring = { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const;

export function Scrim({ onClose, z }: { onClose: () => void; z?: number }) {
  return (
    <motion.div
      className="scrim"
      style={z ? { zIndex: z } : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      data-noheart
    />
  );
}

export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  const drag = useDragControls();
  const onEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };
  return (
    <motion.div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={spring}
      drag="y"
      dragControls={drag}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={onEnd}
    >
      <div className="sheet-drag" onPointerDown={(e) => drag.start(e)} />
      <div className="grabber" onPointerDown={(e) => drag.start(e)} />
      {children}
    </motion.div>
  );
}

// ───────── detalhes de um item
export function DetailSheet({
  item,
  onClose,
  onEdit,
  onDirections,
  onAttach,
  onOpenFile,
}: {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
  onDirections: () => void;
  onAttach: (file: File) => Promise<void>;
  onOpenFile: (file: Attachment) => void;
}) {
  const photos = [item.image_url, ...item.gallery].filter(Boolean);
  const [idx, setIdx] = useState(0);

  return (
    <Sheet onClose={onClose} label={item.title}>
      <button className="round-btn" style={{ left: 16 }} onClick={onClose} aria-label="Fechar">
        <CloseIcon />
      </button>
      <button className="round-btn" style={{ right: 16 }} onClick={onEdit} aria-label="Editar">
        <EditIcon />
      </button>
      <div className="sheet-scroll">
        <div className="gallery">
          {photos.length > 0 ? (
            <div
              className="gallery-track"
              onScroll={(e) => {
                const el = e.currentTarget;
                setIdx(Math.round(el.scrollLeft / el.clientWidth));
              }}
            >
              {photos.map((p, i) => (
                <SafeImg key={p} src={p.replace("w=1200", "w=1400")} alt={i === 0 ? item.title : ""} eager={i === 0} />
              ))}
            </div>
          ) : (
            <div style={{ height: "100%", display: "grid", placeItems: "center", fontSize: 64 }} aria-hidden>
              {CATEGORY_EMOJI[item.category]}
            </div>
          )}
          {photos.length > 1 && (
            <div className="gallery-dots" aria-hidden>
              {photos.map((_, i) => (
                <i key={i} className={i === idx ? "on" : ""} />
              ))}
            </div>
          )}
        </div>

        <div className="detail">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge status={item.status} />
            <Rating item={item} />
          </div>
          <h1 className="display" style={{ marginTop: 12 }}>
            {item.title}
          </h1>
          {item.subtitle && <p className="sub">{item.subtitle}</p>}

          <div className="facts">
            <span className="fact">
              <CalendarIcon size={15} /> {longDate(item.date)}
            </span>
            {(item.time || item.period) && (
              <span className="fact">
                <ClockIcon /> {item.time || PERIOD_LABEL[item.period]}
              </span>
            )}
            <span className="fact">{CATEGORY_LABEL[item.category]}</span>
          </div>

          {item.notes && (
            <div className="note">
              <b>💌 Nossa anotação</b>
              {item.notes}
            </div>
          )}

          <Tickets files={item.attachments} onAttach={onAttach} onOpen={onOpenFile} />

          {item.description && (
            <div>
              <div className="section-label">Sobre o lugar</div>
              <p className="desc">{item.description}</p>
            </div>
          )}

          {item.place && (
            <div className="actions">
              <button className="btn primary" onClick={onDirections}>
                <NavIcon /> Obter direções
              </button>
              <div className="fact" style={{ justifyContent: "flex-start", boxShadow: "none", background: "transparent", padding: "0 4px" }}>
                <PinIcon size={15} /> {item.place}
              </div>
            </div>
          )}

          {item.links.length > 0 && (
            <div>
              <div className="section-label">Saiba mais</div>
              <div className="link-list">
                {item.links.map((l) => (
                  <a key={l.url} className="link-item" href={l.url} target="_blank" rel="noreferrer">
                    <span className="grow">
                      {l.label}
                      <small>{new URL(l.url).hostname.replace("www.", "")}</small>
                    </span>
                    <ExternalIcon />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="actions">
            <button className="btn ghost" onClick={onEdit}>
              <EditIcon /> Editar item
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ───────── ingressos anexados ao item
function Tickets({
  files,
  onAttach,
  onOpen,
}: {
  files: Attachment[];
  onAttach: (file: File) => Promise<void>;
  onOpen: (file: Attachment) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      await onAttach(file);
    } catch (x) {
      const msg = (x as Error).message;
      if (msg !== "Edição cancelada") setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-label">Ingressos</div>
      {files.length > 0 && (
        <div className="link-list">
          {files.map((f) => (
            <button key={f.id} className="link-item ticket" onClick={() => onOpen(f)}>
              <span className="ticket-thumb" aria-hidden>
                {isPdf(f) ? <FileIcon /> : <img src={attachmentUrl(f.id)} alt="" loading="lazy" />}
              </span>
              <span className="grow">
                <span className="ticket-name">{f.name}</span>
                <small>{isPdf(f) ? "PDF" : "Imagem"} · {fileSize(f.size)}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/*"
        hidden
        onChange={pick}
      />
      <button className="btn ghost attach-btn" onClick={() => input.current?.click()} disabled={busy}>
        <TicketIcon /> {busy ? "Enviando…" : "Anexar ingresso"}
      </button>
      <p className="hint">PDF ou foto, até 4 MB.</p>
      {err && <p className="error">{err}</p>}
    </div>
  );
}

// ───────── escolher Google Maps ou Waze (action sheet estilo iOS)
export function DirectionsSheet({ place, onClose }: { place: string; onClose: () => void }) {
  return (
    <>
      <Scrim onClose={onClose} z={80} />
      <motion.div
        className="action-sheet"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        exit={{ y: "110%" }}
        transition={spring}
      >
        <div className="as-group">
          <div className="as-title">Como chegar em<br /><b style={{ color: "var(--ink)" }}>{place}</b></div>
          <a className="as-btn" href={googleMapsUrl(place)} target="_blank" rel="noreferrer" onClick={onClose}>
            Google Maps
          </a>
          <a className="as-btn" href={wazeUrl(place)} target="_blank" rel="noreferrer" onClick={onClose}>
            Waze
          </a>
        </div>
        <div className="as-group as-cancel">
          <button className="as-btn" style={{ fontWeight: 700 }} onClick={onClose}>
            Cancelar
          </button>
        </div>
      </motion.div>
    </>
  );
}
