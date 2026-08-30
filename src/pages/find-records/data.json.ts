import type { APIRoute } from "astro";
import { loadAgencyFinderResults } from "#src/lib/data/agencies.js";
import { loadFederalAgencySummaries } from "#src/lib/data/federal-agencies.js";
import { loadLocationBuildPayloads } from "#src/lib/data/build-payloads.js";

// The record-finder dataset (~1MB) is served as a standalone static JSON file
// rather than inlined into find-records/index.html. The page fetches it lazily
// on first interaction, so the initial HTML stays small and the payload only
// downloads (gzipped, cacheable) when someone actually searches. Built to
// /find-records/data.json.
export const GET: APIRoute = async () => {
  const [locations, federalAgencies, agencies] = await Promise.all([
    loadLocationBuildPayloads(),
    loadFederalAgencySummaries(),
    loadAgencyFinderResults(),
  ]);

  const places = locations
    .filter((location) => location.level === "place")
    .map((place) => ({
      href: place.path,
      label: [place.displayName, place.administrativeArea, place.stateLabel]
        .filter(Boolean)
        .join(", "),
      meta: `${place.agencies?.length ?? 0} ${
        (place.agencies?.length ?? 0) === 1 ? "agency" : "agencies"
      } in the record`,
      searchText: [
        place.displayName,
        place.administrativeArea,
        place.administrativeAreaSlug,
        place.state,
        place.stateLabel,
      ]
        .filter(Boolean)
        .join(" "),
    }));

  const agencyResults = agencies.map((agency) => ({
    href: agency.canonicalPath,
    label: agency.name,
    meta: [agency.city, agency.administrativeArea, agency.state]
      .filter(Boolean)
      .join(", "),
    searchText: [
      agency.name,
      agency.city,
      agency.administrativeArea,
      agency.state,
      agency.zipCode,
      agency.canonicalPath,
    ]
      .filter(Boolean)
      .join(" "),
  }));

  const federalAgencyResults = federalAgencies.map((agency) => ({
    href: agency.path,
    label: agency.name,
    meta: `${agency.branchCount} ${
      agency.branchCount === 1 ? "location" : "locations"
    } in the record`,
    searchText: agency.name,
  }));

  const finderGroups = [
    { type: "place", label: "Places", results: places },
    { type: "agency", label: "Agencies", results: agencyResults },
    {
      type: "federal-agency",
      label: "Federal agencies",
      results: federalAgencyResults,
    },
  ];

  return new Response(JSON.stringify(finderGroups), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
