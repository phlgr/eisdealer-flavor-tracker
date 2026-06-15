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
	// Recurring mystery flavor read with varying case; the "(Nuss)" suffix is
	// stripped into a "nuss" tag in buildLocationUpdate, so it never reaches here.
	"wm geheimsorte": "WM Geheimsorte",
	// Coffee-caramel read with varying case/accents/spelling ("Café", "caramell").
	"caffé caramel": "Caffé Caramel",
	"caffé caramell": "Caffé Caramel",
	"café caramel": "Caffé Caramel",
	// Lemon-yogurt read in English; canonicalize to the German name.
	"joghurt lemon": "Joghurt Zitrone",
	// Word-order variant of the strawberry-yogurt-chocolate flavor.
	"joghurt erdbeer schoko": "Erdbeer Joghurt Schoko",
};

/** Normalize separators so "Buttermilch-Mango" / "Buttermilch Mango" merge. */
export function normalizeName(name: string): string {
	const normalized = name
		.replace(/\s*-\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
	return ALIASES[normalized.toLowerCase()] ?? normalized;
}
