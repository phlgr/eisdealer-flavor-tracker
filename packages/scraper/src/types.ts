import { type } from "arktype";

export const FlavorTag = type(
	"'vegan' | 'contains_nuts' | 'contains_dairy' | 'sugar_free' | 'sorbet' | 'seasonal' | 'new'",
);

export const IceCreamFlavor = type({
	name: "string",
	"nameEnglish?": "string",
	tags: FlavorTag.array(),
	available: "boolean",
});

export const StoryAnalysis = type({
	flavors: IceCreamFlavor.array(),
	"rawText?": "string",
	confidence: "'high' | 'medium' | 'low'",
	isFlavorList: "boolean",
	"location?": "'main' | 'buga'",
});

export const LocationData = type({
	location: "'main' | 'buga'",
	lastUpdated: "string",
	flavors: IceCreamFlavor.array(),
});

export const HistoryEntry = type({
	date: "string",
	"main?": IceCreamFlavor.array(),
	"buga?": IceCreamFlavor.array(),
});

export type FlavorTag = typeof FlavorTag.infer;
export type IceCreamFlavor = typeof IceCreamFlavor.infer;
export type StoryAnalysis = typeof StoryAnalysis.infer;
export type LocationData = typeof LocationData.infer;
export type HistoryEntry = typeof HistoryEntry.infer;

export interface ScrapedImage {
	buffer: Buffer;
	hash: string;
}