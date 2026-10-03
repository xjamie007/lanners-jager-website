"""
Demo-Fotos der Artikel einheitlich aufbereiten (nur macOS, braucht Xcode-Werkzeuge
für Swift und Python mit Pillow).

  python3 scripts/demo-fotos/aufbereiten.py <ordner-mit-originalen> [uid …]

Liest scripts/demo-fotos/fotos.json (je Artikel: Unsplash-Quelle und Bilddatei, Fotograf, Warengruppe,
ob eine Person zu sehen ist, optional Ausschnitt, Retusche fremder
Schriftzüge und Radieren störender Teile) und die Originale
<ordner>/<uid>.jpg (fehlende lädt es vom Unsplash-Bildserver). Für jeden Artikel:
  1. Motiv freistellen (Apple Vision, freisteller.swift), dabei Gesicht und Körperpunkte erkennen
  2. Person: Schnitt unter dem Kinn (Hosen: ab der Taille), Oberteile enden am Oberschenkel.
     Angeschnittene Kanten liegen bündig am Bildrand, wie bei Shop-Fotos üblich.
     Produkt: zentriert mit gleichem Rand.
  3. Hauptbild 900 × 1200 auf Weiß mit weichem Schatten, Detailbild als Ausschnitt
  4. WebP in 900 und 480 px Breite nach public/demo-fotos/demo-<uid>-1/-2(-480).webp
Danach schreibt es den Bildnachweis (artikelfotos) in src/content/bildnachweis.json.
Weiß wird auf der Seite per mix-blend-mode: multiply zum Glasgrau der Produktkarten.
"""
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
HIER = Path(__file__).resolve().parent
AUS = ROOT / "public" / "demo-fotos"
W, H = 900, 1200
RAND = 0.05  # Rand je Seite (die Karte setzt zusätzlich 6 % Innenabstand)

# Ausschnitt des Detailbilds je Warengruppe: Mittelpunkt relativ zum Motiv, Zoom
DETAIL = {
    "oben": ((0.5, 0.24), 2.4),  # Jacken, Hemden, Strick, Mäntel, Kleider: Kragen und Brust
    "hose": ((0.5, 0.14), 2.6),  # Hosen, Jeans: Bund und Tasche
    "kopf": ((0.5, 0.5), 1.8),  # Hüte, Mützen, Caps
    "klein": ((0.5, 0.5), 2.0),  # Gürtel, Taschen, Schals, Wäsche
}
# Schnitt bei Fotos mit Person: Standard je Warengruppe, in fotos.json überschreibbar
# ("oben": Kinn bis Oberschenkel, "ganz": Kinn bis Fuß, "hose": Taille bis Fuß, "schal": Kinn bis Hüfte)
SCHNITT = {"oben": "oben", "hose": "hose", "klein": "schal"}


def freistellen(swift_bin: Path, ein: Path, aus: Path, instanzen: list[int] | None) -> dict:
    args = [str(swift_bin), str(ein), str(aus)] + [str(i) for i in (instanzen or [])]
    out = subprocess.run(args, check=True, capture_output=True, text=True).stdout
    for zeile in out.splitlines():
        if zeile.startswith("meta: "):
            return json.loads(zeile[6:])
    return {"gesichter": [], "koerper": {}}


def retuschieren(bild: Image.Image, flaechen: list[list[float]]) -> Image.Image:
    """Helle Schriftzüge fremder Marken auf dunklem Stoff übermalen (z. B. Wäschebund).
    In jeder Fläche zählt als Schrift, was hell ist und nicht mit dem Rand der Fläche
    zusammenhängt (der helle Hintergrund außerhalb des Stoffs bleibt so unberührt)."""
    bild = bild.copy()
    w, h = bild.size
    for l, t, r, b in flaechen:
        box = (round(l * w), round(t * h), round(r * w), round(b * h))
        stueck = bild.crop(box)
        hell = stueck.convert("L").point(lambda v: 255 if v > 90 else 0)
        bw, bh = hell.size
        for x, y in [(x, 0) for x in range(bw)] + [(x, bh - 1) for x in range(bw)] + [(0, y) for y in range(bh)] + [(bw - 1, y) for y in range(bh)]:
            if hell.getpixel((x, y)) == 255:
                ImageDraw.floodfill(hell, (x, y), 128)
        schrift = hell.point(lambda v: 255 if v == 255 else 0).filter(ImageFilter.MaxFilter(7))
        dunkel = [px for px, m in zip(stueck.get_flattened_data(), hell.get_flattened_data()) if m == 0]
        dunkel.sort(key=sum)
        farbe = dunkel[len(dunkel) // 2] if dunkel else (20, 20, 22)
        stueck.paste(Image.new("RGB", stueck.size, farbe), (0, 0), schrift.filter(ImageFilter.GaussianBlur(1.5)))
        bild.paste(stueck, box[:2])
    return bild


def radieren(frei: Image.Image, flaechen: list[list[float]]) -> Image.Image:
    """Störendes (Haken, Leiterholm, fremde Kleidung am Rand) nach dem Freistellen entfernen."""
    w, h = frei.size
    alpha = frei.getchannel("A")
    for l, t, r, b in flaechen:
        alpha.paste(0, (round(l * w), round(t * h), round(r * w), round(b * h)))
    frei.putalpha(alpha)
    return frei


def schnittlinien(meta: dict, schnitt: str, hoehe: int) -> tuple[float | None, float | None]:
    """Obere und untere Schnittlinie (Pixel) aus Gesicht und Körperpunkten."""
    k = {n: p[1] * hoehe for n, p in meta.get("koerper", {}).items()}
    nacken, huefte = k.get("neck_1_joint"), k.get("root")
    knie = [k[n] for n in ("left_leg_joint", "right_leg_joint") if n in k]
    knie = sum(knie) / len(knie) if knie else None
    oben = None
    if schnitt == "hose":
        if huefte and nacken:
            oben = huefte - 0.3 * (huefte - nacken)
    elif meta.get("gesichter"):
        x, y, w, h = max(meta["gesichter"], key=lambda f: f[2] * f[3])
        oben = (y + h * 1.12) * hoehe  # knapp unter dem Kinn
    elif nacken:
        oben = nacken + 0.01 * hoehe
    unten = None
    if schnitt == "oben" and huefte:
        unten = huefte + 0.55 * (knie - huefte) if knie and knie > huefte else huefte + 0.12 * hoehe
    elif schnitt == "schal" and huefte:
        unten = huefte
    return oben, unten


def komponieren(frei: Image.Image, oben: float | None, unten: float | None) -> tuple[Image.Image, Image.Image]:
    """Hauptbild (900 × 1200 auf Weiß, mit Schatten) und das Motiv für das Detailbild."""
    alpha = frei.getchannel("A").point(lambda v: 0 if v < 20 else v)  # Reste unter 8 % weg
    frei = frei.copy()
    frei.putalpha(alpha)
    bw, bh = frei.size
    box = alpha.getbbox()
    if not box:
        raise SystemExit("kein Motiv")
    # Motiv berührt den Bildrand: dort ist es angeschnitten und bleibt bündig
    if oben is None and box[1] <= 2:
        oben = 0
    if unten is None and box[3] >= bh - 2:
        unten = bh
    t = max(0, round(oben)) if oben is not None else box[1]
    b = min(bh, round(unten)) if unten is not None else box[3]
    band = alpha.crop((0, t, bw, b)).getbbox()
    if not band:
        raise SystemExit("Schnitt leer")
    l, r = band[0], band[2]
    mt = 0 if oben is not None else RAND
    mb = 0 if unten is not None else RAND
    fh = (b - t) / (1 - mt - mb)
    fw = fh * 3 / 4
    if (r - l) > fw * (1 - 2 * RAND):  # zu breit: Rahmen wächst, unten wird mehr gezeigt
        fw = (r - l) / (1 - 2 * RAND)
        fh = fw * 4 / 3
        if unten is not None:
            b = min(bh, round(t + fh * (1 - mt)))
            if b >= bh - 2:
                unten = None
    x0 = (l + r) / 2 - fw / 2
    if oben is not None:
        y0 = t
    elif unten is not None:
        y0 = b - fh
    else:
        y0 = (t + b) / 2 - fh / 2
    # Bereiche außerhalb des Schnitts (Kopf, Beine) ausblenden
    maske = Image.new("L", frei.size, 0)
    maske.paste(alpha.crop((0, t, bw, b)), (0, t))
    frei.putalpha(maske)
    rahmen = frei.crop((round(x0), round(y0), round(x0 + fw), round(y0 + fh))).resize((W, H), Image.LANCZOS)
    bild = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    # weicher Schlagschatten: Maske etwas tiefer, stark weichgezeichnet, 16 % Deckkraft
    m = Image.new("L", (W, H), 0)
    m.paste(rahmen.getchannel("A"), (0, round(H * 0.012)))
    m = m.filter(ImageFilter.GaussianBlur(H * 0.016)).point(lambda v: round(v * 0.16))
    bild = Image.composite(Image.new("RGBA", (W, H), (20, 24, 32, 255)), bild, m)
    bild.alpha_composite(rahmen)
    motiv = frei.crop((l, t, r, b))
    return bild.convert("RGB"), motiv


def detailbild(motiv: Image.Image, fokus: tuple[float, float], zoom: float) -> Image.Image:
    mw, mh = motiv.size
    basis = max(mw / 3, mh / 4)
    cw, ch = basis * 3 / zoom, basis * 4 / zoom
    passt = min(1, mw / cw, mh / ch)  # breite oder flache Motive: Ausschnitt bleibt im Motiv
    cw, ch = cw * passt, ch * passt
    cx, cy = fokus[0] * mw, fokus[1] * mh
    l = min(max(0, cx - cw / 2), max(0, mw - cw))
    t = min(max(0, cy - ch / 2), max(0, mh - ch))
    weiss = Image.new("RGBA", motiv.size, (255, 255, 255, 255))
    weiss.alpha_composite(motiv)
    return weiss.crop((round(l), round(t), round(l + cw), round(t + ch))).convert("RGB").resize((W, H), Image.LANCZOS)


def speichern(bild: Image.Image, name: str) -> None:
    bild.save(AUS / f"{name}.webp", "WEBP", quality=84, method=6)
    bild.resize((480, 640), Image.LANCZOS).save(AUS / f"{name}-480.webp", "WEBP", quality=82, method=6)


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    originale = Path(sys.argv[1])
    nur = set(sys.argv[2:])
    fotos = json.loads((HIER / "fotos.json").read_text())
    with tempfile.TemporaryDirectory() as tmp:
        swift_bin = Path(tmp) / "freisteller"
        subprocess.run(["swiftc", "-O", str(HIER / "freisteller.swift"), "-o", str(swift_bin)], check=True)
        for f in fotos:
            uid = str(f["uid"])
            if nur and uid not in nur:
                continue
            ein = originale / f"{uid}.jpg"
            if not ein.exists():  # Original fehlt: in 2400 px Breite vom Unsplash-Bildserver holen
                originale.mkdir(parents=True, exist_ok=True)
                urllib.request.urlretrieve(f"https://images.unsplash.com/{f['bild']}?w=2400&q=90&fm=jpg", ein)
            if f.get("ausschnitt") or f.get("retusche"):
                orig = Image.open(ein).convert("RGB")
                if f.get("retusche"):
                    orig = retuschieren(orig, f["retusche"])
                if f.get("ausschnitt"):
                    l, t, r, b = f["ausschnitt"]
                    orig = orig.crop((round(l * orig.width), round(t * orig.height), round(r * orig.width), round(b * orig.height)))
                ein = Path(tmp) / f"{uid}-vor.jpg"
                orig.save(ein, quality=95)
            png = Path(tmp) / f"{uid}.png"
            meta = freistellen(swift_bin, ein, png, f.get("instanzen"))
            frei = Image.open(png).convert("RGBA")
            if f.get("radieren"):
                frei = radieren(frei, f["radieren"])
            oben = unten = None
            if f.get("person"):
                schnitt = f.get("schnitt", SCHNITT.get(f["gruppe"], "oben"))
                oben, unten = schnittlinien(meta, schnitt, frei.height)
            haupt, motiv = komponieren(frei, oben, unten)
            fokus, zoom = DETAIL[f["gruppe"]]
            fokus = tuple(f.get("fokus", fokus))
            zoom = f.get("zoom", zoom)
            speichern(haupt, f"demo-{uid}-1")
            speichern(detailbild(motiv, fokus, zoom), f"demo-{uid}-2")
            print(f"{uid}: ok ({motiv.width}×{motiv.height}{', Person' if f.get('person') else ''})")

    # Bildnachweis (Impressum)
    pfad = ROOT / "src" / "content" / "bildnachweis.json"
    nachweis = json.loads(pfad.read_text())
    nachweis["artikelfotos"] = [
        {"datei": f"public/demo-fotos/demo-{f['uid']}-{n}.webp", "fotograf": f["fotograf"], "quelle": f"https://unsplash.com/photos/{f['unsplashId']}"}
        for f in fotos
        for n in (1, 2)
    ]
    pfad.write_text(json.dumps(nachweis, ensure_ascii=False, indent=2) + "\n")
    print(f"Bildnachweis: {len(nachweis['artikelfotos'])} Einträge")


if __name__ == "__main__":
    main()
