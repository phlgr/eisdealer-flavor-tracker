const ALIASES: Record<string, string> = {
	haselnusscrunch: "Haselnuss Crunch",
};

/** Normalize separators so "Buttermilch-Mango" / "Buttermilch Mango" merge. */
export function normalizeName(name: string): string {
	const normalized = name
		.replace(/\s*-\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
	return ALIASES[normalized.toLowerCase()] ?? normalized;
}
