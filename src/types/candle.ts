export interface Candle {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface KeyLevel {
  price: number;
  time: number; // unix seconds
  strength: number;
}
