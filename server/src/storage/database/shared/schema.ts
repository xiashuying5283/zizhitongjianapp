import { pgTable, serial, bigSerial, timestamp, foreignKey, integer, smallint, numeric, text, varchar, unique, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const zizhitongjianParagraphs = pgTable("zizhitongjian_paragraphs", {
	id: serial().primaryKey().notNull(),
	volumeId: integer("volume_id").notNull(),
	paragraphIndex: integer("paragraph_index").notNull(),
	original: text().notNull(),
	annotation: text().notNull(),
	translation: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	contentWithNotes: text("content_with_notes"),
	yearMark: varchar("year_mark", { length: 20 }),
	bcYear: integer("bc_year"),
}, (table) => [
	foreignKey({
			columns: [table.volumeId],
			foreignColumns: [zizhitongjianVolumes.id],
			name: "zizhitongjian_paragraphs_volume_id_zizhitongjian_volumes_id_fk"
		}),
]);

export const zizhitongjianVolumes = pgTable("zizhitongjian_volumes", {
	id: serial().primaryKey().notNull(),
	volumeNumber: integer("volume_number").notNull(),
	eraName: text("era_name").notNull(),
	dynasty: text().notNull(),
	volumeName: text("volume_name").notNull(),
	summary: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	timeRange: text("time_range"),
	yearStart: integer("year_start"),
	yearEnd: integer("year_end"),
}, (table) => [
	unique("zizhitongjian_volumes_volume_number_unique").on(table.volumeNumber),
]);

export const readingProgress = pgTable("reading_progress", {
	id: serial().primaryKey().notNull(),
	deviceId: varchar("device_id", { length: 100 }),
	volumeNumber: integer("volume_number").notNull(),
	progress: integer().default(0),
	lastParagraphIndex: integer("last_paragraph_index").default(0),
	lastReadAt: timestamp("last_read_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	userId: integer("user_id"),
}, (table) => [
	index("idx_reading_progress_device").using("btree", table.deviceId.asc().nullsLast().op("text_ops")),
	index("idx_reading_progress_last_read").using("btree", table.lastReadAt.desc().nullsFirst().op("timestamptz_ops")),
	uniqueIndex("idx_reading_progress_unique").using("btree", sql`COALESCE(user_id, '-1'::integer)`, sql`COALESCE(device_id, ''::character varying)`, sql`volume_number`),
	index("idx_reading_progress_user").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("idx_reading_progress_user_volume").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.volumeNumber.asc().nullsLast().op("int4_ops")).where(sql`(user_id IS NOT NULL)`),
	uniqueIndex("idx_reading_progress_user_volume_unique").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.volumeNumber.asc().nullsLast().op("int4_ops")).where(sql`(user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reading_progress_user_id_fkey"
		}),
]);

export const userReadProgress = pgTable("user_read_progress", {
	id: bigSerial("id", { mode: "number" }).primaryKey(),
	userId: integer("user_id").notNull(),
	volumeId: integer("volume_id").notNull(),
	yearId: integer("year_id").notNull().default(0),
	itemId: integer("item_id").notNull().default(0),
	paraId: integer("para_id").notNull().default(0),
	charIndex: integer("char_index").notNull().default(0),
	contentType: smallint("content_type").notNull().default(0),
	updateTime: timestamp("update_time", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
	readPercent: numeric("read_percent", { precision: 5, scale: 2 }).notNull().default("0.00"),
}, (table) => [
	unique("uk_urp_user_volume").on(table.userId, table.volumeId),
	index("idx_urp_update_time").using("btree", table.updateTime),
	index("idx_urp_para").using("btree", table.paraId),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [users.id],
		name: "fk_urp_user",
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.volumeId],
		foreignColumns: [zizhitongjianVolumes.id],
		name: "fk_urp_volume",
	}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 50 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	nickname: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_username_key").on(table.username),
]);

export const zhtjVolumes = pgTable("zhtj_volumes", {
	id: serial().primaryKey().notNull(),
	volumeNumber: integer("volume_number").notNull(),
	volumeName: text("volume_name").notNull(),
	dynasty: text(),
	startYear: integer("start_year"),
	endYear: integer("end_year"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("zhtj_volumes_volume_number_key").on(table.volumeNumber),
]);

export const zhtjYearEntries = pgTable("zhtj_year_entries", {
	id: serial().primaryKey().notNull(),
	volumeId: integer("volume_id"),
	emperor: text().notNull(),
	yearName: text("year_name").notNull(),
	ganzhi: text(),
	bcYear: integer("bc_year").notNull(),
	yearDisplay: text("year_display").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_year_entries_bc_year").using("btree", table.bcYear.asc().nullsLast().op("int4_ops")),
	index("idx_year_entries_volume").using("btree", table.volumeId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.volumeId],
			foreignColumns: [zhtjVolumes.id],
			name: "zhtj_year_entries_volume_id_fkey"
		}).onDelete("cascade"),
]);

export const zhtjParagraphs = pgTable("zhtj_paragraphs", {
	id: serial().primaryKey().notNull(),
	yearEntryId: integer("year_entry_id"),
	paragraphIndex: integer("paragraph_index").notNull(),
	originalText: text("original_text").notNull(),
	huNotes: jsonb("hu_notes").default([]),
	translation: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_paragraphs_year").using("btree", table.yearEntryId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.yearEntryId],
			foreignColumns: [zhtjYearEntries.id],
			name: "zhtj_paragraphs_year_entry_id_fkey"
		}).onDelete("cascade"),
]);

export const dynasties = pgTable("dynasties", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	displayName: varchar("display_name", { length: 100 }),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("dynasties_name_key").on(table.name),
]);

export const emperors = pgTable("emperors", {
	id: serial().primaryKey().notNull(),
	dynastyId: integer("dynasty_id"),
	name: varchar({ length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 100 }),
	reignStart: integer("reign_start"),
	reignEnd: integer("reign_end"),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.dynastyId],
			foreignColumns: [dynasties.id],
			name: "emperors_dynasty_id_fkey"
		}),
	unique("emperors_dynasty_id_name_key").on(table.dynastyId, table.name),
]);

export const volumes = pgTable("volumes", {
	id: serial().primaryKey().notNull(),
	volumeNumber: integer("volume_number").notNull(),
	volumeName: varchar("volume_name", { length: 100 }).notNull(),
	dynastyId: integer("dynasty_id"),
	yearCount: integer("year_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.dynastyId],
			foreignColumns: [dynasties.id],
			name: "volumes_dynasty_id_fkey"
		}),
	unique("volumes_volume_number_key").on(table.volumeNumber),
]);

export const yearEntries = pgTable("year_entries", {
	id: serial().primaryKey().notNull(),
	volumeId: integer("volume_id"),
	emperorId: integer("emperor_id"),
	yearName: varchar("year_name", { length: 50 }),
	bcYear: integer("bc_year").notNull(),
	yearDisplay: varchar("year_display", { length: 50 }),
	ganzhi: varchar({ length: 10 }),
	originalText: text("original_text"),
	translation: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_year_entries_emperor_id").using("btree", table.emperorId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.volumeId],
			foreignColumns: [volumes.id],
			name: "year_entries_volume_id_fkey"
		}),
	foreignKey({
			columns: [table.emperorId],
			foreignColumns: [emperors.id],
			name: "year_entries_emperor_id_fkey"
		}),
	unique("year_entries_volume_id_bc_year_key").on(table.volumeId, table.bcYear),
]);

export const huNotes = pgTable("hu_notes", {
	id: serial().primaryKey().notNull(),
	yearEntryId: integer("year_entry_id"),
	content: text().notNull(),
	noteOrder: integer("note_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_hu_notes_year_entry_id").using("btree", table.yearEntryId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.yearEntryId],
			foreignColumns: [yearEntries.id],
			name: "hu_notes_year_entry_id_fkey"
		}).onDelete("cascade"),
]);
