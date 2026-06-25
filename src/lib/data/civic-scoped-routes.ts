import {
  loadLocationBuildPayloads,
  type LocationPagePayload,
} from "#src/lib/data/build-payloads.js";
import type {
  CivicIndexLevel,
  CivicScopedTopicKind,
} from "#src/lib/data/civic-index.js";
import { hasCivicScopedTopicData } from "#src/lib/data/civic-index.js";

export const loadStateScopedPaths = async () => {
  const locations = await loadLocationBuildPayloads();
  return locations
    .filter(
      (location) =>
        location.level === "state" &&
        ((location.children?.length ?? 0) > 0 ||
          (location.locationReports?.length ?? 0) > 0),
    )
    .map((state) => ({
      params: { category: state.state },
    }));
};

export const loadStateScopedPathsForTopic = async (
  kind: CivicScopedTopicKind,
) => {
  const locations = await loadLocationBuildPayloads();
  return locations
    .filter(
      (location) =>
        location.level === "state" &&
        hasCivicScopedTopicData(location.coverage, kind),
    )
    .map((state) => ({
      params: { category: state.state },
    }));
};

export const loadRequiredLocationByPath = async (
  path: string,
  expectedLevel: CivicIndexLevel,
) => {
  const locations = await loadLocationBuildPayloads();
  const location = locations.find((candidate) => candidate.path === path);

  if (!location) {
    throw new Error(`Missing required location payload for path: ${path}`);
  }

  if (location.level !== expectedLevel) {
    throw new Error(
      `Expected ${expectedLevel} location payload for ${path}, received ${location.level}.`,
    );
  }

  return location;
};

export const loadAdministrativeAreaScopedPaths = async () => {
  const locations = await loadLocationBuildPayloads();
  return locations
    .filter((location) => location.level === "administrative_area")
    .map((area) => {
      const parts = getLocationParts(area, 2);
      return {
        params: {
          category: parts[0],
          administrativeArea: parts[1],
        },
      };
    });
};

export const loadAdministrativeAreaScopedPathsForTopic = async (
  kind: CivicScopedTopicKind,
) => {
  const locations = await loadLocationBuildPayloads();
  return locations
    .filter(
      (location) =>
        location.level === "administrative_area" &&
        hasCivicScopedTopicData(location.coverage, kind),
    )
    .map((area) => {
      const parts = getLocationParts(area, 2);
      return {
        params: {
          category: parts[0],
          administrativeArea: parts[1],
        },
      };
    });
};

export const loadPlaceScopedPaths = async () => {
  const locations = await loadLocationBuildPayloads();
  return locations
    .filter((location) => location.level === "place")
    .map((place) => {
      const parts = getLocationParts(place, 3);
      return {
        params: {
          category: parts[0],
          administrativeArea: parts[1],
          place: parts[2],
        },
      };
    });
};

export const loadPlaceScopedPathsForTopic = async (
  kind: CivicScopedTopicKind,
) => {
  const locations = await loadLocationBuildPayloads();
  return locations
    .filter(
      (location) =>
        location.level === "place" &&
        hasCivicScopedTopicData(location.coverage, kind),
    )
    .map((place) => {
      const parts = getLocationParts(place, 3);
      return {
        params: {
          category: parts[0],
          administrativeArea: parts[1],
          place: parts[2],
        },
      };
    });
};

const getLocationParts = (location: LocationPagePayload, expected: number) => {
  const parts = location.path.split("/").filter(Boolean);

  if (parts.length !== expected) {
    throw new Error(
      `Malformed ${location.level} path for scoped route params: ${location.path}`,
    );
  }

  return parts;
};
