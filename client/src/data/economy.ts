// Économie : des données, pas du code. Prix d'achat et de vente en pièces, stock de la boutique.
// Option A validée par Anthony (22/09) : petits chiffres lisibles, tout recalibrable ici.

export const START_MONEY = 50;

export interface PriceDef { buy?: number; sell?: number }

export const PRICES: Record<string, PriceDef> = {
  graine_navet: { buy: 5 },
  graine_ble: { buy: 8 },
  graine_carotte: { buy: 6 },
  navet: { sell: 10 },
  carotte: { sell: 15 },
  truite: { sell: 25 },
  carpe: { sell: 40 },
  ble: { sell: 25 },
  sardine: { sell: 15 },
  lit: { buy: 300 },
};

/** Ce que le marchand propose, dans l'ordre d'affichage. */
export const SHOP_STOCK = ['graine_navet', 'graine_carotte', 'graine_ble', 'lit'];

export function sellPrice(itemId: string): number | null {
  return PRICES[itemId]?.sell ?? null;
}

export function buyPrice(itemId: string): number | null {
  return PRICES[itemId]?.buy ?? null;
}
