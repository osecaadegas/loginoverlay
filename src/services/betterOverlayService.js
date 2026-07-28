import { supabase } from "../config/supabaseClient";
import {
  createDefaultBetterLayout,
  normalizeBetterLayout,
} from "../components/OverlayCenter/editor/betterWidgetRegistry";
import {
  getOrCreateInstance,
  getTheme,
  getWidgets,
  subscribeToOverlay,
  unsubscribeOverlay,
} from "./overlayService";

const EDITOR_TABLE = "better_editor_overlays";
const PUBLIC_TABLE = "better_overlay_publications";

function nowIso() {
  return new Date().toISOString();
}

export function generatePublicOverlayId() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
    return `bo_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  return `bo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 18)}`;
}

function normalizeEditorRow(row) {
  if (!row) return null;
  const draftLayout = normalizeBetterLayout(row.draft_layout || row.published_layout || createDefaultBetterLayout());
  const publishedLayout = row.published_layout ? normalizeBetterLayout(row.published_layout) : null;
  return {
    id: row.id,
    userId: row.user_id,
    publicOverlayId: row.public_overlay_id,
    draftLayout,
    publishedLayout,
    draftVersion: Number(row.draft_version || 1),
    publishedVersion: Number(row.published_version || 0),
    hasUnpublishedChanges: Number(row.draft_version || 1) !== Number(row.published_version || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

function normalizePublicRow(row) {
  if (!row || row.revoked_at) return null;
  return {
    publicOverlayId: row.public_overlay_id,
    ownerUserId: row.owner_user_id,
    publishedLayout: normalizeBetterLayout(row.published_layout || createDefaultBetterLayout()),
    publishedVersion: Number(row.published_version || 0),
    updatedAt: row.updated_at,
  };
}

function normalizeLiveSource({ ownerUserId = null, instance = null, widgets = [], theme = null } = {}) {
  return {
    overlayId: instance?.id || null,
    ownerUserId: ownerUserId || instance?.user_id || null,
    widgets: Array.isArray(widgets) ? widgets : [],
    theme: theme || null,
  };
}

async function getActiveLegacyOverlayInstance(ownerUserId) {
  if (!ownerUserId) return null;
  const { data, error } = await supabase
    .from("overlay_instances")
    .select("id,user_id")
    .eq("user_id", ownerUserId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function fetchOwnedBetterOverlayRow(userId) {
  const { data, error } = await supabase
    .from(EDITOR_TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function createOwnedBetterOverlayRow(userId) {
  const layout = createDefaultBetterLayout();
  const publicOverlayId = generatePublicOverlayId();
  const timestamp = nowIso();
  const { data, error } = await supabase
    .from(EDITOR_TABLE)
    .insert({
      user_id: userId,
      public_overlay_id: publicOverlayId,
      draft_layout: layout,
      draft_version: 1,
      published_layout: null,
      published_version: 0,
      updated_at: timestamp,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function getOrCreateOwnedBetterOverlayRow(userId) {
  if (!userId) throw new Error("A signed-in user is required to edit Better overlays.");
  const existing = await fetchOwnedBetterOverlayRow(userId);
  if (existing) return existing;
  return createOwnedBetterOverlayRow(userId);
}

export async function getOrCreateBetterEditorOverlay(userId) {
  const row = await getOrCreateOwnedBetterOverlayRow(userId);
  return normalizeEditorRow(row);
}

export async function getBetterEditorLiveSource(userId) {
  if (!userId) return normalizeLiveSource();
  const instance = await getOrCreateInstance(userId);
  const [widgets, theme] = await Promise.all([
    getWidgets(userId, instance.id),
    getTheme(userId, instance.id),
  ]);
  return normalizeLiveSource({
    ownerUserId: userId,
    instance,
    widgets,
    theme,
  });
}

export async function getPublishedBetterLiveSource(ownerUserId) {
  if (!ownerUserId) return normalizeLiveSource();
  const instance = await getActiveLegacyOverlayInstance(ownerUserId);
  if (!instance) {
    return normalizeLiveSource({ ownerUserId });
  }
  const [widgets, theme] = await Promise.all([
    getWidgets(ownerUserId, instance.id),
    getTheme(ownerUserId, instance.id),
  ]);
  return normalizeLiveSource({
    ownerUserId,
    instance,
    widgets,
    theme,
  });
}

export function subscribeToBetterLiveSource(ownerUserId, overlayId, callbacks = {}) {
  if (!ownerUserId || !overlayId) return null;
  return subscribeToOverlay(ownerUserId, callbacks, overlayId);
}

export function unsubscribeBetterLiveSource(channel) {
  unsubscribeOverlay(channel);
}

export async function saveBetterDraft(userId, layout) {
  const row = await getOrCreateOwnedBetterOverlayRow(userId);
  const draftLayout = normalizeBetterLayout({
    ...layout,
    updatedAt: nowIso(),
  });
  const nextDraftVersion = Number(row.draft_version || 0) + 1;
  const { data, error } = await supabase
    .from(EDITOR_TABLE)
    .update({
      draft_layout: draftLayout,
      draft_version: nextDraftVersion,
      updated_at: nowIso(),
    })
    .eq("id", row.id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeEditorRow(data);
}

export async function publishBetterOverlay(userId, layout) {
  const row = await getOrCreateOwnedBetterOverlayRow(userId);
  const publishedLayout = normalizeBetterLayout({
    ...(layout || row.draft_layout),
    updatedAt: nowIso(),
  });
  const nextDraftVersion = Number(row.draft_version || 0) + 1;
  const nextPublishedVersion = Math.max(
    Number(row.published_version || 0) + 1,
    nextDraftVersion,
  );
  const timestamp = nowIso();
  const { data, error } = await supabase
    .from(EDITOR_TABLE)
    .update({
      draft_layout: publishedLayout,
      published_layout: publishedLayout,
      draft_version: nextPublishedVersion,
      published_version: nextPublishedVersion,
      published_at: timestamp,
      updated_at: timestamp,
    })
    .eq("id", row.id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;

  const { error: publicError } = await supabase
    .from(PUBLIC_TABLE)
    .upsert(
      {
        public_overlay_id: row.public_overlay_id,
        owner_user_id: userId,
        published_layout: publishedLayout,
        published_version: nextPublishedVersion,
        updated_at: timestamp,
        revoked_at: null,
      },
      { onConflict: "public_overlay_id" },
    );
  if (publicError) throw publicError;
  return normalizeEditorRow(data);
}

export async function revertBetterDraftToPublished(userId) {
  const row = await getOrCreateOwnedBetterOverlayRow(userId);
  const publishedLayout = row.published_layout
    ? normalizeBetterLayout(row.published_layout)
    : createDefaultBetterLayout();
  const timestamp = nowIso();
  const { data, error } = await supabase
    .from(EDITOR_TABLE)
    .update({
      draft_layout: publishedLayout,
      draft_version: Number(row.published_version || 0),
      updated_at: timestamp,
    })
    .eq("id", row.id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeEditorRow(data);
}

export async function resetBetterDraftLayout(userId) {
  return saveBetterDraft(userId, createDefaultBetterLayout());
}

export async function regenerateBetterPublicOverlayId(userId) {
  const row = await getOrCreateOwnedBetterOverlayRow(userId);
  const oldPublicOverlayId = row.public_overlay_id;
  const newPublicOverlayId = generatePublicOverlayId();
  const publishedLayout = row.published_layout
    ? normalizeBetterLayout(row.published_layout)
    : null;
  const timestamp = nowIso();

  if (oldPublicOverlayId) {
    await supabase
      .from(PUBLIC_TABLE)
      .update({ revoked_at: timestamp, updated_at: timestamp })
      .eq("public_overlay_id", oldPublicOverlayId);
  }

  const { data, error } = await supabase
    .from(EDITOR_TABLE)
    .update({
      public_overlay_id: newPublicOverlayId,
      updated_at: timestamp,
    })
    .eq("id", row.id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;

  if (publishedLayout) {
    const { error: publicError } = await supabase
      .from(PUBLIC_TABLE)
      .upsert(
        {
          public_overlay_id: newPublicOverlayId,
          owner_user_id: userId,
          published_layout: publishedLayout,
          published_version: Number(row.published_version || 0),
          updated_at: timestamp,
          revoked_at: null,
        },
        { onConflict: "public_overlay_id" },
      );
    if (publicError) throw publicError;
  }

  return normalizeEditorRow(data);
}

export async function getPublishedBetterOverlay(publicOverlayId) {
  if (!publicOverlayId) return null;
  const { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select("public_overlay_id,owner_user_id,published_layout,published_version,updated_at,revoked_at")
    .eq("public_overlay_id", publicOverlayId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  return normalizePublicRow(data);
}

export function subscribeToPublishedBetterOverlay(publicOverlayId, onChange) {
  if (!publicOverlayId || typeof onChange !== "function") return null;
  const channel = supabase.channel(`better_overlay_public_${publicOverlayId}`);
  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: PUBLIC_TABLE,
      filter: `public_overlay_id=eq.${publicOverlayId}`,
    },
    (payload) => {
      onChange(normalizePublicRow(payload.new));
    },
  );
  channel.subscribe();
  return channel;
}

export function unsubscribeBetterOverlay(channel) {
  if (channel) supabase.removeChannel(channel);
}
