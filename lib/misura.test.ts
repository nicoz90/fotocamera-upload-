import { describe, expect, it } from "vitest";
import { analizzaRicerca, parseDot, parseMisura, parsePosizione, sizeKey, normalizzaTarga } from "./misura";

describe("ricerca misura", () => {
  it("tre scritture diverse danno la stessa chiave", () => {
    for (const s of ["205/55 R16", "2055516", "205 55 16", "205/55R16", "205/55 ZR16 XL"]) {
      expect(analizzaRicerca(s).cifre).toBe("2055516");
    }
  });
  it("separa marca dalle cifre", () => {
    expect(analizzaRicerca("205 55 michelin")).toEqual({ cifre: "20555", parole: ["michelin"] });
    expect(analizzaRicerca("205/55 R16").parole).toEqual([]);
  });
});

describe("parseMisura", () => {
  it("formati comuni", () => {
    expect(parseMisura("205/55 R16")).toEqual({ larghezza: 205, serie: 55, diametro: 16 });
    expect(parseMisura("2055516")).toEqual({ larghezza: 205, serie: 55, diametro: 16 });
    expect(parseMisura("205 55 16")).toEqual({ larghezza: 205, serie: 55, diametro: 16 });
    expect(parseMisura("225/45ZR17")).toEqual({ larghezza: 225, serie: 45, diametro: 17 });
    expect(parseMisura("215/75 R17,5")).toEqual({ larghezza: 215, serie: 75, diametro: 17.5 });
    expect(parseMisura("195/70 R15C")).toEqual({ larghezza: 195, serie: 70, diametro: 15 });
  });
  it("scarta misure impossibili", () => {
    expect(parseMisura("999/99 R99")).toBeNull();
    expect(parseMisura("ciao")).toBeNull();
  });
  it("sizeKey coincide con il DB", () => {
    expect(sizeKey({ larghezza: 215, serie: 75, diametro: 17.5 })).toBe("21575175");
  });
});

describe("DOT, posizione, targa", () => {
  it("DOT", () => {
    expect(parseDot("2419")).toEqual({ settimana: 24, anno: 2019 });
    expect(parseDot("24/19")).toEqual({ settimana: 24, anno: 2019 });
    expect(parseDot("5719")).toBeNull();
  });
  it("posizione", () => {
    expect(parsePosizione("a-3-2")).toEqual({ scaffale: "A", ripiano: "3", posto: "2" });
    expect(parsePosizione("A 3 2")).toEqual({ scaffale: "A", ripiano: "3", posto: "2" });
    expect(parsePosizione("A32")).toEqual({ scaffale: "A", ripiano: "3", posto: "2" });
    expect(parsePosizione("")).toEqual({ scaffale: null, ripiano: null, posto: null });
  });
  it("targa", () => {
    expect(normalizzaTarga("ab 123-cd")).toBe("AB123CD");
  });
});
