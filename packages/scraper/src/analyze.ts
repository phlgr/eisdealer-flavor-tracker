import { GoogleGenAI } from "@google/genai";
import { type } from "arktype";
import type { StoryAnalysis as StoryAnalysisType } from "./types.js";
import { geminiResponseSchema, StoryAnalysis } from "./types.js";

const GEMINI_MODELS = [
	"gemini-3.1-flash-lite-preview",
	"gemini-2.5-flash",
	"gemini-2.0-flash",
] as const;
const PROMPT = `You are analyzing an Instagram Story image from a German ice cream shop (Eisdiele).
Your task:
1. Determine if this image shows a list/menu of today's ice cream flavors. It must match one of these two formats:
   - MAIN location: A sign/board listing multiple ice cream flavors (commonly with headings like "Frisch aus unserer Manufaktur:", "Lecker!", or similar). The key indicator is a structured list of flavor names on a sign or board.
   - BUGA location: A black chalkboard standing on the ground (freestanding/easel-style) listing flavors.
   If the image does NOT match either format, set isFlavorList to false and return empty flavors.
   Specifically, set isFlavorList to false for: Instagram polls, promotional posts, events, selfies, vote/question stickers, or any other content that is not a flavor menu in one of the two formats above.
2. If it IS a flavor list, extract every flavor name visible.
3. For each flavor, provide:
   - name: The clean flavor name WITHOUT any markers like "(V)", "(v)", "(vegan)" etc. Strip those and use the tag instead. Use title case (e.g., "Schokomousse" not "SCHOKOMOUSSE").
   - nameEnglish: English translation (if you can determine it)
   - tags: ONLY add tags that are visually indicated in the image. Do NOT guess or infer tags.
     - "vegan": ONLY if the flavor has a visible "(V)", "(v)", leaf symbol, or "vegan" marker next to it
     - "milk": ONLY if the flavor has a visible cow symbol, milk icon, or similar dairy marker next to it
     - If no marker is visible next to the flavor, leave tags empty.
4. Set confidence to "high" if the text is clear, "medium" if partially obscured, "low" if very hard to read.
5. Determine the location based on which format matched:
   - If the image shows a freestanding black chalkboard, or mentions "Bunter Garten", "BuGa", or similar → set location to "buga"
   - If the image shows the "Frisch aus unserer Manufaktur:" sign → set location to "main"
   - If unsure, default to "main"
6. If the image mentions opening hours or closing time (e.g., "bis 20 Uhr", "bis 21:00", "wir sind bis X Uhr da"), extract it as openUntil in HH:MM format (e.g., "20:00"). Only set this if a time is clearly visible.

IMPORTANT:
- Do NOT include vegan/dietary markers like "(V)" or "(v)" in the flavor name. Use the tags array instead.
- Do NOT infer or guess tags. Only add "vegan" or "milk" if there is a visible symbol/marker in the image.
- Instagram polls (e.g., "Which flavor should we bring back?") are NOT flavor lists. Always set isFlavorList to false for polls.`;

async function tryModel(
	ai: GoogleGenAI,
	model: string,
	base64Image: string,
): Promise<StoryAnalysisType | null> {
	const response = await Promise.race([
		ai.models.generateContent({
			model,
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
				responseSchema: geminiResponseSchema,
			},
		}),
		new Promise<never>((_, reject) =>
			setTimeout(
				() =>
					reject(new Error(`Gemini request timed out after 30s (${model})`)),
				30000,
			),
		),
	]);
	const text = response.text;
	if (!text) {
		console.error(`[analyze] Empty response from ${model}`);
		return null;
	}
	console.log(`[analyze] Raw response (${model}):`, text);
	const parsed = JSON.parse(text);
	const result = StoryAnalysis(parsed);
	if (result instanceof type.errors) {
		console.error(`[analyze] Validation failed (${model}):`, result.summary);
		return null;
	}
	return result;
}

export async function analyzeStoryImage(
	imageBuffer: Buffer,
): Promise<StoryAnalysisType | null> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error("GEMINI_API_KEY environment variable is required");
	}
	const ai = new GoogleGenAI({ apiKey });
	const base64Image = imageBuffer.toString("base64");

	for (const model of GEMINI_MODELS) {
		try {
			return await tryModel(ai, model, base64Image);
		} catch (err) {
			console.warn(
				`[analyze] ${model} failed: ${err instanceof Error ? err.message : err}`,
			);
		}
	}

	console.error(`[analyze] All models failed: ${GEMINI_MODELS.join(", ")}`);
	throw new Error("All Gemini models failed");
}
