const ALIASES: Record<string, string> = {
	haselnusscrunch: "Haselnuss Crunch",
	// Standalone berry names: canonical form is the full German noun ("Erdbeere"),
	// while compound flavors keep the joining stem ("Erdbeer Tiramisu").
	erdbeer: "Erdbeere",
	himbeer: "Himbeere",
	brombeer: "Brombeere",
	"erdbeere tiramisu": "Erdbeer Tiramisu",
	// Spelling fix.
	straciatella: "Stracciatella",
};

/** Normalize separators so "Buttermilch-Mango" / "Buttermilch Mango" merge. */
export function normalizeName(name: string): string {
	const normalized = name
		.replace(/\s*-\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
	return ALIASES[normalized.toLowerCase()] ?? normalized;
}
