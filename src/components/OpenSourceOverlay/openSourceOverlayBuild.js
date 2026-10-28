import {
  applyStreamerOverlayComposition,
  getStreamerOverlayName,
  hasStreamerOverlayComposition,
  isLegacyStreamerOverlayComposition,
} from "../OverlayCenter/editor/streamerOverlayComposition";
import {
  createDefaultBetterLayout,
} from "../OverlayCenter/editor/betterWidgetRegistry";
import {
  createBetterEditorOverlay,
  getBetterEditorOverlay,
  listBetterEditorOverlays,
  saveBetterDraft,
  selectBetterEditorOverlay,
} from "../../services/betterOverlayService";

/** Load the signed-in user's source overlay, migrating an older composition when needed. */
export async function getOrCreateOpenSourceOverlay(user) {
  if (!user?.id) throw new Error("Sign in with Twitch to open this overlay.");

  const builds = await listBetterEditorOverlays(user.id);
  const expectedName = getStreamerOverlayName({ instances: [] }, user).toLocaleLowerCase();
  const preferred = builds.filter((build) => {
    const name = String(build.name || "").trim().toLocaleLowerCase();
    return name === expectedName || name.startsWith(`${expectedName} (`) || name === "open source overlay";
  });
  const preferredIds = new Set(preferred.map((build) => build.id));
  const candidates = [...preferred, ...builds.filter((build) => !preferredIds.has(build.id))];

  for (const build of candidates) {
    const fullBuild = await getBetterEditorOverlay(user.id, build.id);
    if (!fullBuild?.draftLayout) continue;
    if (hasStreamerOverlayComposition(fullBuild.draftLayout)) {
      selectBetterEditorOverlay(user.id, build.id);
      return fullBuild;
    }
    if (isLegacyStreamerOverlayComposition(fullBuild.draftLayout)) {
      const migratedLayout = {
        ...applyStreamerOverlayComposition(fullBuild.draftLayout, user),
        name: fullBuild.draftLayout.name || build.name || getStreamerOverlayName(fullBuild.draftLayout, user),
      };
      const migrated = await saveBetterDraft(
        user.id,
        migratedLayout,
        fullBuild.draftVersion,
        build.id,
      );
      selectBetterEditorOverlay(user.id, build.id);
      return migrated;
    }
  }

  const sourceLayout = applyStreamerOverlayComposition(
    createDefaultBetterLayout(),
    user,
  );
  const record = await createBetterEditorOverlay(
    user.id,
    sourceLayout.name || "Open Source Overlay",
    sourceLayout,
  );
  selectBetterEditorOverlay(user.id, record.id);
  return record;
}
