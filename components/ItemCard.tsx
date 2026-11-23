"use client";

import { useState } from "react";
import type { Item } from "@/lib/types";
import { CATEGORY_EMOJI, STATUS_LABEL } from "@/lib/types";
import { StarIcon } from "./Icons";

export function SafeImg({ src, alt, eager }: { src: string; alt: string; eager?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

export function StatusBadge({ status }: { status: Item["status"] }) {
  return (
    <span className={`badge ${status}`}>
      {status === "reservado" ? "✓ " : status === "sugestao" ? "✦ " : ""}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Rating({ item }: { item: Item }) {
  if (!item.rating) return null;
  return (
    <span className="rating">
      <StarIcon /> {item.rating.replace(",", "")}
      {item.reviews && <small>({Number(item.reviews).toLocaleString("pt-BR")})</small>}
    </span>
  );
}

export default function ItemCard({ item, onOpen }: { item: Item; onOpen: () => void }) {
  if (!item.image_url) {
    return (
      <button className={`card compact ${item.status}`} onClick={onOpen} data-heart>
        <span className="emoji-tile" aria-hidden>
          {CATEGORY_EMOJI[item.category]}
        </span>
        <span className="card-body">
          <span className="card-title" style={{ display: "block" }}>{item.title}</span>
          {item.subtitle && <span className="card-sub" style={{ display: "block" }}>{item.subtitle}</span>}
        </span>
        <StatusBadge status={item.status} />
      </button>
    );
  }
  return (
    <button className={`card ${item.status}`} onClick={onOpen} data-heart>
      <span className="card-img" style={{ display: "block" }}>
        <SafeImg src={item.image_url} alt="" />
        <StatusBadge status={item.status} />
      </span>
      <span className="card-body" style={{ display: "block" }}>
        <span className="card-title" style={{ display: "block" }}>{item.title}</span>
        <span className="card-row">
          <span className="card-sub">{item.subtitle}</span>
          <Rating item={item} />
        </span>
      </span>
    </button>
  );
}
