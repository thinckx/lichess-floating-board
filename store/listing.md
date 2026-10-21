# Chrome Web Store — winkelvermelding

Kopieer per veld in het Developer Dashboard. Engels is de standaardtaal; Nederlands toevoegen als extra taal.

## Store listing

**Naam:** Floating Board for Lichess (NL: Zwevend bord voor Lichess — komt automatisch uit `_locales`)

**Categorie:** Fun / Games  *(alternatief: Productivity)*

**Korte beschrijving** (komt uit `_locales`, max. 132 tekens)
- EN: Play your ongoing Lichess game in a small always-on-top window while you work in other apps.
- NL: Speel je lopende Lichess-partij in een klein venster dat altijd bovenaan blijft, terwijl je in andere apps werkt.

### Uitgebreide beschrijving — EN

```
Playing a slow or correspondence game on Lichess while you work? Floating Board for Lichess puts the board, both clocks and the player names of your ongoing game in a small window that stays on top of every other app. Make your moves without switching tabs.

HOW IT WORKS
• Open a game you are playing on lichess.org.
• Click the "Float board" button (bottom right) or press Alt+P.
• The board moves into a floating window. Click or drag to move, just like on Lichess.
• Close the window and everything returns to the Lichess tab.

FAIR PLAY
This extension only changes where the board is shown. It contains no engine, no analysis and no move suggestions, and it does not read or send any game data. Lichess itself keeps running the game.

PRIVACY
No data is collected, stored remotely or sent anywhere. The only thing saved is the size of the floating window, locally in your browser.

REQUIREMENTS
Chrome or Edge version 116 or newer (Document Picture-in-Picture).

Floating Board for Lichess is an independent project and is not affiliated with or endorsed by lichess.org.
```

### Uitgebreide beschrijving — NL

```
Speel je een trage of correspondentiepartij op Lichess naast je werk? Zwevend bord voor Lichess zet het bord, beide klokken en de spelersnamen van je lopende partij in een klein venster dat boven alle andere apps blijft staan. Je speelt je zetten zonder van tab te wisselen.

HOE HET WERKT
• Open een partij die je speelt op lichess.org.
• Klik op de knop "Zwevend bord" (rechtsonder) of druk op Alt+P.
• Het bord verhuist naar een zwevend venster. Klik of sleep om te zetten, net als op Lichess.
• Sluit het venster en alles keert terug naar het Lichess-tabblad.

FAIR PLAY
De extensie verandert alleen waar het bord getoond wordt. Er zit geen engine, analyse of zetsuggestie in, en er worden geen partijgegevens gelezen of verstuurd. Lichess blijft zelf de partij aansturen.

PRIVACY
Er worden geen gegevens verzameld, extern opgeslagen of verstuurd. Alleen de grootte van het zwevende venster wordt lokaal in je browser bewaard.

VEREISTEN
Chrome of Edge versie 116 of nieuwer (Document Picture-in-Picture).

Zwevend bord voor Lichess is een onafhankelijk project en is niet verbonden aan of goedgekeurd door lichess.org.
```

### Afbeeldingen

| Veld | Bestand | Status |
| --- | --- | --- |
| Store-icoon 128×128 | `icons/icon128.png` | klaar |
| Kleine promotegel 440×280 | `store/promo-440x280.png` | klaar |
| Screenshots 1280×800 (min. 1, max. 5) | — | **zelf maken** op een echte partij: PiP-venster naast bv. VS Code of Outlook |

## Privacy practices

**Single purpose**
> Shows the board and clocks of the user's ongoing Lichess game in a floating always-on-top window, so they can keep playing while using other apps.

**Permission justification**
- `storage`: Remembers the size of the Picture-in-Picture window between sessions. Stored locally only.
- Host access `https://lichess.org/*` (content script): Needed to add the "Float board" button to the Lichess game page and move the board into the floating (Document Picture-in-Picture) window. No other sites are accessed.

**Remote code:** No, I am not using remote code.

**Data usage:** vink niets aan bij de datacategorieën (geen enkele wordt verzameld). Vink de drie certificeringen aan:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** `https://thinckx.github.io/lichess-floating-board/privacy.html` (GitHub Pages, bron: map `docs/` op `main`).

## Distributie

- Zichtbaarheid: eerst **Unlisted**, na een paar testers **Public**.
- Regio's: alle.
- Pakket: `./scripts/package.sh` → `dist/floating-board-for-lichess-<versie>.zip`. Verhoog `version` in `manifest.json` bij elke update.
