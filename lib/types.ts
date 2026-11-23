export type Status = "reservado" | "planejado" | "sugestao";
export type Period = "" | "manha" | "tarde" | "noite";
export type Category =
  | "passeio"
  | "hotel"
  | "comida"
  | "vinho"
  | "doce"
  | "transporte"
  | "livre";

export interface LinkItem {
  label: string;
  url: string;
}

export interface Item {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM ou ""
  period: Period;
  title: string;
  subtitle: string;
  status: Status;
  category: Category;
  place: string; // texto usado no Google Maps / Waze
  description: string;
  image_url: string;
  gallery: string[];
  links: LinkItem[];
  rating: string;
  reviews: string;
  notes: string;
  sort: number;
}

export type ItemInput = Omit<Item, "id">;

export const TRIP = {
  title: "Gramado & Canela",
  couple: "Danilo & Rayza",
  start: "2026-12-05",
  end: "2026-12-10",
};

export const STATUS_LABEL: Record<Status, string> = {
  reservado: "Reservado",
  planejado: "No roteiro",
  sugestao: "Sugestão",
};

export const PERIOD_LABEL: Record<Period, string> = {
  "": "",
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  passeio: "Passeio",
  hotel: "Hospedagem",
  comida: "Comida",
  vinho: "Vinícola",
  doce: "Chocolate",
  transporte: "Deslocamento",
  livre: "Tempo livre",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  passeio: "🌲",
  hotel: "🏡",
  comida: "🫕",
  vinho: "🍷",
  doce: "🍫",
  transporte: "🚗",
  livre: "☁️",
};
