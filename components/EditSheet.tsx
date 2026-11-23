"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { Category, Item, ItemInput, Period, Status } from "@/lib/types";
import { CATEGORY_LABEL, PERIOD_LABEL, STATUS_LABEL } from "@/lib/types";
import { longDate, tripDays } from "@/lib/client";
import { Sheet } from "./Sheets";

const STATUSES: Status[] = ["reservado", "planejado", "sugestao"];

export function emptyItem(date: string): ItemInput {
  return {
    date,
    time: "",
    period: "tarde",
    title: "",
    subtitle: "",
    status: "planejado",
    category: "passeio",
    place: "",
    description: "",
    image_url: "",
    gallery: [],
    links: [],
    rating: "",
    reviews: "",
    notes: "",
    sort: 999,
  };
}

export default function EditSheet({
  initial,
  editingId,
  onClose,
  onSave,
  onDelete,
}: {
  initial: ItemInput;
  editingId: number | null;
  onClose: () => void;
  onSave: (v: ItemInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [v, setV] = useState<ItemInput>(initial);
  const [link, setLink] = useState(initial.links[0]?.url || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const set = <K extends keyof ItemInput>(k: K, val: ItemInput[K]) => setV((s) => ({ ...s, [k]: val }));

  const save = async () => {
    if (!v.title.trim()) {
      setErr("Dê um nome para o item 💗");
      return;
    }
    setBusy(true);
    setErr("");
    const rest = initial.links.slice(1);
    const links = link.trim()
      ? [{ label: initial.links[0]?.label || (link.includes("tripadvisor") ? "TripAdvisor" : "Link"), url: link.trim() }, ...rest]
      : rest;
    try {
      await onSave({ ...v, links });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  const del = async () => {
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    setBusy(true);
    try {
      await onDelete?.();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} label={editingId ? "Editar item" : "Novo item"}>
      <div className="form-head">
        <button onClick={onClose}>Cancelar</button>
        <b>{editingId ? "Editar" : "Novo item"}</b>
        <button className="save" onClick={save} disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </button>
      </div>
      <div className="sheet-scroll">
        <div className="form">
          <div className="group-label">O quê</div>
          <div className="group">
            <div className="field">
              <label htmlFor="f-title">Nome</label>
              <input id="f-title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Café colonial" enterKeyHint="next" />
            </div>
            <div className="field">
              <label htmlFor="f-sub">Detalhe</label>
              <input id="f-sub" value={v.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="Ex.: Canela" />
            </div>
            <div className="field">
              <label htmlFor="f-cat">Tipo</label>
              <select id="f-cat" value={v.category} onChange={(e) => set("category", e.target.value as Category)}>
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field col">
              <label>Situação</label>
              <div className="segmented" role="radiogroup">
                {STATUSES.map((s) => (
                  <button key={s} role="radio" aria-checked={v.status === s} onClick={() => set("status", s)} type="button">
                    {v.status === s && <motion.span layoutId="seg" className="seg-bg" transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} />}
                    <span>{STATUS_LABEL[s]}</span>
                  </button>
                ))}
              </div>
              <p className="hint" style={{ margin: "6px 0 10px" }}>
                Reservado = ingresso ou horário já contratado · Sugestão = ideia opcional
              </p>
            </div>
          </div>

          <div className="group-label">Quando</div>
          <div className="group">
            <div className="field">
              <label htmlFor="f-date">Dia</label>
              <select id="f-date" value={v.date} onChange={(e) => set("date", e.target.value)}>
                {tripDays().map((d) => (
                  <option key={d} value={d}>
                    {longDate(d)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-time">Horário</label>
              <input id="f-time" type="time" value={v.time} onChange={(e) => set("time", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f-period">Período</label>
              <select id="f-period" value={v.period} onChange={(e) => set("period", e.target.value as Period)}>
                {(["manha", "tarde", "noite", ""] as Period[]).map((p) => (
                  <option key={p} value={p}>
                    {p ? PERIOD_LABEL[p] : "Sem período"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="group-label">Onde</div>
          <div className="group">
            <div className="field col">
              <label htmlFor="f-place">Endereço ou nome do lugar (usado no GPS)</label>
              <input id="f-place" value={v.place} onChange={(e) => set("place", e.target.value)} placeholder="Ex.: Lago Negro, Gramado - RS" />
            </div>
          </div>

          <div className="group-label">Detalhes</div>
          <div className="group">
            <div className="field col">
              <label htmlFor="f-desc">Sobre o lugar</label>
              <textarea id="f-desc" rows={4} value={v.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="field col">
              <label htmlFor="f-notes">Nossa anotação 💌</label>
              <textarea id="f-notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ingresso, o que levar, lembretes…" />
            </div>
          </div>

          <div className="group-label">Foto e link</div>
          <div className="group">
            <div className="field col">
              <label htmlFor="f-img">Link da foto</label>
              <input id="f-img" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={v.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" />
            </div>
            <div className="field col">
              <label htmlFor="f-link">Link do TripAdvisor (ou outro site)</label>
              <input id="f-link" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.tripadvisor.com.br/…" />
            </div>
          </div>
          <p className="hint">
            Dica: no TripAdvisor, toque e segure numa foto e escolha &quot;Copiar endereço da imagem&quot;.
          </p>
          {v.image_url && /^https?:\/\//.test(v.image_url) && (
            <div className="img-preview">
              <img src={v.image_url} alt="Prévia da foto" referrerPolicy="no-referrer" />
            </div>
          )}

          {err && <p className="error">{err}</p>}

          <div className="actions" style={{ marginBottom: 12 }}>
            <button className="btn primary" onClick={save} disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </button>
            {editingId && onDelete && (
              <button className="btn danger" onClick={del} disabled={busy}>
                {busy && confirmDel ? "Apagando…" : confirmDel ? "Toque de novo para apagar" : "Apagar item"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
