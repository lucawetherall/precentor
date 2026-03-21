import { relations } from "drizzle-orm";
import * as s from "./schema";

export const usersRelations = relations(s.users, ({ many }) => ({
  memberships: many(s.churchMemberships),
  availability: many(s.availability),
  rotaEntries: many(s.rotaEntries),
}));

export const churchesRelations = relations(s.churches, ({ many }) => ({
  memberships: many(s.churchMemberships),
  services: many(s.services),
  anthems: many(s.anthems),
  canticleSettings: many(s.canticleSettings),
  responsesSettings: many(s.responsesSettings),
  churchMassSettings: many(s.churchMassSettings),
  templates: many(s.serviceSheetTemplates),
  performanceLogs: many(s.performanceLogs),
  invites: many(s.invites),
}));

// churchMemberships: belongs to user + church
export const churchMembershipsRelations = relations(s.churchMemberships, ({ one }) => ({
  user: one(s.users, { fields: [s.churchMemberships.userId], references: [s.users.id] }),
  church: one(s.churches, { fields: [s.churchMemberships.churchId], references: [s.churches.id] }),
}));

// liturgicalDays: has many readings, services
export const liturgicalDaysRelations = relations(s.liturgicalDays, ({ many }) => ({
  readings: many(s.readings),
  services: many(s.services),
}));

// readings: belongs to liturgicalDay
export const readingsRelations = relations(s.readings, ({ one }) => ({
  liturgicalDay: one(s.liturgicalDays, { fields: [s.readings.liturgicalDayId], references: [s.liturgicalDays.id] }),
}));

// services: belongs to church + liturgicalDay, has many musicSlots, availability, rotaEntries
export const servicesRelations = relations(s.services, ({ one, many }) => ({
  church: one(s.churches, { fields: [s.services.churchId], references: [s.churches.id] }),
  liturgicalDay: one(s.liturgicalDays, { fields: [s.services.liturgicalDayId], references: [s.liturgicalDays.id] }),
  musicSlots: many(s.musicSlots),
  availability: many(s.availability),
  rotaEntries: many(s.rotaEntries),
}));

// musicSlots: belongs to service, optional refs to hymn/anthem/massSetting/canticleSetting/responsesSetting
export const musicSlotsRelations = relations(s.musicSlots, ({ one, many }) => ({
  service: one(s.services, { fields: [s.musicSlots.serviceId], references: [s.services.id] }),
  hymn: one(s.hymns, { fields: [s.musicSlots.hymnId], references: [s.hymns.id] }),
  anthem: one(s.anthems, { fields: [s.musicSlots.anthemId], references: [s.anthems.id] }),
  massSetting: one(s.massSettings, { fields: [s.musicSlots.massSettingId], references: [s.massSettings.id] }),
  canticleSetting: one(s.canticleSettings, { fields: [s.musicSlots.canticleSettingId], references: [s.canticleSettings.id] }),
  responsesSetting: one(s.responsesSettings, { fields: [s.musicSlots.responsesSettingId], references: [s.responsesSettings.id] }),
  performanceLogs: many(s.performanceLogs),
}));

// hymns: has many musicSlots
export const hymnsRelations = relations(s.hymns, ({ many }) => ({
  musicSlots: many(s.musicSlots),
}));

// anthems: belongs to church (optional), has many musicSlots
export const anthemsRelations = relations(s.anthems, ({ one, many }) => ({
  church: one(s.churches, { fields: [s.anthems.churchId], references: [s.churches.id] }),
  musicSlots: many(s.musicSlots),
}));

// massSettings: has many churchMassSettings, musicSlots
export const massSettingsRelations = relations(s.massSettings, ({ many }) => ({
  churchMassSettings: many(s.churchMassSettings),
  musicSlots: many(s.musicSlots),
}));

// churchMassSettings: belongs to church + massSetting
export const churchMassSettingsRelations = relations(s.churchMassSettings, ({ one }) => ({
  church: one(s.churches, { fields: [s.churchMassSettings.churchId], references: [s.churches.id] }),
  massSetting: one(s.massSettings, { fields: [s.churchMassSettings.massSettingId], references: [s.massSettings.id] }),
}));

// canticleSettings: belongs to church (optional), has many musicSlots
export const canticleSettingsRelations = relations(s.canticleSettings, ({ one, many }) => ({
  church: one(s.churches, { fields: [s.canticleSettings.churchId], references: [s.churches.id] }),
  musicSlots: many(s.musicSlots),
}));

// responsesSettings: belongs to church (optional), has many musicSlots
export const responsesSettingsRelations = relations(s.responsesSettings, ({ one, many }) => ({
  church: one(s.churches, { fields: [s.responsesSettings.churchId], references: [s.churches.id] }),
  musicSlots: many(s.musicSlots),
}));

// invites: belongs to church + invitedBy user
export const invitesRelations = relations(s.invites, ({ one }) => ({
  church: one(s.churches, { fields: [s.invites.churchId], references: [s.churches.id] }),
  invitedByUser: one(s.users, { fields: [s.invites.invitedBy], references: [s.users.id] }),
}));

// availability: belongs to user + service
export const availabilityRelations = relations(s.availability, ({ one }) => ({
  user: one(s.users, { fields: [s.availability.userId], references: [s.users.id] }),
  service: one(s.services, { fields: [s.availability.serviceId], references: [s.services.id] }),
}));

// rotaEntries: belongs to service + user
export const rotaEntriesRelations = relations(s.rotaEntries, ({ one }) => ({
  service: one(s.services, { fields: [s.rotaEntries.serviceId], references: [s.services.id] }),
  user: one(s.users, { fields: [s.rotaEntries.userId], references: [s.users.id] }),
}));

// performanceLogs: belongs to church + musicSlot
export const performanceLogsRelations = relations(s.performanceLogs, ({ one }) => ({
  church: one(s.churches, { fields: [s.performanceLogs.churchId], references: [s.churches.id] }),
  musicSlot: one(s.musicSlots, { fields: [s.performanceLogs.musicSlotId], references: [s.musicSlots.id] }),
}));

// serviceSheetTemplates: belongs to church
export const serviceSheetTemplatesRelations = relations(s.serviceSheetTemplates, ({ one }) => ({
  church: one(s.churches, { fields: [s.serviceSheetTemplates.churchId], references: [s.churches.id] }),
}));
