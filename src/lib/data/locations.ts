import { US_STATE_TILES } from "#src/lib/geo/states.js";
import { loadAgencySummaries } from "./agencies.js";
import type { AgencySummary } from "./types.js";

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

const compareLabel = (left: string, right: string) =>
  collator.compare(left, right);

const isAllCapsLabel = (value: string) =>
  /[A-Z]/.test(value) && value === value.toUpperCase();

export type PlaceRollup = {
  agencies: AgencySummary[];
  agencyCount: number;
  administrativeArea: string;
  administrativeAreaKind: string;
  administrativeAreaSlug: string;
  civilCaseCount: number;
  path: string;
  place: string;
  placeSlug: string;
  reportCount: number;
  state: string;
  stateLabel: string;
};

export type AdministrativeAreaRollup = {
  administrativeArea: string;
  administrativeAreaKind: string;
  administrativeAreaSlug: string;
  agencies: AgencySummary[];
  agencyCount: number;
  civilCaseCount: number;
  path: string;
  places: PlaceRollup[];
  reportCount: number;
  state: string;
  stateLabel: string;
};

export type StateRollup = {
  administrativeAreas: AdministrativeAreaRollup[];
  administrativeAreaPlural: string;
  agencies: AgencySummary[];
  agencyCount: number;
  civilCaseCount: number;
  path: string;
  reportCount: number;
  state: string;
  stateLabel: string;
};

const stateLabelFor = (state: string) => {
  const lower = state.toLowerCase();
  if (lower === "federal") {
    return "Federal";
  }
  return (
    US_STATE_TILES.find((entry) => entry.code.toLowerCase() === lower)?.name ||
    state.toUpperCase()
  );
};

const summarizeAgencies = (agencies: AgencySummary[]) => ({
  agencyCount: agencies.length,
  civilCaseCount: agencies.reduce(
    (total, agency) => total + agency.civilCaseCount,
    0,
  ),
  reportCount: agencies.reduce(
    (total, agency) => total + agency.reportCount,
    0,
  ),
});

const administrativeAreaKindFor = (name: string) => {
  if (name.endsWith("City and Borough")) return "City and Borough";
  if (name.endsWith("Census Area")) return "Census Area";
  if (name.endsWith("County")) return "County";
  if (name.endsWith("Parish")) return "Parish";
  if (name.endsWith("Borough")) return "Borough";
  if (name.endsWith("Municipio")) return "Municipio";
  if (name.endsWith("City")) return "City";
  if (name === "District of Columbia") return "District";
  throw new Error(`Unsupported county-equivalent label: ${name}`);
};

const administrativeAreaPluralFor = (kind: string) => {
  if (kind === "City and Borough") return "Cities and Boroughs";
  if (kind === "Census Area") return "Census Areas";
  if (kind === "County") return "Counties";
  if (kind === "Parish") return "Parishes";
  if (kind === "Borough") return "Boroughs";
  if (kind === "Municipio") return "Municipios";
  if (kind === "City") return "Cities";
  if (kind === "District") return "Districts";
  throw new Error(`Unsupported county-equivalent kind: ${kind}`);
};

const administrativeAreaPluralForState = (
  administrativeAreas: AdministrativeAreaRollup[],
) => {
  const labels = [
    ...new Set(
      administrativeAreas.map((area) =>
        administrativeAreaPluralFor(area.administrativeAreaKind),
      ),
    ),
  ];
  return labels.join(" and ");
};

const requireLocation = (agency: AgencySummary) => {
  if (
    !agency.category ||
    !agency.administrativeArea ||
    !agency.administrativeAreaSlug ||
    !agency.city ||
    !agency.placeSlug
  ) {
    throw new Error(
      `Agency ${agency.id} is missing required location fields for place-first navigation`,
    );
  }
};

export const loadLocationRollups = async () => {
  const agencies = await loadAgencySummaries();

  for (const agency of agencies) {
    requireLocation(agency);
  }

  const states = new Map<string, StateRollup>();

  for (const agency of agencies) {
    const state = agency.category.toLowerCase();
    const stateLabel = stateLabelFor(state);
    let stateRollup = states.get(state);

    if (!stateRollup) {
      stateRollup = {
        state,
        stateLabel,
        path: `/${state}/`,
        agencies: [],
        administrativeAreas: [],
        administrativeAreaPlural: "",
        agencyCount: 0,
        civilCaseCount: 0,
        reportCount: 0,
      };
      states.set(state, stateRollup);
    }

    stateRollup.agencies.push(agency);

    let administrativeArea = stateRollup.administrativeAreas.find(
      (entry) => entry.administrativeAreaSlug === agency.administrativeAreaSlug,
    );

    if (!administrativeArea) {
      const administrativeAreaName = agency.administrativeArea!;
      administrativeArea = {
        state,
        stateLabel,
        administrativeArea: administrativeAreaName,
        administrativeAreaKind: administrativeAreaKindFor(
          administrativeAreaName,
        ),
        administrativeAreaSlug: agency.administrativeAreaSlug!,
        path: `/${state}/${agency.administrativeAreaSlug}/`,
        agencies: [],
        places: [],
        agencyCount: 0,
        civilCaseCount: 0,
        reportCount: 0,
      };
      stateRollup.administrativeAreas.push(administrativeArea);
    }

    administrativeArea.agencies.push(agency);

    let place = administrativeArea.places.find(
      (entry) => entry.placeSlug === agency.placeSlug,
    );

    if (!place) {
      place = {
        state,
        stateLabel,
        administrativeArea: agency.administrativeArea!,
        administrativeAreaKind: administrativeArea.administrativeAreaKind,
        administrativeAreaSlug: agency.administrativeAreaSlug!,
        place: agency.city!,
        placeSlug: agency.placeSlug!,
        path: `/${state}/${agency.administrativeAreaSlug}/${agency.placeSlug}/`,
        agencies: [],
        agencyCount: 0,
        civilCaseCount: 0,
        reportCount: 0,
      };
      administrativeArea.places.push(place);
    } else if (
      isAllCapsLabel(place.place) &&
      agency.city &&
      !isAllCapsLabel(agency.city)
    ) {
      place.place = agency.city;
    }

    place.agencies.push(agency);
  }

  for (const state of states.values()) {
    Object.assign(state, summarizeAgencies(state.agencies));
    state.administrativeAreaPlural = administrativeAreaPluralForState(
      state.administrativeAreas,
    );
    state.agencies.sort((a, b) => compareLabel(a.name, b.name));
    state.administrativeAreas.sort((a, b) =>
      compareLabel(a.administrativeArea, b.administrativeArea),
    );

    for (const administrativeArea of state.administrativeAreas) {
      Object.assign(
        administrativeArea,
        summarizeAgencies(administrativeArea.agencies),
      );
      administrativeArea.agencies.sort((a, b) => compareLabel(a.name, b.name));
      administrativeArea.places.sort((a, b) => compareLabel(a.place, b.place));

      for (const place of administrativeArea.places) {
        Object.assign(place, summarizeAgencies(place.agencies));
        place.agencies.sort((a, b) => compareLabel(a.name, b.name));
      }
    }
  }

  return [...states.values()].sort((a, b) =>
    compareLabel(a.stateLabel, b.stateLabel),
  );
};

export const loadStateRollup = async (state: string) => {
  const rollups = await loadLocationRollups();
  return rollups.find((entry) => entry.state === state.toLowerCase()) || null;
};

export const loadAdministrativeAreaRollup = async (
  state: string,
  administrativeArea: string,
) => {
  const stateRollup = await loadStateRollup(state);
  return (
    stateRollup?.administrativeAreas.find(
      (entry) =>
        entry.administrativeAreaSlug === administrativeArea.toLowerCase(),
    ) || null
  );
};

export const loadPlaceRollup = async (
  state: string,
  administrativeArea: string,
  place: string,
) => {
  const administrativeAreaRollup = await loadAdministrativeAreaRollup(
    state,
    administrativeArea,
  );
  return (
    administrativeAreaRollup?.places.find(
      (entry) => entry.placeSlug === place.toLowerCase(),
    ) || null
  );
};
