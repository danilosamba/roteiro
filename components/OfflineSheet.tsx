"use client";

import { useEffect, useState } from "react";
import type { Item } from "@/lib/types";
import { fileSize } from "@/lib/client";
import {
  downloadAll, offlineInfo, offlineSupported, planDownload, removeOffline, type OfflineInfo, type Plan,
} from "@/lib/offline";
import { Scrim, Sheet } from "./Sheets";

const sum = (l: { size: number }[]) => l.reduce((s, f) => s + f.size, 0);
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function savedLabel(info: OfflineInfo) {
  const d = new Date(info.savedAt);
  const day = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${fileSize(info.bytes)} no celular · atualizado em ${day} às ${time}`;
}

// Texto discreto no fim da guia Nós
export function OfflineLink({ onOpen }: { onOpen: () => void }) {
  const [info, setInfo] = useState<OfflineInfo | null>(null);
  useEffect(() => {
    setInfo(offlineInfo());
    const sync = () => setInfo(offlineInfo());
    window.addEventListener("offline-changed", sync);
    return () => window.removeEventListener("offline-changed", sync);
  }, []);
  return (
    <button className="offline-link" onClick={onOpen}>
      {info ? `Disponível sem internet · ${fileSize(info.bytes)}` : "Usar sem internet"}
    </button>
  );
}

type Step =
  | { s: "calc" }
  | { s: "ask"; plan: Plan }
  | { s: "down"; done: number; total: number }
  | { s: "on"; info: OfflineInfo }
  | { s: "error"; msg: string; plan?: Plan };

export default function OfflineSheet({ items, onClose, onToast }: {
  items: Item[];
  onClose: () => void;
  onToast: (t: string) => void;
}) {
  const [step, setStep] = useState<Step>(() => {
    const info = offlineInfo();
    return info ? { s: "on", info } : { s: "calc" };
  });
  const [confirmRemove, setConfirmRemove] = useState(false);

  const calc = () => {
    setStep({ s: "calc" });
    planDownload(items)
      .then((plan) => setStep({ s: "ask", plan }))
      .catch(() => setStep({ s: "error", msg: "Não consegui calcular o tamanho. Confira a internet." }));
  };

  useEffect(() => {
    if (step.s === "calc") calc();
    // só na abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const download = async (plan: Plan) => {
    setStep({ s: "down", done: 0, total: 1 });
    try {
      const missingPhotos = await downloadAll(plan, (done, total) => setStep({ s: "down", done, total }));
      window.dispatchEvent(new Event("offline-changed"));
      setStep({ s: "on", info: offlineInfo()! });
      onToast(missingPhotos ? "Pronto. Algumas fotos não baixaram" : "Pronto para usar sem internet");
    } catch (e) {
      setStep({ s: "error", msg: (e as Error).message, plan });
    }
  };

  const remove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    await removeOffline();
    window.dispatchEvent(new Event("offline-changed"));
    onToast("Removido do celular");
    onClose();
  };

  return (
    <>
      <Scrim onClose={onClose} z={80} />
      <div style={{ position: "relative", zIndex: 81 }}>
        <Sheet onClose={onClose} label="Usar sem internet">
          <div className="sheet-scroll offline-sheet">
            {!offlineSupported() ? (
              <>
                <h2 className="display">Usar sem internet</h2>
                <p className="offline-lead">Este navegador não permite guardar o app para usar sem internet.</p>
              </>
            ) : step.s === "on" ? (
              <>
                <h2 className="display">Disponível sem internet</h2>
                <p className="offline-lead">{savedLabel(step.info)}</p>
                <p className="hint">
                  Sem sinal, o roteiro, as fotos e os ingressos abrem normalmente. Para editar ou anexar, precisa de internet.
                </p>
                <div className="actions">
                  <button className="btn primary" onClick={calc}>Atualizar agora</button>
                  <button className="btn ghost" onClick={remove}>
                    {confirmRemove ? "Toque de novo para remover" : "Remover do celular"}
                  </button>
                </div>
              </>
            ) : step.s === "calc" ? (
              <>
                <h2 className="display">Usar sem internet</h2>
                <p className="offline-lead">Calculando o tamanho do download…</p>
              </>
            ) : step.s === "ask" ? (
              <>
                <h2 className="display">Usar sem internet</h2>
                <p className="offline-lead">
                  O download tem <b>{fileSize(step.plan.total)}</b> e fica guardado no celular.
                </p>
                <div className="group info-list offline-parts">
                  <div className="info-row">
                    <div><b>App e roteiro</b></div>
                    <span>{fileSize(sum(step.plan.app))}</span>
                  </div>
                  <div className="info-row">
                    <div><b>Fotos dos lugares</b><span>{count(step.plan.photos.length, "foto", "fotos")}</span></div>
                    <span>{fileSize(sum(step.plan.photos))}</span>
                  </div>
                  <div className="info-row">
                    <div><b>Ingressos</b><span>{count(step.plan.files.length, "arquivo", "arquivos")}</span></div>
                    <span>{step.plan.files.length ? fileSize(sum(step.plan.files)) : "—"}</span>
                  </div>
                </div>
                <p className="hint">Melhor baixar no Wi-Fi. Ingressos anexados depois são guardados sozinhos quando houver internet.</p>
                <div className="actions">
                  <button className="btn primary" onClick={() => download(step.plan)}>
                    Baixar {fileSize(step.plan.total)}
                  </button>
                  <button className="btn ghost" onClick={onClose}>Agora não</button>
                </div>
              </>
            ) : step.s === "down" ? (
              <>
                <h2 className="display">Baixando…</h2>
                <p className="offline-lead">{step.done} de {step.total} arquivos</p>
                <div className="offline-bar" role="progressbar" aria-valuemin={0} aria-valuemax={step.total} aria-valuenow={step.done}>
                  <div style={{ width: `${(step.done / step.total) * 100}%` }} />
                </div>
                <p className="hint">Deixe o app aberto até terminar.</p>
              </>
            ) : (
              <>
                <h2 className="display">Usar sem internet</h2>
                <p className="error">{step.msg}</p>
                <div className="actions">
                  <button className="btn primary" onClick={() => (step.plan ? download(step.plan) : calc())}>
                    Tentar de novo
                  </button>
                  <button className="btn ghost" onClick={onClose}>Fechar</button>
                </div>
              </>
            )}
          </div>
        </Sheet>
      </div>
    </>
  );
}
