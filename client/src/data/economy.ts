// Économie : des données, pas du code. Prix d'achat et de vente en pièces, stock de la boutique.
// Option A validée par Anthony (22/09) : petits chiffres lisibles, tout recalibrable ici.

export const START_MONEY = 50;

export interface PriceDef { buy?: number; sell?: number }

export const PRICES: Record<string, PriceDef> = {
  graine_navet: { buy: 5 },
  graine_ble: { buy: 8 },
  navet: { sell: 10 },
  ble: { sell: 25 },
  sardine: { sell: 15 },
  lit: { buy: 300 },
};

/** Ce que le marchand propose, dans l'ordre d'affichage. */
export const SHOP_STOCK = ['graine_navet', 'graine_ble', 'lit'];

export function sellPrice(itemId: string): number | null {
  return PRICES[itemId]?.sell ?? null;
}

export function buyPrice(itemId: string): number | null {
  return PRICES[itemId]?.buy ?? null;
}
