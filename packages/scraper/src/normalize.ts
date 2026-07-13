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
	// Same mystery flavor read with the "???" placeholder prefix still attached.
	"??? (wm geheimsorte)": "WM Geheimsorte",
	// Coffee-caramel read with varying case/accents/spelling ("Café", "caramell").
	"caffé caramel": "Caffé Caramel",
	"caffé caramell": "Caffé Caramel",
	"café caramel": "Caffé Caramel",
	// Lemon-yogurt read in English; canonicalize to the German name.
	"joghurt lemon": "Joghurt Zitrone",
	// Word-order variant of the strawberry-yogurt-chocolate flavor.
	"joghurt erdbeer schoko": "Erdbeer Joghurt Schoko",
	// Plural-stem variant of the yogurt-blackberry flavor ("Brombeere" vs "Brombeer").
	"joghurt brombeere": "Joghurt Brombeer",
	// Lemon-cheesecake read in German; canonicalize to the English name shared by
	// the other "… Cheesecake" flavors.
	"zitronen cheesecake": "Lemon Cheesecake",
	// Separator variant of the orange-cake flavor ("Orangen Kuchen" vs single word),
	// matching the single-word "Zitronenkuchen".
	"orangen kuchen": "Orangenkuchen",
	// Peanut-butter flavor read three ways across re-scrapes of the same board.
	"crunchy peanut": "Crunchy Peanutbutter",
	peanutbutter: "Crunchy Peanutbutter",
	// Mystery flavor OCR'd as "??? (WM Geheimorte)" — a typo of "Geheimsorte" with
	// the "???" placeholder prefix still attached.
	"??? (wm geheimorte)": "WM Geheimsorte",
	// Alcohol marker "(alc)" is not part of the name (mirrors "(vegan)"/"(Nuss)").
	"aperol spritz (alc)": "Aperol Spritz",
	// Spelling variant of the mango-lime-chili flavor ("Chilli" vs "Chili").
	"mango limette chilli": "Mango Limette Chili",
	// German rendering of the coffee-caramel flavor, joining the "caffé/caffè/café
	// caramel" variants above. (A bare "???" placeholder is deliberately NOT aliased:
	// it's only WM Geheimsorte in context, not always.)
	"kaffee karamel": "Caffé Caramel",
	// OCR misread "Kokos" as "Tobias" on the 2026-07-12 board (the same scrape
	// also read the flavor correctly; buildLocationUpdate dedupes by key).
	"tobias mango sticky rice": "Kokos Mango Sticky Rice",
};

/** Normalize separators so "Buttermilch-Mango" / "Buttermilch Mango" merge. */
export function normalizeName(name: string): string {
	const normalized = name
		.replace(/\s*-\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
	return ALIASES[normalized.toLowerCase()] ?? normalized;
}
