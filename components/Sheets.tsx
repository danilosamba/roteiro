"use client";

import { motion, useDragControls, type PanInfo } from "motion/react";
import { useState, type ReactNode } from "react";
import type { Item } from "@/lib/types";
import { CATEGORY_EMOJI, CATEGORY_LABEL, PERIOD_LABEL } from "@/lib/types";
import { googleMapsUrl, longDate, wazeUrl } from "@/lib/client";
import { SafeImg, StatusBadge, Rating } from "./ItemCard";
import { CalendarIcon, ClockIcon, CloseIcon, EditIcon, ExternalIcon, NavIcon, PinIcon } from "./Icons";

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
}: {
  item: Item;
  onClose: () => void;
  onEdit: () => void;
  onDirections: () => void;
}) {
  const photos = [item.image_url, ...item.gallery].filter(Boolean);
  const [idx, setIdx] = useState(0);
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.12 + i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  });

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
          <motion.div {...stagger(0)} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <StatusBadge status={item.status} />
            <Rating item={item} />
          </motion.div>
          <motion.h1 className="display" {...stagger(1)} style={{ marginTop: 10 }}>
            {item.title}
          </motion.h1>
          {item.subtitle && (
            <motion.p className="sub" {...stagger(2)}>
              {item.subtitle}
            </motion.p>
          )}

          <motion.div className="facts" {...stagger(3)}>
            <span className="fact">
              <CalendarIcon size={15} /> {longDate(item.date)}
            </span>
            {(item.time || item.period) && (
              <span className="fact">
                <ClockIcon /> {item.time || PERIOD_LABEL[item.period]}
              </span>
            )}
            <span className="fact">
              {CATEGORY_EMOJI[item.category]} {CATEGORY_LABEL[item.category]}
            </span>
          </motion.div>

          {item.notes && (
            <motion.div className="note" {...stagger(4)}>
              <b>💌 Nossa anotação</b>
              {item.notes}
            </motion.div>
          )}

          {item.description && (
            <motion.div {...stagger(5)}>
              <div className="section-label">Sobre o lugar</div>
              <p className="desc">{item.description}</p>
            </motion.div>
          )}

          {item.place && (
            <motion.div className="actions" {...stagger(6)}>
              <button className="btn primary" onClick={onDirections}>
                <NavIcon /> Obter direções
              </button>
              <div className="fact" style={{ justifyContent: "flex-start", boxShadow: "none", background: "transparent", padding: "0 4px" }}>
                <PinIcon size={15} /> {item.place}
              </div>
            </motion.div>
          )}

          {item.links.length > 0 && (
            <motion.div {...stagger(7)}>
              <div className="section-label">Saiba mais</div>
              <div className="link-list">
                {item.links.map((l) => (
                  <a key={l.url} className="link-item" href={l.url} target="_blank" rel="noreferrer">
                    <span className="ta" aria-hidden>★</span>
                    <span className="grow">
                      {l.label}
                      <small>{new URL(l.url).hostname.replace("www.", "")}</small>
                    </span>
                    <ExternalIcon />
                  </a>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div className="actions" {...stagger(8)}>
            <button className="btn ghost" onClick={onEdit}>
              <EditIcon /> Editar item
            </button>
          </motion.div>
        </div>
      </div>
    </Sheet>
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
            🗺️ Google Maps
          </a>
          <a className="as-btn" href={wazeUrl(place)} target="_blank" rel="noreferrer" onClick={onClose}>
            🚙 Waze
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
