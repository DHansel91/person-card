# Person Status Card

[![Validate](https://github.com/DHansel91/person-card/actions/workflows/validate.yml/badge.svg)](https://github.com/DHansel91/person-card/actions/workflows/validate.yml)
[![Release](https://img.shields.io/github/v/release/DHansel91/person-card?sort=semver)](https://github.com/DHansel91/person-card/releases)
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)

Lovelace-Card für Home Assistant, die für eine oder mehrere Personen den
Aufenthaltsstatus, den Batteriestand des Geräts, die voraussichtliche Ankunftszeit
(ETA) und die aktuelle Zone anzeigt.

## Features

- Anzeige mehrerer Personen in einer Card
- Avatar mit farbigem Status-Ring je nach Zone (Zuhause, Unterwegs …)
- Batterieanzeige mit Ladebalken und Lade-Indikator (⚡)
- ETA-Anzeige bis Zuhause (wird ausgeblendet, wenn die Person zuhause ist)
- Layout-Option: **Horizontal** oder **Vertikal**
- Visual Editor zur Konfiguration (Personen hinzufügen/entfernen)

## Installation

### HACS (empfohlen)

[![Open Person Card in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=DHansel91&repository=person-card&category=plugin)

1. HACS → **Frontend** → ⋮ → **Custom repositories**
2. Repository-URL `https://github.com/DHansel91/person-card` eintragen, Kategorie **Lovelace/Plugin**
3. „Person Status Card" installieren

### Manuell

1. `person-status-card.js` nach `config/www/person-status-card/` kopieren
2. In Home Assistant → **Einstellungen → Dashboards → Ressourcen** hinzufügen:
   - URL: `/local/person-status-card/person-status-card.js`
   - Typ: **JavaScript-Modul**

## Konfiguration

| Option    | Typ    | Standard       | Beschreibung                              |
| --------- | ------ | -------------- | ----------------------------------------- |
| `type`    | string | –              | `custom:person-status-card`               |
| `layout`  | string | `"horizontal"` | Anordnung: `horizontal` oder `vertical`   |
| `persons` | list   | `[]`           | Liste der anzuzeigenden Personen          |

### Optionen je Person

| Option            | Typ    | Beschreibung                                          |
| ----------------- | ------ | ----------------------------------------------------- |
| `entity`          | string | Person-Entity (`person.*`)                            |
| `label`           | string | Anzeigename (optional, sonst Friendly Name)           |
| `battery_entity`  | string | Batterie-Sensor (`sensor.*`, optional)                |
| `home_eta_entity` | string | Sensor mit ETA bis Zuhause in Minuten (optional)      |

### Beispiel

```yaml
type: custom:person-status-card
layout: horizontal
persons:
  - entity: person.max
    label: Max
    battery_entity: sensor.max_handy_akku
    home_eta_entity: sensor.max_eta_home
  - entity: person.anna
    label: Anna
    battery_entity: sensor.anna_handy_akku
```

## Lizenz

[MIT](LICENSE)
