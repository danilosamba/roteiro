"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, Item, ItemInput } from "@/lib/types";
import { CATEGORY_EMOJI, CATEGORY_LABEL, PERIOD_LABEL, TRIP } from "@/lib/types";
import {
  api, countdownLabel, DAY_TITLES, dayNum, getPin, longDate, minutesOf, setPin, sortDay,
  todayISO, tripDays, weekdayShort,
} from "@/lib/client";
import ItemCard, { SafeImg, StatusBadge } from "./ItemCard";
import { DetailSheet, DirectionsSheet, Scrim, Sheet } from "./Sheets";
import EditSheet, { emptyItem } from "./EditSheet";
import HeartFX from "./HeartFX";
import Splash from "./Splash";
import InstallPrompt, { OPEN_INSTALL_EVENT, isStandalone } from "./InstallPrompt";
import { CalendarIcon, HeartIcon, PinIcon, PlusIcon } from "./Icons";

type Tab = "roteiro" | "lugares" | "nos";
type EditState = { initial: ItemInput; id: number | null } | null;

const ease = [0.22, 1, 0.36, 1] as const;
const DAYS = tripDays();

function firstDay(): string {
  const t = todayISO();
  return DAYS.includes(t) ? t : DAYS[0];
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [items, setItems] = useState<Item[] | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [tab, setTab] = useState<Tab>("roteiro");
  const [day, setDay] = useState(firstDay);
  const [dir, setDir] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState>(null);
  const [dirPlace, setDirPlace] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [askPin, setAskPin] = useState<null | ((ok: boolean) => void)>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("splash-seen")) setSplash(false);
    } catch {}
    api.list().then(setItems).catch((e) => setLoadErr(e.message));
  }, []);

  const endSplash = useCallback(() => {
    setSplash(false);
    try {
      sessionStorage.setItem("splash-seen", "1");
    } catch {}
  }, []);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 2200);
  };

  // pede o PIN quando o servidor exige e tenta de novo
  const withPin = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if ((e as { status?: number }).status !== 401) throw e;
      const ok = await new Promise<boolean>((res) => setAskPin(() => res));
      if (!ok) throw new Error("Edição cancelada");
      return fn();
    }
  };

  const byDay = useMemo(() => {
    const m: Record<string, Item[]> = {};
    for (const d of DAYS) m[d] = [];
    for (const i of items || []) (m[i.date] ||= []).push(i);
    for (const d in m) m[d] = sortDay(m[d]);
    return m;
  }, [items]);

  const open = items?.find((i) => i.id === openId) || null;

  const nextUp = useMemo(() => {
    if (!items) return null;
    const now = new Date();
    const nowKey = todayISO() + String(now.getHours() * 60 + now.getMinutes()).padStart(5, "0");
    const withImg = items.filter((i) => i.image_url && i.status !== "sugestao");
    const sorted = [...withImg].sort(
      (a, b) => a.date.localeCompare(b.date) || minutesOf(a) - minutesOf(b),
    );
    return sorted.find((i) => i.date + String(minutesOf(i)).padStart(5, "0") >= nowKey) || sorted[0] || null;
  }, [items]);

  const pickDay = (d: string) => {
    setDir(DAYS.indexOf(d) > DAYS.indexOf(day) ? 1 : -1);
    setDay(d);
  };

  const saveItem = async (v: ItemInput) => {
    if (edit?.id) {
      const up = await withPin(() => api.update(edit.id!, v));
      setItems((s) => s!.map((i) => (i.id === up.id ? up : i)));
      showToast("Salvo 💗");
    } else {
      const created = await withPin(() => api.create(v));
      setItems((s) => [...(s || []), created]);
      showToast("Adicionado ao roteiro 💗");
      if (created.date !== day) pickDay(created.date);
    }
    setEdit(null);
  };

  const deleteItem = async () => {
    if (!edit?.id) return;
    const id = edit.id;
    await withPin(() => api.remove(id));
    setItems((s) => s!.filter((i) => i.id !== id));
    setEdit(null);
    setOpenId(null);
    showToast("Item apagado");
  };

  const startEdit = (i: Item) => {
    const { id, ...rest } = i;
    setEdit({ initial: rest, id });
  };

  return (
    <>
      <HeartFX />
      <AnimatePresence>{splash && <Splash key="splash" onDone={endSplash} />}</AnimatePresence>
      <InstallPrompt ready={!splash} />

      <main className="app">
        {!splash && (
          <AnimatePresence mode="wait" initial>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease }}
            >
              {tab === "roteiro" && (
                <Roteiro
                  items={items}
                  loadErr={loadErr}
                  byDay={byDay}
                  day={day}
                  dir={dir}
                  pickDay={pickDay}
                  nextUp={nextUp}
                  onOpen={setOpenId}
                />
              )}
              {tab === "lugares" && <Lugares items={items || []} onOpen={setOpenId} />}
              {tab === "nos" && <Nos items={items || []} onOpen={setOpenId} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {!splash && tab === "roteiro" && (
        <motion.button
          className="fab"
          aria-label="Adicionar item ao roteiro"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setEdit({ initial: emptyItem(day), id: null })}
        >
          <PlusIcon />
        </motion.button>
      )}

      {!splash && <TabBar tab={tab} setTab={setTab} />}

      <AnimatePresence>
        {open && <Scrim key="s1" onClose={() => setOpenId(null)} />}
        {open && (
          <DetailSheet
            key={"d" + open.id}
            item={open}
            onClose={() => setOpenId(null)}
            onEdit={() => startEdit(open)}
            onDirections={() => setDirPlace(open.place)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {edit && <Scrim key="s2" z={70} onClose={() => setEdit(null)} />}
        {edit && (
          <div key="e" style={{ position: "relative", zIndex: 71 }}>
            <EditSheet
              initial={edit.initial}
              editingId={edit.id}
              onClose={() => setEdit(null)}
              onSave={saveItem}
              onDelete={deleteItem}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dirPlace && <DirectionsSheet key="dir" place={dirPlace} onClose={() => setDirPlace(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {askPin && (
          <PinSheet
            key="pin"
            onDone={(ok) => {
              askPin(ok);
              setAskPin(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            className="toast"
            initial={{ opacity: 0, y: 16, scale: 0.9, x: "-50%" }}
            animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 8, x: "-50%" }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ───────────────────────── Roteiro
function Roteiro({
  items, loadErr, byDay, day, dir, pickDay, nextUp, onOpen,
}: {
  items: Item[] | null;
  loadErr: string;
  byDay: Record<string, Item[]>;
  day: string;
  dir: number;
  pickDay: (d: string) => void;
  nextUp: Item | null;
  onOpen: (id: number) => void;
}) {
  const today = todayISO();
  const list = byDay[day] || [];
  const dayIdx = DAYS.indexOf(day);

  return (
    <div className="screen">
      <Header />

      {nextUp && (
        <motion.button
          className="hero"
          onClick={() => onOpen(nextUp.id)}
          data-heart
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease }}
          whileTap={{ scale: 0.98 }}
        >
          <SafeImg src={nextUp.image_url} alt="" eager />
          <span className="hero-body">
            <span className="hero-kicker">
              <HeartIcon size={12} filled /> Próximo
            </span>
            <span className="hero-title display" style={{ display: "block" }}>{nextUp.title}</span>
            <span className="hero-meta" style={{ display: "block" }}>
              {weekdayShort(nextUp.date)}, {dayNum(nextUp.date)}/12 ·{" "}
              {nextUp.time || PERIOD_LABEL[nextUp.period]}
            </span>
          </span>
        </motion.button>
      )}

      <div className="days" role="tablist" aria-label="Dias da viagem">
        {DAYS.map((d, i) => (
          <motion.button
            key={d}
            role="tab"
            aria-selected={d === day}
            className="day-chip"
            onClick={() => pickDay(d)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + i * 0.04, duration: 0.45, ease }}
            whileTap={{ scale: 0.93 }}
          >
            {d === day && (
              <motion.span layoutId="day-pill" className="pill-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            )}
            <div className="wd">{weekdayShort(d)}</div>
            <div className="dn" style={{ position: "relative", zIndex: 1 }}>{dayNum(d)}</div>
            {d === today && <span className="today-dot" />}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.section
          key={day}
          custom={dir}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: 40 * d }),
            center: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: -40 * d }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.38, ease }}
        >
          <div className="day-head">
            <div>
              <div className="num">Dia {dayIdx + 1} · {longDate(day)}</div>
              <h2 className="display">{DAY_TITLES[day] || "Dia livre"}</h2>
            </div>
          </div>

          {loadErr && <p className="empty">Não consegui carregar o roteiro: {loadErr}</p>}
          {!items && !loadErr && <p className="empty">Carregando…</p>}
          {items && list.length === 0 && <p className="empty">Nada por aqui ainda. Toque no + para adicionar ✨</p>}

          <div className="timeline">
            {list.map((it, i) => (
              <motion.div
                key={it.id}
                className="slot"
                layout
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + i * 0.06, duration: 0.5, ease }}
              >
                <div className="when">
                  {it.time ? (
                    <>
                      <div className="t">{it.time}</div>
                      {it.period && <div className="p">{PERIOD_LABEL[it.period]}</div>}
                    </>
                  ) : (
                    <div className="p" style={{ paddingTop: 2 }}>{PERIOD_LABEL[it.period] || "—"}</div>
                  )}
                  <HeartIcon className="heart-pin" size={12} filled={it.status === "reservado"} />
                </div>
                <ItemCard item={it} onOpen={() => onOpen(it.id)} />
              </motion.div>
            ))}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

function Header() {
  return (
    <>
      <motion.div className="top" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <span className="couple-chip">
          <span className="dot">💗</span> {TRIP.couple}
        </span>
        <span className="countdown">{countdownLabel()}</span>
      </motion.div>
      <motion.p className="hello" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        Nossa viagem para a serra
      </motion.p>
      <motion.h1
        className="title-xl display"
        initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, delay: 0.05, ease }}
      >
        Gramado
        <br />
        <em>&amp; Canela</em>
      </motion.h1>
    </>
  );
}

// ───────────────────────── Lugares (grade de fotos)
function Lugares({ items, onOpen }: { items: Item[]; onOpen: (id: number) => void }) {
  const [cat, setCat] = useState<Category | "todos">("todos");
  const seen = new Set<string>();
  const places = items.filter((i) => {
    if (!i.image_url || (cat !== "todos" && i.category !== cat)) return false;
    const key = i.place || i.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const cats = (Object.keys(CATEGORY_LABEL) as Category[]).filter((c) => items.some((i) => i.category === c && i.image_url));

  return (
    <div className="screen">
      <p className="hello" style={{ marginTop: 6 }}>Conheça antes de ir</p>
      <h1 className="title-xl display">Lugares</h1>

      <div className="filters">
        {(["todos", ...cats] as const).map((c) => (
          <button key={c} className="filter" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {cat === c && <motion.span layoutId="filter-pill" className="pill-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span>{c === "todos" ? "Todos" : `${CATEGORY_EMOJI[c]} ${CATEGORY_LABEL[c]}`}</span>
          </button>
        ))}
      </div>

      <motion.div className="grid" layout>
        <AnimatePresence mode="popLayout">
          {places.map((p, i) => (
            <motion.button
              key={p.id}
              className="tile"
              onClick={() => onOpen(p.id)}
              data-heart
              layout
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.4), ease }}
              whileTap={{ scale: 0.97 }}
            >
              <SafeImg src={p.image_url.replace("w=1200", "w=600")} alt="" />
              <span className="fav" aria-hidden>
                <HeartIcon size={15} filled={p.status === "reservado"} />
              </span>
              <span className="tile-body">
                <b>{p.title}</b>
                <small>
                  {weekdayShort(p.date)}, {dayNum(p.date)}/12
                </small>
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ───────────────────────── Nós (resumo, hotel e legenda)
function Nos({ items, onOpen }: { items: Item[]; onOpen: (id: number) => void }) {
  const hotel = items.find((i) => i.category === "hotel");
  const reserved = items.filter((i) => i.status === "reservado").length;
  const ease2 = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.05 + i * 0.07, duration: 0.5, ease },
  });

  return (
    <div className="screen">
      <p className="hello" style={{ marginTop: 6 }}>{TRIP.couple}</p>
      <h1 className="title-xl display">Nós dois 💗</h1>

      <motion.div className="love-card" {...ease2(0)}>
        <div className="stripes" />
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.9 }}>
          Contagem regressiva
        </div>
        <div className="big display" style={{ marginTop: 6 }}>{countdownLabel()}</div>
        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.92 }}>
          5 a 10 de dezembro de 2026 · 5 noites na serra
        </div>
      </motion.div>

      <motion.div {...ease2(1)}>
        <div className="group-label">Resumo</div>
        <div className="group info-list" style={{ marginTop: 0 }}>
          <div className="info-row">
            <span className="ico">🎟️</span>
            <div><b>{reserved} itens reservados</b><span>Ingressos e horários já contratados. Não mudar.</span></div>
          </div>
          <div className="info-row">
            <span className="ico">🚗</span>
            <div><b>Carro alugado</b><span>Use &quot;Obter direções&quot; em cada lugar para abrir o Google Maps ou o Waze.</span></div>
          </div>
          {!isStandalone() && (
            <button
              className="info-row"
              style={{ width: "100%", textAlign: "left" }}
              onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_EVENT))}
            >
              <span className="ico">📲</span>
              <div><b>Adicionar à tela inicial</b><span>Para abrir o roteiro como um app no celular.</span></div>
            </button>
          )}
          {hotel && (
            <button className="info-row" style={{ width: "100%", textAlign: "left" }} onClick={() => onOpen(hotel.id)}>
              <span className="ico">🏡</span>
              <div>
                <b>Sky Ville Hotel Gramado</b>
                <span>Rua Itapeva, 59 · Check-in 05/12 às 14h · Check-out 10/12 até 12h</span>
              </div>
            </button>
          )}
        </div>
      </motion.div>

      <motion.div {...ease2(2)}>
        <div className="group-label">Legenda</div>
        <div className="group info-list" style={{ marginTop: 0 }}>
          <div className="info-row"><StatusBadge status="reservado" /><span>Já contratado, horário fixo</span></div>
          <div className="info-row"><StatusBadge status="planejado" /><span>Plano nosso, flexível</span></div>
          <div className="info-row"><StatusBadge status="sugestao" /><span>Ideia opcional, não reservada</span></div>
        </div>
      </motion.div>

      <motion.p {...ease2(3)} className="hint" style={{ textAlign: "center", margin: "26px 0 0" }}>
        Fotos e notas: TripAdvisor · feito com carinho ✦
      </motion.p>
    </div>
  );
}

// ───────────────────────── Tab bar
function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "roteiro", label: "Roteiro", icon: <CalendarIcon /> },
    { id: "lugares", label: "Lugares", icon: <PinIcon /> },
    { id: "nos", label: "Nós", icon: <HeartIcon /> },
  ];
  return (
    <motion.nav
      className="tabbar"
      role="tablist"
      initial={{ y: 90 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
      style={{ x: "-50%" }}
    >
      {tabs.map((t) => (
        <motion.button
          key={t.id}
          role="tab"
          className="tab"
          aria-selected={tab === t.id}
          onClick={() => {
            setTab(t.id);
            window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
          }}
          whileTap={{ scale: 0.88 }}
        >
          <motion.span
            animate={tab === t.id ? { scale: [1, 1.2, 1], y: [0, -3, 0] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{ display: "grid" }}
          >
            {t.id === "nos" && tab === "nos" ? <HeartIcon filled /> : t.icon}
          </motion.span>
          {t.label}
        </motion.button>
      ))}
    </motion.nav>
  );
}

// ───────────────────────── PIN para editar
function PinSheet({ onDone }: { onDone: (ok: boolean) => void }) {
  const [pin, setP] = useState(getPin());
  const [err, setErr] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setTimeout(() => ref.current?.focus(), 350);
  }, []);
  const submit = async () => {
    if (await api.checkPin(pin)) {
      setPin(pin);
      onDone(true);
    } else {
      setErr(true);
    }
  };
  return (
    <>
      <Scrim onClose={() => onDone(false)} z={90} />
      <div style={{ position: "relative", zIndex: 91 }}>
        <Sheet onClose={() => onDone(false)} label="PIN">
          <div className="sheet-scroll" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 44 }}>🔐</div>
            <h2 className="display" style={{ fontSize: 28, marginTop: 8 }}>Só para nós dois</h2>
            <p className="hint" style={{ marginTop: 6 }}>Digite o PIN para salvar alterações.</p>
            <motion.input
              ref={ref}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => { setP(e.target.value); setErr(false); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              animate={err ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                marginTop: 20, width: "100%", height: 54, borderRadius: 16, border: "1.5px solid var(--line)",
                textAlign: "center", fontSize: 24, letterSpacing: ".4em", background: "#fff",
              }}
              aria-label="PIN"
            />
            {err && <p className="error">PIN incorreto</p>}
            <div className="actions">
              <button className="btn primary" onClick={submit}>Entrar</button>
            </div>
          </div>
        </Sheet>
      </div>
    </>
  );
}
