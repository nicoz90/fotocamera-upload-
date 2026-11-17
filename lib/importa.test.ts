import { describe, expect, it } from "vitest";
import { interpretaRighe } from "./importa";

describe("import", () => {
  it("riconosce intestazioni e valori italiani", () => {
    const r = interpretaRighe([
      ["Misura", "Marca", "Modello", "Stagione", "Q.tà", "Posizione", "DOT", "Prezzo vendita", "Costo", "Runflat"],
      ["205/55 R16", "michelin", "Primacy 4", "E", "4", "A-3-2", "2419", "89,90", "60", "sì"],
      ["2255017", "Pirelli", "", "invernale", "2", "B 1 1", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", ""],
      ["999", "", "", "boh", "-1", "A-3-2-9-9", "9999", "x", "", ""],
    ]);
    expect(r.mancanti).toEqual([]);
    expect(r.righe).toHaveLength(3);
    expect(r.righe[0].dati).toMatchObject({ larghezza: 205, serie: 55, diametro: 16, stagione: "estiva", quantita: 4,
      scaffale: "A", ripiano: "3", posto: "2", dot_anno: 2019, prezzo_vendita: 89.9, runflat: true });
    expect(r.righe[0].prezzo_acquisto).toBe(60);
    expect(r.righe[1].dati?.stagione).toBe("invernale");
    expect(r.righe[2].riga).toBe(5);
    expect(r.righe[2].dati).toBeUndefined();
    expect(r.righe[2].errori.length).toBeGreaterThanOrEqual(6);
  });
  it("segnala colonne obbligatorie mancanti", () => {
    expect(interpretaRighe([["Foo", "Bar"]]).mancanti).toEqual(["Misura", "Marca", "Quantità"]);
  });
});
