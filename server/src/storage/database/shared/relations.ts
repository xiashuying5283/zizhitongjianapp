import { relations } from "drizzle-orm/relations";
import { zizhitongjianVolumes, zizhitongjianParagraphs, users, readingProgress, zhtjVolumes, zhtjYearEntries, zhtjParagraphs, dynasties, emperors, volumes, yearEntries, huNotes } from "./schema";

export const zizhitongjianParagraphsRelations = relations(zizhitongjianParagraphs, ({one}) => ({
	zizhitongjianVolume: one(zizhitongjianVolumes, {
		fields: [zizhitongjianParagraphs.volumeId],
		references: [zizhitongjianVolumes.id]
	}),
}));

export const zizhitongjianVolumesRelations = relations(zizhitongjianVolumes, ({many}) => ({
	zizhitongjianParagraphs: many(zizhitongjianParagraphs),
}));

export const readingProgressRelations = relations(readingProgress, ({one}) => ({
	user: one(users, {
		fields: [readingProgress.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	readingProgresses: many(readingProgress),
}));

export const zhtjYearEntriesRelations = relations(zhtjYearEntries, ({one, many}) => ({
	zhtjVolume: one(zhtjVolumes, {
		fields: [zhtjYearEntries.volumeId],
		references: [zhtjVolumes.id]
	}),
	zhtjParagraphs: many(zhtjParagraphs),
}));

export const zhtjVolumesRelations = relations(zhtjVolumes, ({many}) => ({
	zhtjYearEntries: many(zhtjYearEntries),
}));

export const zhtjParagraphsRelations = relations(zhtjParagraphs, ({one}) => ({
	zhtjYearEntry: one(zhtjYearEntries, {
		fields: [zhtjParagraphs.yearEntryId],
		references: [zhtjYearEntries.id]
	}),
}));

export const emperorsRelations = relations(emperors, ({one, many}) => ({
	dynasty: one(dynasties, {
		fields: [emperors.dynastyId],
		references: [dynasties.id]
	}),
	yearEntries: many(yearEntries),
}));

export const dynastiesRelations = relations(dynasties, ({many}) => ({
	emperors: many(emperors),
	volumes: many(volumes),
}));

export const volumesRelations = relations(volumes, ({one, many}) => ({
	dynasty: one(dynasties, {
		fields: [volumes.dynastyId],
		references: [dynasties.id]
	}),
	yearEntries: many(yearEntries),
}));

export const yearEntriesRelations = relations(yearEntries, ({one, many}) => ({
	volume: one(volumes, {
		fields: [yearEntries.volumeId],
		references: [volumes.id]
	}),
	emperor: one(emperors, {
		fields: [yearEntries.emperorId],
		references: [emperors.id]
	}),
	huNotes: many(huNotes),
}));

export const huNotesRelations = relations(huNotes, ({one}) => ({
	yearEntry: one(yearEntries, {
		fields: [huNotes.yearEntryId],
		references: [yearEntries.id]
	}),
}));