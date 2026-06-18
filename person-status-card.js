/**
 * Person Status Card für Home Assistant
 * Zeigt Status, Batterie, ETA und Zone für eine oder mehrere Personen.
 *
 * Installation: www/person-status-card/person-status-card.js
 *
 * v1.2.0 – Layout-Option: Horizontal / Vertikal
 */

const CARD_VERSION = "1.2.0";

// LitElement aus dem bereits geladenen HA-Frontend beziehen (kein Build-Step nötig)
const LitElement =
  window.LitElement ||
  Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace") || customElements.get("hui-view")
  );
const html = LitElement.prototype.html;
const css  = LitElement.prototype.css;

// ha-form sicherstellen
const loadHaComponents = async () => {
  if (customElements.get("ha-form")) return;
  try {
    if (window.loadCardHelpers) {
      const helpers = await window.loadCardHelpers();
      const card = helpers.createCardElement({ type: "entities", entities: [] });
      await card?.constructor?.getConfigElement?.();
    }
  } catch (e) {
    console.warn("Person-Status-Card: ha-form konnte nicht vorgeladen werden", e);
  }
};
loadHaComponents();

const DEFAULTS = {
  persons: [],
};


/**
 * Normalisiert persons: Array bleibt Array,
 * Objekt mit numerischen Keys (ha-form expandable Bug) wird in Array umgewandelt.
 */
function normalizePersons(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    return Object.keys(raw)
      .filter((k) => !isNaN(k))
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => raw[k]);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Visual Editor (ha-form)
// ---------------------------------------------------------------------------

class PersonStatusCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: { state: true } };
  }

  setConfig(config) {
    this._config = { ...DEFAULTS, ...config, persons: normalizePersons(config?.persons) };
  }

  _fire(config) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config }, bubbles: true, composed: true,
    }));
  }

  _personSchema(index) {
    return [
      { name: `entity_${index}`,           selector: { entity: { domain: "person" } } },
      { name: `label_${index}`,            selector: { text: {} } },
      { name: `battery_entity_${index}`,   selector: { entity: { domain: "sensor", device_class: "battery" } } },
      { name: `home_eta_entity_${index}`,  selector: { entity: { domain: "sensor" } } },
    ];
  }

  _computeLabel = (schema) => {
    const map = {
      entity: "Person (person.*)", label: "Anzeigename",
      battery_entity: "Batterie-Sensor", home_eta_entity: "ETA Zuhause (min)",
    };
    return map[schema.name.replace(/_\d+$/, "")] ?? schema.name;
  };

  _addPerson() {
    const persons = [...(this._config.persons || []), { entity: "", label: "", battery_entity: "", home_eta_entity: "" }];
    const config = { ...this._config, persons };
    this._config = config;
    this._fire(config);
  }

  _removePerson(index) {
    const persons = (this._config.persons || []).filter((_, i) => i !== index);
    const config = { ...this._config, persons };
    this._config = config;
    this._fire(config);
  }

  _renderPersonEditor(person, index) {
    const data = {
      [`entity_${index}`]:           person.entity           || "",
      [`label_${index}`]:            person.label            || "",
      [`battery_entity_${index}`]:   person.battery_entity   || "",
      [`home_eta_entity_${index}`]:  person.home_eta_entity  || "",
    };
    return html`
      <div class="person-editor">
        <div class="person-editor-header">
          <span>Person ${index + 1}${person.label ? ` – ${person.label}` : ""}</span>
          <ha-icon-button @click=${() => this._removePerson(index)} title="Entfernen">
            <ha-icon icon="mdi:delete"></ha-icon>
          </ha-icon-button>
        </div>
        <ha-form
          .hass=${this.hass}
          .data=${data}
          .schema=${this._personSchema(index)}
          .computeLabel=${this._computeLabel}
          @value-changed=${(ev) => {
            ev.stopPropagation();
            const v = ev.detail.value;
            const updated = {
              entity:          v[`entity_${index}`]           ?? person.entity,
              label:           v[`label_${index}`]            ?? person.label,
              battery_entity:  v[`battery_entity_${index}`]   ?? person.battery_entity,
              home_eta_entity: v[`home_eta_entity_${index}`]  ?? person.home_eta_entity,
            };
            const persons = (this._config.persons || []).map((p, i) => i === index ? updated : p);
            const config = { ...this._config, persons };
            this._config = config;
            this._fire(config);
          }}
        ></ha-form>
      </div>
    `;
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const persons = this._config.persons || [];
    return html`
      <div class="editor-root">
        <ha-form
          .hass=${this.hass}
          .data=${{ layout: this._config.layout || "horizontal" }}
          .schema=${[{
            name: "layout",
            selector: { select: { mode: "dropdown", options: [
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical",   label: "Vertikal" },
            ]}},
          }]}
          .computeLabel=${() => "Anordnung"}
          @value-changed=${(ev) => {
            ev.stopPropagation();
            const config = { ...this._config, layout: ev.detail.value.layout };
            this._config = config;
            this._fire(config);
          }}
        ></ha-form>
        ${persons.map((p, i) => this._renderPersonEditor(p, i))}
        <mwc-button raised label="Person hinzufügen" @click=${this._addPerson}>
          <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
        </mwc-button>
      </div>
    `;
  }

  static get styles() {
    return css`
      .editor-root { display:flex; flex-direction:column; gap:12px; padding:4px 0; }
      .person-editor { border:1px solid var(--divider-color,rgba(0,0,0,0.12)); border-radius:8px; overflow:hidden; }
      .person-editor-header { display:flex; align-items:center; justify-content:space-between; padding:6px 8px 6px 16px; background:var(--secondary-background-color,#f5f5f5); font-size:13px; font-weight:600; color:var(--primary-text-color); }
      ha-form { padding:8px 12px 4px; display:block; }
      mwc-button { align-self:flex-start; }
    `;
  }
}

customElements.define("person-status-card-editor", PersonStatusCardEditor);

// ---------------------------------------------------------------------------
// Main Card
// ---------------------------------------------------------------------------

class PersonStatusCard extends LitElement {
  static get properties() {
    return { hass: {}, _config: { state: true } };
  }

  static getConfigElement() {
    return document.createElement("person-status-card-editor");
  }

  static getStubConfig() {
    return {
      persons: [
        {
          entity: "person.example",
          label: "Beispiel",
          battery_entity: "",
          home_eta_entity: "",
        },
      ],
    };
  }

  setConfig(config) {
    this._config = { ...DEFAULTS, ...config, persons: normalizePersons(config?.persons) };
  }

  getCardSize() {
    return 2;
  }

  // Sections-Dashboard (HA 2024.x+)
  getGridOptions() {
    return { columns: 12, min_columns: 6, min_rows: 2 };
  }

  // ---- Helpers ----

  _zoneColor(state, zoneCfg) {
    const s = (state || "").toLowerCase();
    const c = zoneCfg || {};
    if (s === "home")                      return c.home     || "#4CAF50";
    if (s === "not_home" || s === "away")  return c.not_home || "#F44336";
    return c[s] || c.default || "#9E9E9E";
  }

  _batteryBarColor(pct) {
    const p = parseInt(pct, 10);
    if (isNaN(p)) return "#9E9E9E";
    if (p > 50)  return "#4CAF50";
    if (p > 20)  return "#FF9800";
    return "#F44336";
  }

  _zoneLabel(state) {
    if (!state) return "Unbekannt";
    const s = state.toLowerCase();
    if (s === "home")                     return "Zuhause";
    if (s === "not_home" || s === "away") return "Unterwegs";
    return state.charAt(0).toUpperCase() + state.slice(1);
  }

  // ---- Render helpers ----

  _renderBatteryRow(batteryEntity) {
    if (!batteryEntity) return "";
    const pct        = Math.round(parseFloat(batteryEntity.state));
    const isCharging = batteryEntity.attributes?.battery_charging || false;
    const barColor   = this._batteryBarColor(pct);

    const icon = isCharging
      ? html`<svg viewBox="0 0 24 24" width="16" height="16" class="row-icon charging-icon">
               <path fill="currentColor" d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33C16.4 22 17 21.4 17 20.67V5.33C17 4.6 16.4 4 15.67 4zM13 18h-2v-2h2v2zm0-4h-2V9h2v5z"/>
             </svg>`
      : html`<svg viewBox="0 0 24 24" width="16" height="16" class="row-icon">
               <path fill="currentColor" d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33C16.4 22 17 21.4 17 20.67V5.33C17 4.6 16.4 4 15.67 4zm-2.67 14h-2v-2h2v2zm0-4h-2V9h2v5z"/>
             </svg>`;

    return html`
      <div class="info-row">
        ${icon}
        <div class="battery-bar-wrap">
          <div class="battery-bar" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <span class="info-value">${pct}%${isCharging ? " ⚡" : ""}</span>
      </div>
    `;
  }

  _renderEtaRow(etaEntity, isHome) {
    if (!etaEntity || isHome) return "";
    const eta = etaEntity.state;
    return html`
      <div class="info-row">
        <svg viewBox="0 0 24 24" width="16" height="16" class="row-icon">
          <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <span class="info-value">${eta} min</span>
      </div>
    `;
  }

  _renderZoneRow(state) {
    return html`
      <div class="info-row">
        <svg viewBox="0 0 24 24" width="16" height="16" class="row-icon">
          <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
        </svg>
        <span class="info-value zone-label">${this._zoneLabel(state)}</span>
      </div>
    `;
  }

  _renderPerson(cfg) {
    const personEntity  = this.hass?.states[cfg.entity];
    const batteryEntity = cfg.battery_entity  ? this.hass?.states[cfg.battery_entity]  : null;
    const etaEntity     = cfg.home_eta_entity ? this.hass?.states[cfg.home_eta_entity] : null;

    if (!personEntity) {
      return html`<div class="error-row">⚠ Entity nicht gefunden: ${cfg.entity}</div>`;
    }

    const state   = personEntity.state || "unknown";
    const label   = cfg.label || personEntity.attributes.friendly_name || cfg.entity;
    const picture = personEntity.attributes.entity_picture;
    const isHome  = state.toLowerCase() === "home";

    const ringColor = this._zoneColor(state, cfg.zone_colors);

    const avatar = picture
      ? html`<img src="${picture}" alt="${label}" class="avatar-img" />`
      : html`<div class="avatar-initials">${(label).charAt(0).toUpperCase()}</div>`;

    const layout = this._config.layout || "horizontal";
    return html`
      <div class="person-card ${layout}">
        <div class="avatar-wrap">
          <div class="avatar-ring" style="border-color:${ringColor};box-shadow:0 0 0 3px ${ringColor}33">
            ${avatar}
          </div>
          <div class="status-dot" style="background:${ringColor}"></div>
        </div>
        <div class="person-info">
          <div class="person-name">${label}</div>
          <div class="stats-row">
            ${this._renderBatteryRow(batteryEntity)}
            ${this._renderEtaRow(etaEntity, isHome)}
            ${this._renderZoneRow(state)}
          </div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.hass || !this._config) return html``;

    return html`
      <ha-card>
        <div class="card-container ${this._config.layout || 'horizontal'}">
          ${(this._config.persons || []).length === 0 ? html`<div class="error-row">Bitte mindestens eine Person konfigurieren.</div>` : (this._config.persons || []).map((p) => this._renderPerson(p))}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        --pri: var(--primary-text-color, #212121);
        --sec: var(--secondary-text-color, #727272);
        --div: var(--divider-color, rgba(0,0,0,0.12));
        --bg2: var(--secondary-background-color, #f5f5f5);
      }

      ha-card { overflow: hidden; }

      /* ---- Container ---- */
      .card-container {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 12px;
      }

      /* ---- Person card – HORIZONTAL (default) ---- */
      .person-card {
        flex: 1 1 180px;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 14px;
        padding: 12px 14px;
        background: var(--bg2);
        border-radius: 12px;
        min-width: 160px;
      }

      /* ---- Person card – VERTICAL ---- */
      .person-card.vertical {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 16px 12px 12px;
        flex: 1 1 110px;
        min-width: 100px;
        gap: 8px;
      }

      /* Avatar */
      .avatar-wrap {
        position: relative;
        flex-shrink: 0;
      }

      .avatar-ring {
        width: 62px;
        height: 62px;
        border-radius: 50%;
        border: 3px solid transparent;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg2);
        transition: border-color 0.4s ease, box-shadow 0.4s ease;
      }

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      .avatar-initials {
        font-size: 24px;
        font-weight: 700;
        color: var(--pri);
      }

      .status-dot {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid var(--card-background-color, #fff);
        transition: background 0.4s ease;
      }

      /* Info block */
      .person-info {
        display: flex;
        flex-direction: column;
        gap: 5px;
        flex: 1;
        min-width: 0;
      }

      .vertical .person-info {
        align-items: center;
        flex: unset;
        width: 100%;
      }

      .person-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--pri);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Stats row: vertical = horizontal flex of individual items */
      .stats-row {
        display: contents; /* horizontal: items flow inline in person-info column */
      }

      .vertical .stats-row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px 10px;
      }

      /* Individual info-row */
      .info-row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 18px;
      }

      .vertical .info-row {
        flex-direction: column;
        align-items: center;
        gap: 2px;
        min-height: unset;
      }

      .row-icon {
        color: var(--sec);
        flex-shrink: 0;
        opacity: 0.75;
      }

      .charging-icon {
        color: #FF9800;
        opacity: 1;
      }

      .info-value {
        font-size: 12px;
        color: var(--sec);
        white-space: nowrap;
      }

      .vertical .info-value {
        font-size: 11px;
      }

      .zone-label {
        font-weight: 600;
        color: var(--pri);
      }

      /* Battery bar – hidden in vertical, show % only */
      .battery-bar-wrap {
        flex: 1;
        height: 5px;
        background: var(--div);
        border-radius: 3px;
        overflow: hidden;
        min-width: 28px;
        max-width: 48px;
      }

      .vertical .battery-bar-wrap {
        display: none;
      }

      .battery-bar {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease, background 0.5s ease;
      }

      .error-row {
        padding: 10px 16px;
        font-size: 12px;
        color: #e53935;
      }
    `;
  }
}

customElements.define("person-status-card", PersonStatusCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:             "person-status-card",
  name:             "Person Status Card",
  description:      "Zeigt Status, Batterie, ETA und Zone für eine oder mehrere Personen.",
  preview:          true,
  documentationURL: "https://github.com/DHansel91/person-card",
});

console.info(
  `%c PERSON-STATUS-CARD %c v${CARD_VERSION} `,
  "background:#4CAF50;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:700",
  "background:#444;color:#fff;padding:2px 6px;border-radius:0 4px 4px 0"
);