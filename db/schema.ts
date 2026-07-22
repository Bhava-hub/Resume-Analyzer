import { pgTable, uuid, text, timestamp, jsonb, customType } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
    dataType() { return "tsvector"; }
});


export const sessions = pgTable("sessions", {
    sessionId: uuid("session_id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const resumes = pgTable("resumes", {
    resumeId: uuid("resume_id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => sessions.sessionId),
    filename: text("filename"),
    rawText: text("raw_text"),
    // SHA-256 hash of the resume text — used to detect duplicate uploads.
    // UNIQUE constraint means the same resume content is only ever stored once.
    contentHash: text("content_hash").unique(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
    searchVector: tsvector("search_vector"),
});


export const jobs = pgTable("jobs", {
    jobId: uuid("job_id").primaryKey().defaultRandom(),
    jobDescription: text("job_description"),
});

export const analyses = pgTable("analyses", {
    analysisId: uuid("analysis_id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").references(() => sessions.sessionId),
    resumeId: uuid("resume_id").references(() => resumes.resumeId),
    jobId: uuid("job_id").references(() => jobs.jobId),
    details: jsonb("details"),
    // Roadmap is stored here alongside the analysis — 1 analysis always has at most 1 roadmap
    roadmapDetails: jsonb("roadmap_details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});


export const apiCache = pgTable("api_cache", {
    cachedId: uuid("cached_id").primaryKey().defaultRandom(),
    apiProvider: text("api_provider"),
    query: text("query"),
    response: jsonb("response"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
});



