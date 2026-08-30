#!/usr/bin/env python3
"""Pull a design system off styles.refero.design as a DESIGN.md brief.

Two subcommands:

    browse [collection]     list the styles on a listing page
    fetch <style|uuid|url>  render one style's design system as DESIGN.md

`collection` is a slug from /design-styles/ (dark-mode-websites, editorial-websites,
clean-saas, minimal-websites, fintech-websites, devtools-websites, ai-startup-websites,
ecommerce-websites, agency-websites, productivity-apps), a full URL, or nothing for
the front page.

Both commands read one page each. This is deliberate: do not loop it over the
sitemap. See the "Fetch politely" section of SKILL.md.

Style pages are Next.js app-router documents. The design system is not in the
markup — it is in the RSC flight payload, as a `"designSystem": {...}` object.
That is what this reads, so the output is the site's own structured data rather
than scraped prose.
"""

from __future__ import annotations

import argparse
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.request

BASE = "https://styles.refero.design"
UA = "Mozilla/5.0 (compatible; hamdam-refero-styles-skill/1.0)"
UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)
FLIGHT_RE = re.compile(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)')


def get(url: str, attempts: int = 3) -> str:
    """Fetch one page. Retries only transient transport errors, never an HTTP status."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as exc:
            sys.exit(f"error: {url} returned HTTP {exc.code}")
        except (urllib.error.URLError, TimeoutError, ssl.SSLError, OSError) as exc:
            if attempt == attempts:
                sys.exit(f"error: could not reach {url}: {exc}")
            time.sleep(2 ** attempt)
    raise AssertionError("unreachable")


def flight(html: str) -> str:
    """Concatenate the RSC payload chunks back into one string."""
    return "".join(json.loads(chunk) for chunk in FLIGHT_RE.findall(html))


def objects_after(payload: str, key: str):
    """Yield every JSON object that follows `"key":` in the flight payload."""
    needle = f'"{key}":'
    at = 0
    while True:
        at = payload.find(needle, at)
        if at < 0:
            return
        start = payload.find("{", at)
        if start < 0:
            return
        end = match_brace(payload, start)
        at = start + 1
        if end is None:
            continue
        try:
            yield json.loads(payload[start : end + 1])
        except json.JSONDecodeError:
            continue


def match_brace(text: str, start: int):
    """Index of the `}` closing the `{` at `start`, string-aware. None if unbalanced."""
    depth = 0
    in_string = False
    escaped = False
    for i in range(start, len(text)):
        char = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return i
    return None


# --- browse ------------------------------------------------------------------


def browse(collection: str | None) -> int:
    if not collection:
        url = BASE + "/"
    elif collection.startswith("http"):
        url = collection
    else:
        url = f"{BASE}/design-styles/{collection.strip('/')}"

    payload = flight(get(url))
    seen: dict[str, dict] = {}
    for card in objects_after(payload, "style"):
        if card.get("id") and card.get("siteName"):
            seen.setdefault(card["id"], card)
    # The front page embeds cards as a plain array rather than under "style".
    for match in re.finditer(r'\{"id":"' + UUID_RE.pattern + r'","url":', payload):
        end = match_brace(payload, match.start())
        if end is None:
            continue
        try:
            card = json.loads(payload[match.start() : end + 1])
        except json.JSONDecodeError:
            continue
        if card.get("siteName"):
            seen.setdefault(card["id"], card)

    if not seen:
        print(f"No styles found on {url}. Check the collection slug.", file=sys.stderr)
        return 1

    print(f"{len(seen)} styles on {url}\n")
    for card in seen.values():
        fonts = ", ".join(card.get("fonts") or []) or "—"
        print(f"{card['siteName']}  ({card.get('url', '')})")
        print(f"  {card.get('northStar', '').strip()}")
        print(f"  fonts: {fonts}")
        print(f"  {BASE}/style/{card['id']}")
        print()
    return 0


# --- fetch -------------------------------------------------------------------


def fetch(target: str) -> int:
    match = UUID_RE.search(target)
    if not match:
        sys.exit(
            "error: pass a style URL or its uuid, e.g.\n"
            "  refero_style.py fetch https://styles.refero.design/style/<uuid>"
        )
    url = f"{BASE}/style/{match.group(0).lower()}"
    html = get(url)
    payload = flight(html)

    system = next(objects_after(payload, "designSystem"), None)
    if system is None:
        sys.exit(
            f"error: no designSystem payload in {url}.\n"
            "The page shape may have changed — check the page in a browser and use "
            "its own Copy DESIGN.md button."
        )

    title = re.search(r'<meta property="og:title" content="([^"]*)"', html)
    name = title.group(1).split(" design system")[0] if title else "Unknown"
    print(render(name, url, system))
    return 0


def render(name: str, url: str, ds: dict) -> str:
    out: list[str] = [f"# {name} — DESIGN.md", ""]
    out += [f"Source: {url}", "Fetched from Refero Styles. Reference only — see SKILL.md before applying.", ""]

    if ds.get("northStar"):
        out += [f"**North star:** {ds['northStar']}", ""]
    meta = [f"{k}: {ds[k]}" for k in ("theme", "industry") if ds.get(k)]
    if meta:
        out += ["  \n".join(meta), ""]
    if ds.get("description"):
        out += ["## Overview", "", str(ds["description"]).strip(), ""]

    if ds.get("colors"):
        out += ["## Colours", "", "| Name | Hex | Group | Role |", "| --- | --- | --- | --- |"]
        for c in ds["colors"]:
            out.append(
                f"| {c.get('name', '')} | `{c.get('hex', '')}` | "
                f"{c.get('group', '')} | {cell(c.get('role'))} |"
            )
        out.append("")

    if ds.get("surfaces"):
        out += ["## Surfaces", "", "| Level | Name | Hex | Purpose |", "| --- | --- | --- | --- |"]
        for s in ds["surfaces"]:
            out.append(
                f"| {s.get('level', '')} | {s.get('name', '')} | `{s.get('hex', '')}` | "
                f"{cell(s.get('purpose'))} |"
            )
        out.append("")

    for face in ds.get("typography") or []:
        out += [f"## Typeface — {face.get('family', 'unnamed')}", ""]
        for label, key in (
            ("Role", "role"),
            ("Weights", "weight"),
            ("Sizes", "sizes"),
            ("Line height", "lineHeight"),
            ("Letter spacing", "letterSpacing"),
            ("Font features", "fontFeatureSettings"),
            ("Substitute", "substitute"),
        ):
            if face.get(key):
                out.append(f"- **{label}:** {face[key]}")
        out.append("")

    if ds.get("typeScale"):
        out += ["## Type scale", "", "| Role | Size | Line height |", "| --- | --- | --- |"]
        for step in ds["typeScale"]:
            out.append(
                f"| {step.get('role', '')} | {step.get('size', '')} | {step.get('lineHeight', '')} |"
            )
        out.append("")

    spacing = ds.get("spacing") or {}
    if spacing:
        out += ["## Spacing and radii", ""]
        for key, value in spacing.items():
            if isinstance(value, dict):
                inner = ", ".join(f"{k} {v}" for k, v in value.items())
                out.append(f"- **{human(key)}:** {inner}")
            else:
                out.append(f"- **{human(key)}:** {value}")
        out.append("")

    for heading, key in (
        ("Layout", "layout"),
        ("Elevation", "elevationPhilosophy"),
        ("Imagery", "imagery"),
    ):
        if ds.get(key):
            out += [f"## {heading}", "", str(ds[key]).strip(), ""]

    if ds.get("components"):
        out += ["## Components", ""]
        for comp in ds["components"]:
            out.append(f"### {comp.get('name', 'unnamed')}")
            if comp.get("role"):
                out.append(f"*{comp['role']}*")
            if comp.get("description"):
                out += ["", comp["description"].strip()]
            out.append("")

    for heading, key in (("Do", "dos"), ("Do not", "donts")):
        if ds.get(key):
            out += [f"## {heading}", ""]
            out += [f"- {item}" for item in ds[key]]
            out.append("")

    unresolved = 0
    for section in ds.get("customSections") or []:
        content = section.get("content") or ""
        if isinstance(content, str) and content.startswith("$"):
            unresolved += 1
            continue
        out += [f"## {section.get('title', 'Notes')}", "", str(content).strip(), ""]

    if ds.get("similar"):
        out += ["## Similar systems", ""]
        for sim in ds["similar"]:
            out.append(f"- **{sim.get('business', '')}** — {sim.get('why', '')}")
        out.append("")

    if unresolved:
        out += [
            f"> {unresolved} section(s) on the page render client-side and are not in "
            "this payload. Open the URL above if you need them.",
            "",
        ]
    return "\n".join(out).rstrip() + "\n"


def cell(text) -> str:
    return str(text or "").replace("|", "\\|").replace("\n", " ")


def human(key: str) -> str:
    spaced = re.sub(r"(?<!^)(?=[A-Z])", " ", key).lower()
    return spaced[0].upper() + spaced[1:]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_browse = sub.add_parser("browse", help="list styles on a listing page")
    p_browse.add_argument("collection", nargs="?", help="collection slug, full URL, or nothing")

    p_fetch = sub.add_parser("fetch", help="render one style as DESIGN.md on stdout")
    p_fetch.add_argument("style", help="style page URL or its uuid")

    args = parser.parse_args()
    if args.command == "browse":
        return browse(args.collection)
    return fetch(args.style)


if __name__ == "__main__":
    sys.exit(main())
