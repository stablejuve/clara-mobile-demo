import type { Key } from "./copy";

// Documentos que el empleado acepta ANTES de verificar su identidad. El orden no es de gusto: Bridge exige que el usuario acepte
// sus términos antes de que pueda procesar sus datos de KYC (en producción, en una página alojada por Bridge que devuelve el
// comprobante de aceptación). En la demo son esquemas de muestra; el texto real lo pone cada proveedor.

export type LegalDoc = "claraTerms" | "claraCard" | "bridgeTerms" | "privacy";
export const LEGAL_DOCS: readonly LegalDoc[] = ["claraTerms", "claraCard", "bridgeTerms", "privacy"];

/** Quién publica cada documento (para «el texto completo lo entrega …»). */
export const LEGAL_PROVIDER: Record<LegalDoc, string> = { claraTerms: "Clara", claraCard: "Clara", bridgeTerms: "Bridge", privacy: "Clara · Bridge" };
/** En producción la aceptación de este documento ocurre en una página del propio proveedor. */
export const LEGAL_HOSTED: Record<LegalDoc, boolean> = { claraTerms: false, claraCard: false, bridgeTerms: true, privacy: false };

export const legalTitle = (d: LegalDoc): Key => `legal.${d}`;
export const legalBy = (d: LegalDoc): Key => `legal.${d}.by`;
export const legalPoints = (d: LegalDoc): readonly Key[] => [`legal.${d}.1`, `legal.${d}.2`, `legal.${d}.3`];
export const isLegalDoc = (v: string): v is LegalDoc => (LEGAL_DOCS as readonly string[]).includes(v);
