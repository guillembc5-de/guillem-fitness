// Tipos de migrations.js (lo genera drizzle-kit; este archivo se mantiene a mano).
declare const migrations: {
  journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
  migrations: Record<string, string>;
};
export default migrations;
