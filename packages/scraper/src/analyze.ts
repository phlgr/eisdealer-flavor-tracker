import { GoogleGenAI } from "@google/genai";
import { type } from "arktype";
import { StoryAnalysis } from "./types.js";
import type { StoryAnalysis as StoryAnalysisType } from "./types.js";

const GEMINI_MODEL = "gemini-3-flash-preview";

const PROMPT = `You are analyzing an Instagram Story image from a German ice cream shop (Eisdiele).

Your task:
1. Determine if this image shows a list/menu of ice cream flavors. If it does NOT (e.g., it's a promo, event, selfie, or unrelated), set isFlavorList to false and return empty flavors.
2. If it IS a flavor list, extract every flavor name visible.
3. For each flavor, provide:
   - name: The clean flavor name WITHOUT any markers like "(V)", "(v)", "(vegan)" etc. Strip those and use the tag instead. Use title case (e.g., "Schokomousse" not "SCHOKOMOUSSE").
   - nameEnglish: English translation (if you can determine it)
   - tags: Array of applicable tags from: "vegan", "contains_nuts", "contains_dairy", "sugar_free", "sorbet", "seasonal", "new". If the flavor has a "(V)" or "(v)" marker, add the "vegan" tag.
   - available: true (assume available unless clearly marked otherwise)
4. Set confidence to "high" if the text is clear, "medium" if partially obscured, "low" if very hard to read.
5. Determine the location:
   - If the image mentions "Bunter Garten", "BuGa", or similar → set location to "buga"
   - Otherwise assume it's the main location → set location to "main"
   - Generic text like "Wir sind für euch da" or opening hours WITHOUT mentioning BuGa = main location

IMPORTANT: Do NOT include vegan/dietary markers like "(V)" or "(v)" in the flavor name. Use the tags array instead.

Use your knowledge of common German ice cream flavors to infer tags:
- Fruit sorbets (Zitrone, Mango, Himbeere, etc.) are typically vegan and sorbet
- Nut flavors (Pistazie, Haselnuss, Walnuss) contain nuts and dairy
- Most traditional flavors (Vanille, Schokolade, Stracciatella) contain dairy
- Look for markers like "V" or "vegan" next to flavors`;

const JSON_SCHEMA = {
	type: "object" as const,
	properties: {
		flavors: {
			type: "array" as const,
			items: {
				type: "object" as const,
				properties: {
					name: { type: "string" as const },
					nameEnglish: { type: "string" as const },
					tags: {
						type: "array" as const,
						items: {
							type: "string" as const,
							enum: [
								"vegan",
								"contains_nuts",
								"contains_dairy",
								"sugar_free",
								"sorbet",
								"seasonal",
								"new",
							],
						},
					},
					available: { type: "boolean" as const },
				},
				required: ["name", "tags", "available"],
			},
		},
		rawText: { type: "string" as const },
		confidence: {
			type: "string" as const,
			enum: ["high", "medium", "low"],
		},
		isFlavorList: { type: "boolean" as const },
		location: {
			type: "string" as const,
			enum: ["main", "buga"],
		},
	},
	required: ["flavors", "confidence", "isFlavorList"],
};

export async function analyzeStoryImage(
	imageBuffer: Buffer,
): Promise<StoryAnalysisType | null> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY environment variable is required");
	}

	const ai = new GoogleGenAI({ apiKey });

	const base64Image = imageBuffer.toString("base64");

	try {
		const response = await ai.models.generateContent({
			model: GEMINI_MODEL,
			contents: [
				{
					role: "user",
					parts: [
						{
							inlineData: {
								mimeType: "image/jpeg",
								data: base64Image,
							},
						},
						{ text: PROMPT },
					],
				},
			],
			config: {
				responseMimeType: "application/json",
				responseSchema: JSON_SCHEMA,
			},
		});

		const text = response.text;
		if (!text) {
			console.error("[analyze] Empty response from Gemini");
			return null;
		}

		const parsed = JSON.parse(text);

		// Validate with ArkType
		const result = StoryAnalysis(parsed);
		if (result instanceof type.errors) {
			console.error("[analyze] Validation failed:", result.summary);
			return null;
		}

		return result;
	} catch (err) {
		console.error(
			"[analyze] Gemini API error:",
			err instanceof Error ? err.message : err,
		);
		return null;
	}
}
