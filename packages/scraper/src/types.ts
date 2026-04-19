import { type } from "arktype";

export const FlavorTag = type("'vegan' | 'milk'");

export const IceCreamFlavor = type({
	name: "string",
	"nameEnglish?": "string",
	tags: FlavorTag.array(),
});

export const StoryAnalysis = type({
	flavors: IceCreamFlavor.array(),
	"rawText?": "string",
	confidence: "'high' | 'medium' | 'low'",
	isFlavorList: "boolean",
	"location?": "'main' | 'buga'",
	"openUntil?": "string",
});

export const LocationState = type({
	flavors: IceCreamFlavor.array(),
	lastUpdated: "string",
	"openUntil?": "string",
});

export const CurrentData = type({
	"main?": LocationState,
	"buga?": LocationState,
});

const HistoryLocationEntry = type({
	flavors: IceCreamFlavor.array(),
	"openUntil?": "string",
});

export const HistoryEntry = type({
	timestamp: "string",
	"main?": HistoryLocationEntry,
	"buga?": HistoryLocationEntry,
});

export const geminiResponseSchema = StoryAnalysis.toJsonSchema();

export type FlavorTag = typeof FlavorTag.infer;
export type IceCreamFlavor = typeof IceCreamFlavor.infer;
export type StoryAnalysis = typeof StoryAnalysis.infer;
export type LocationState = typeof LocationState.infer;
export type CurrentData = typeof CurrentData.infer;
export type HistoryEntry = typeof HistoryEntry.infer;

export interface ScrapedImage {
	buffer: Buffer;
	hash: string;
}
