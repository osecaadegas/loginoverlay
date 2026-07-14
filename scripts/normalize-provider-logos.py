from __future__ import annotations

import re
import shutil
import subprocess
import warnings
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PROVIDERS_DIR = ROOT / "public" / "providers"
MIGRATION_PATH = ROOT / "migrations" / "003_slots_ingestion_and_requests.sql"
MANIFEST_PATH = ROOT / "src" / "utils" / "providerLogoFiles.js"
SOURCE_CACHE_DIR = ROOT / ".provider-logo-source-cache"
NORMALIZED_DIR = ROOT / ".provider-logo-normalized"

CANVAS_SIZE = (512, 256)
MAX_CONTENT_SIZE = (438, 172)

MANUAL_TARGETS = {
    "3oaks": "3oaks.png",
    "3_oaks": "3oaks.png",
    "4_the_player": "4_the_player.png",
    "aceroll": "aceroll.png",
    "amatic": "amatic.png",
    "amigo_gaming": "amigogaming.png",
    "apollo_games": "apollo_games.png",
    "arcadem": "arcadem.png",
    "avatar_ux": "avatarux.png",
    "backseat_gaming": "backseat_gaming.png",
    "bang_bang_games": "bang_bang_games.png",
    "bf_games": "bf_games.png",
    "big_time_gaming": "big_time_gaming.png",
    "blueprint_gaming": "blueprint.png",
    "bragg": "bragg.png",
    "bullshark_gaming": "bullshark_gaming.png",
    "claw_buster": "claw_buster.png",
    "clutch_gaming": "clutch_gaming.png",
    "darwin": "darwin.png",
    "esagaming": "esagaming.png",
    "evolution": "evolution.png",
    "evoplay": "evoplay.png",
    "fantasma_games": "fantasma.png",
    "fbmds": "fbmds.png",
    "foxhound": "foxhound.png",
    "game_beat": "game_beat.png",
    "games_global": "games_global.png",
    "gaming_corps": "gamingcorps.png",
    "gaming_realms": "gaming_realms.png",
    "good_times": "good_times.png",
    "irondog": "iron_dog.png",
    "iron_dog": "iron_dog.png",
    "isoftbet": "isoftbet.png",
    "jinx_gaming": "jinx_gaming.png",
    "kitsune": "kitsune.png",
    "lagio_gaming": "lagio_gaming.png",
    "light_wonder": "light_wonder.png",
    "light_and_wonder": "light_wonder.png",
    "lightning_box": "lightning_box.png",
    "mga_games": "mga_games.png",
    "netent": "netent.png",
    "nextgen_gaming": "nextgen_gaming.png",
    "nolimit_city": "nolimit.png",
    "nownow_gaming": "nownow_gaming.png",
    "octoplay": "octoplay.png",
    "pinguin_king": "pinguin_king.png",
    "play_digital": "play_digital.png",
    "play_n_go": "playngo.png",
    "pragmatic_play": "pragmatic_play.png",
    "print_studio": "print_studio.png",
    "red_rake_gaming": "redrake.png",
    "red_tiger": "red_tiger.png",
    "ruby_play": "rubyplay.png",
    "sg_digital": "sg_digital.png",
    "shady_lady": "shadylady.png",
    "smart_soft": "smartsoft.png",
    "stake_logic": "stakelogic.png",
    "tada": "tada.png",
    "tomhorn_gaming": "tom_horn.png",
    "truelab": "truelab.png",
    "trusty": "trusty.png",
    "wazdan": "wazdan.png",
    "wicked_games": "wicked_games.png",
    "wizard_games": "wizard_games.png",
}

SUPPORTED_EXTENSIONS = {".gif", ".jpg", ".jpeg", ".png", ".webp"}
FALLBACK_TEXT_LOGOS = {
    "sg_digital.png": "SG Digital",
}
warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*getdata.*")


def slug(value: str) -> str:
    return (
        str(value or "")
        .lower()
        .replace("&", " and ")
        .replace("'", "")
        .replace("’", "")
        .replace(".", "")
        .strip()
    )


def slug_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", slug(value)).strip("_")


def read_database_logo_targets() -> dict[str, str]:
    if not MIGRATION_PATH.exists():
        return {}

    sql = MIGRATION_PATH.read_text(encoding="utf-8", errors="ignore")
    pattern = re.compile(
        r"UPDATE\s+slot_providers\s+SET\s+logo_url\s*=\s*'/providers/([^']+)'\s+"
        r"WHERE\s+slug\s*=\s*'([^']+)'\s+OR\s+LOWER\(name\)\s*=\s*LOWER\('([^']+)'\)",
        re.IGNORECASE,
    )
    targets: dict[str, str] = {}
    for file_name, db_slug, db_name in pattern.findall(sql):
        target = f"{Path(file_name).stem}.png"
        for candidate in (file_name, Path(file_name).stem, db_slug, db_name):
            key = slug_key(candidate)
            if key:
                targets[key] = target
                targets[key.replace("_", "")] = target
    return targets


def target_name_for(source: Path, database_targets: dict[str, str]) -> str:
    source_key = slug_key(source.stem)
    compact_key = source_key.replace("_", "")
    target = (
        MANUAL_TARGETS.get(source_key)
        or MANUAL_TARGETS.get(compact_key)
        or database_targets.get(source_key)
        or database_targets.get(compact_key)
        or f"{source_key}.png"
    )
    return target.lower()


def source_score(path: Path) -> tuple[int, int, int]:
    try:
        with Image.open(path) as img:
            width, height = img.size
    except Exception:
        width = height = 0
    png_bonus = 1 if path.suffix.lower() == ".png" else 0
    return (width * height, path.stat().st_size, png_bonus)


def reset_temp_dir(path: Path) -> None:
    resolved = path.resolve()
    if resolved.parent != ROOT.resolve():
        raise RuntimeError(f"Refusing to clear unexpected temp path: {resolved}")
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def collect_sources() -> list[Path]:
    sources = [
        path
        for path in PROVIDERS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    ]

    reset_temp_dir(SOURCE_CACHE_DIR)
    tracked = subprocess.run(
        ["git", "ls-files", "public/providers"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()

    for rel_path in tracked:
        source_path = ROOT / rel_path
        if source_path.exists() or source_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        blob = subprocess.run(
            ["git", "show", f"HEAD:{rel_path}"],
            cwd=ROOT,
            check=False,
            capture_output=True,
        )
        if blob.returncode != 0 or not blob.stdout:
            continue
        cached = SOURCE_CACHE_DIR / source_path.name
        cached.write_bytes(blob.stdout)
        sources.append(cached)

    return sources


def get_corner_background(image: Image.Image) -> tuple[int, int, int] | None:
    width, height = image.size
    sample = max(4, min(width, height, 18))
    boxes = [
        (0, 0, sample, sample),
        (width - sample, 0, width, sample),
        (0, height - sample, sample, height),
        (width - sample, height - sample, width, height),
    ]
    colors: list[tuple[int, int, int]] = []
    transparent = 0
    total = 0
    for box in boxes:
        for r, g, b, a in image.crop(box).getdata():
            total += 1
            if a < 12:
                transparent += 1
                continue
            colors.append((r, g, b))

    if total and transparent / total > 0.6:
        return None
    if not colors:
        return None

    avg = tuple(round(sum(color[i] for color in colors) / len(colors)) for i in range(3))
    spread = sum(
        abs(r - avg[0]) + abs(g - avg[1]) + abs(b - avg[2])
        for r, g, b in colors
    ) / len(colors)
    if spread > 54:
        return None
    return avg


def remove_flat_background(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    background = get_corner_background(image)
    if background is None:
        return image

    original = image
    pixels = []
    changed = 0
    threshold = 78
    for r, g, b, a in image.getdata():
        distance = abs(r - background[0]) + abs(g - background[1]) + abs(b - background[2])
        if a > 0 and distance <= threshold:
            pixels.append((r, g, b, 0))
            changed += 1
        else:
            pixels.append((r, g, b, a))

    cleaned = Image.new("RGBA", image.size)
    cleaned.putdata(pixels)
    bbox = cleaned.getchannel("A").getbbox()
    if not bbox:
        return original

    remaining_area = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
    if remaining_area < (image.width * image.height * 0.01):
        return original
    if changed < (image.width * image.height * 0.04):
        return original
    return cleaned


def normalize_image(source: Path, target: Path) -> None:
    with Image.open(source) as opened:
        image = remove_flat_background(opened)

    bbox = image.getchannel("A").getbbox()
    if bbox:
        image = image.crop(bbox)

    max_width, max_height = MAX_CONTENT_SIZE
    scale = min(max_width / image.width, max_height / image.height)
    resized_size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    image = image.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    left = (CANVAS_SIZE[0] - image.width) // 2
    top = (CANVAS_SIZE[1] - image.height) // 2
    canvas.alpha_composite(image, (left, top))
    canvas = boost_dark_logo_readability(canvas)

    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, format="PNG", optimize=True)


def logo_luma(pixel: tuple[int, int, int, int]) -> float:
    r, g, b, _ = pixel
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b)


def boost_dark_logo_readability(canvas: Image.Image) -> Image.Image:
    visible = [pixel for pixel in canvas.getdata() if pixel[3] > 24]
    if not visible:
        return canvas

    weighted_luma = sum(logo_luma(pixel) * pixel[3] for pixel in visible) / sum(pixel[3] for pixel in visible)
    dark_ratio = sum(1 for pixel in visible if logo_luma(pixel) < 86) / len(visible)
    if weighted_luma >= 92 and dark_ratio < 0.58:
        return canvas

    mask = canvas.getchannel("A").filter(ImageFilter.GaussianBlur(3))
    mask.putdata([min(118, round(alpha * 0.54)) for alpha in mask.getdata()])
    glow = Image.new("RGBA", canvas.size, (226, 246, 255, 0))
    glow.putalpha(mask)
    enhanced = Image.alpha_composite(glow, canvas)

    lifted = []
    for r, g, b, a in enhanced.getdata():
        if a > 24:
            luma = (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
            if luma < 118:
                blend = min(0.58, ((118 - luma) / 118) * 0.58)
                r = round((r * (1 - blend)) + (232 * blend))
                g = round((g * (1 - blend)) + (244 * blend))
                b = round((b * (1 - blend)) + (255 * blend))
        lifted.append((r, g, b, a))

    enhanced.putdata(lifted)
    return enhanced


def create_text_logo(label: str, target: Path) -> None:
    from PIL import ImageDraw, ImageFont

    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    font_paths = [
        Path("C:/Windows/Fonts/arialbd.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    font_path = next((path for path in font_paths if path.exists()), None)
    text = label.upper()
    font_size = 88
    font = ImageFont.load_default()

    while font_size > 22:
        font = ImageFont.truetype(str(font_path), font_size) if font_path else ImageFont.load_default()
        bbox = draw.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= MAX_CONTENT_SIZE[0] and (bbox[3] - bbox[1]) <= MAX_CONTENT_SIZE[1]:
            break
        font_size -= 2

    bbox = draw.textbbox((0, 0), text, font=font)
    x = (CANVAS_SIZE[0] - (bbox[2] - bbox[0])) / 2
    y = (CANVAS_SIZE[1] - (bbox[3] - bbox[1])) / 2 - bbox[1]
    draw.text((x + 2, y + 3), text, font=font, fill=(0, 0, 0, 150))
    draw.text((x, y), text, font=font, fill=(226, 246, 255, 255))
    target.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(target, format="PNG", optimize=True)


def write_manifest() -> None:
    files = sorted(path.name for path in PROVIDERS_DIR.glob("*.png"))
    lines = ["export const PROVIDER_LOGO_FILES = ["]
    lines.extend(f"  '{file_name}'," for file_name in files)
    lines.extend(["];", "", "export default PROVIDER_LOGO_FILES;", ""])
    MANIFEST_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    database_targets = read_database_logo_targets()
    sources = collect_sources()
    grouped: dict[str, list[Path]] = defaultdict(list)
    for source in sources:
        grouped[target_name_for(source, database_targets)].append(source)

    chosen_by_target: dict[str, Path] = {}
    collisions: list[tuple[str, list[str], str]] = []
    for target_name, target_sources in sorted(grouped.items()):
        chosen = max(target_sources, key=source_score)
        chosen_by_target[target_name] = chosen
        if len(target_sources) > 1:
            collisions.append((target_name, [item.name for item in target_sources], chosen.name))

    reset_temp_dir(NORMALIZED_DIR)
    for target_name, chosen in chosen_by_target.items():
        normalize_image(chosen, NORMALIZED_DIR / target_name)

    for target_name, label in FALLBACK_TEXT_LOGOS.items():
        if target_name not in chosen_by_target:
            create_text_logo(label, NORMALIZED_DIR / target_name)
            chosen_by_target[target_name] = NORMALIZED_DIR / target_name

    for current in PROVIDERS_DIR.iterdir():
        if current.is_file() and current.suffix.lower() in SUPPORTED_EXTENSIONS:
            current.unlink(missing_ok=True)

    for normalized in NORMALIZED_DIR.iterdir():
        shutil.move(str(normalized), str(PROVIDERS_DIR / normalized.name))

    write_manifest()

    shutil.rmtree(SOURCE_CACHE_DIR, ignore_errors=True)
    shutil.rmtree(NORMALIZED_DIR, ignore_errors=True)

    print(f"Processed {len(chosen_by_target)} provider logos.")
    print(f"Removed or merged {len(sources) - len(chosen_by_target)} duplicate/old files.")
    if collisions:
        print("Merged duplicate targets:")
        for target, candidates, chosen in collisions[:30]:
            print(f"  {target}: {', '.join(candidates)} -> {chosen}")
        if len(collisions) > 30:
            print(f"  ...and {len(collisions) - 30} more")


if __name__ == "__main__":
    main()
