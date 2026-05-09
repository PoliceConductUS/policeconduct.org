# ADR 0006: Public URL Design

## Status

Proposed

## Date

2026-05-08

## Decision Owner

PoliceConduct.org

## Context

PoliceConduct.org needs public URLs that are understandable to users, useful for search engines, and stable enough to support long-lived references.

The site serves multiple user outcomes, including:

- finding policing information for a place;
- evaluating agency performance;
- understanding what happened in a police-public incident;
- reviewing personnel history across agencies;
- understanding video in context;
- researching civil litigation;
- tracking enforcement outcomes;
- submitting or correcting information.

The site also stores and relates multiple data entities, including:

- agencies;
- personnel;
- incidents;
- accounts;
- videos;
- civil cases;
- places;
- administrative areas;
- enforcement actions;
- criminal cases;
- outcomes.

Not every entity has the same natural public identity.

For example:

- an agency has an official address and belongs naturally under a place;
- personnel can work for multiple agencies and should not be tied to one agency URL;
- an incident usually has a primary place and date, but may involve multiple agencies;
- a civil case can involve multiple agencies, personnel, incidents, courts, and governments;
- a video can relate to multiple agencies, personnel, incidents, accounts, and cases.

The URL design should not force every entity under one agency or one place when that entity can naturally have multiple relationships.

## Decision

PoliceConduct.org will use a hybrid URL model:

1. Geography and agency pages use address-based paths.
2. Personnel, civil cases, and videos use top-level canonical entity paths.
3. Incidents use place/date/event paths.
4. Contextual collection pages may exist under geography, agency, personnel, and incident pages.
5. Canonical pages and contextual pages are connected by links, structured data, and canonical tags.
6. URLs should avoid implying a relationship that is not true.

## Core URL Shapes

### Geographic Pages

State or territory:

```txt
/{state-or-territory}/
```

Administrative area:

```txt
/{state-or-territory}/{administrative-area}/
```

Place:

```txt
/{state-or-territory}/{administrative-area}/{place}/
```

Examples:

```txt
/tx/
/tx/dallas-county/
/tx/dallas-county/irving/

/pr/
/pr/san-juan-municipio/
/pr/san-juan-municipio/san-juan/

/dc/
```

The term `administrative-area` is intentionally broader than `county`.

It may represent a county, parish, borough, municipio, district, island, or other administrative area appropriate to the state or territory.

### Agency Pages

Agency pages use the agency's official address location.

```txt
/{state-or-territory}/{administrative-area}/{place}/{agency-slug}/
```

Examples:

```txt
/tx/dallas-county/irving/irving-police-department/
/tx/dallas-county/dallas/dallas-county-sheriffs-office/
/mn/ramsey-county/st-paul/st-paul-police-department/
/pr/san-juan-municipio/san-juan/san-juan-police-department/
```

The agency URL is based on the agency's official address, not necessarily the full legal jurisdiction, service area, or operational footprint of the agency.

The agency page may display:

- official address;
- agency type;
- primary jurisdiction;
- service area;
- agencies related to it;
- personnel;
- incidents;
- videos;
- civil cases;
- transparency and data-quality information.

### Federal Agencies

Federal agencies receive a special namespace.

```txt
/federal/{federal-agency-slug}/
```

Examples:

```txt
/federal/fbi/
/federal/customs-and-border-protection/
/federal/united-states-marshals-service/
```

Federal branch offices, field offices, or local offices use the same address-based agency pattern as other agencies.

Examples:

```txt
/tx/dallas-county/dallas/fbi-dallas-field-office/
/mn/hennepin-county/minneapolis/fbi-minneapolis-field-office/
```

The database must support relationships between agencies.

Example:

```txt
/federal/fbi/
  parent agency

/tx/dallas-county/dallas/fbi-dallas-field-office/
  branch office
```

This relationship must be represented in the data model, not inferred solely from the URL.

## Canonical Entity URLs

### Personnel

Personnel pages are not scoped by geography or agency.

```txt
/personnel/{personnel-slug}/
```

Example:

```txt
/personnel/james-markham-v-7635c7/
```

This URL is stable across:

- agency changes;
- badge-number changes;
- rank changes;
- role changes;
- state changes;
- employment gaps;
- retirement;
- rehire.

Agency-scoped personnel pages may exist as contextual pages:

```txt
/{state-or-territory}/{administrative-area}/{place}/{agency-slug}/personnel/{personnel-slug}/
```

Example:

```txt
/tx/dallas-county/irving/irving-police-department/personnel/james-markham-v-7635c7/
```

The agency-scoped page means:

> records associated with this person while connected to this agency.

It is not the canonical cross-agency personnel page.

### Civil Cases

Civil cases are top-level canonical entities.

```txt
/civil-cases/{case-slug}/
```

Example:

```txt
/civil-cases/ndtx-3-25-cv-03329-lotts-v-city-of-irving/
```

A civil case should not be canonical under one agency because a civil case can involve multiple agencies, personnel, governments, courts, incidents, and claims.

Contextual civil-case collection pages may exist under agencies, personnel, incidents, places, or administrative areas.

Examples:

```txt
/tx/dallas-county/irving/irving-police-department/civil-cases/
/personnel/james-markham-v-7635c7/civil-cases/
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/civil-cases/
```

Those pages list or summarize related civil cases but do not replace the canonical civil-case URL.

### Videos

Videos are top-level canonical entities.

```txt
/videos/{video-slug}/
```

Example:

```txt
/videos/2023-12-04-irving-body-camera-v-789abc/
```

Video collection pages may exist under geography, agency, personnel, and incident pages.

Examples:

```txt
/videos/
/tx/dallas-county/irving/videos/
/tx/dallas-county/irving/irving-police-department/videos/
/personnel/james-markham-v-7635c7/videos/
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/videos/
```

A video card in any contextual collection should link to the canonical video page.

## Incident URLs

Incidents use a place/date/event path.

```txt
/{state-or-territory}/{administrative-area}/{place}/incidents/{yyyy}/{mm}/{dd}/{incident-slug}/
```

Example:

```txt
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/
```

The incident URL uses the best-known primary incident location and date.

The incident is not placed under an agency because incidents may involve:

- multiple agencies;
- an unknown agency at the time of initial entry;
- city police and county sheriff personnel;
- local police and jail staff;
- local police and a federal task force;
- state police and city police;
- agencies that are related to the event but not located in the same place.

### Incident Rollups

State or territory incident archives:

```txt
/tx/incidents/
/tx/incidents/2023/
/tx/incidents/2023/12/
/tx/incidents/2023/12/04/
```

Administrative-area incident archives:

```txt
/tx/dallas-county/incidents/
/tx/dallas-county/incidents/2023/
/tx/dallas-county/incidents/2023/12/
/tx/dallas-county/incidents/2023/12/04/
```

Place incident archives:

```txt
/tx/dallas-county/irving/incidents/
/tx/dallas-county/irving/incidents/2023/
/tx/dallas-county/irving/incidents/2023/12/
/tx/dallas-county/irving/incidents/2023/12/04/
```

### Incident Child Routes

Incident child routes may include:

```txt
/{incident-url}/accounts/
/{incident-url}/personnel/
/{incident-url}/agencies/
/{incident-url}/videos/
/{incident-url}/civil-cases/
/{incident-url}/criminal-cases/
/{incident-url}/enforcement/
/{incident-url}/outcomes/
/{incident-url}/data-quality/
```

Example:

```txt
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/accounts/
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/videos/
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/enforcement/
```

## Accounts

An incident is the event container.

An account is a source-specific description, perspective, record, or narrative about the incident.

Examples of account types include:

- involved-person account;
- personnel account;
- agency narrative;
- witness account;
- dispatch or CAD summary;
- arrest narrative;
- court record account;
- media account;
- civil complaint narrative.

Recommended account route:

```txt
/{incident-url}/accounts/{account-slug}/
```

Example:

```txt
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/accounts/involved-person-a-912abc/
```

The site should avoid treating any single account as the complete truth unless the source status supports that treatment.

## Criminal Cases and Enforcement

Criminal cases and enforcement lifecycle data are not part of the initial canonical URL decision unless the data exists and the outcome is being implemented.

If criminal-case tracking is implemented, criminal cases should use a top-level canonical route:

```txt
/criminal-cases/{case-slug}/
```

Example:

```txt
/criminal-cases/dallas-county-m23-12345-state-v-lotts/
```

Incident-level enforcement information may appear under:

```txt
/{incident-url}/enforcement/
```

The enforcement page may include:

- detentions;
- searches;
- arrests;
- citations;
- charges;
- booking;
- release;
- court referrals;
- dispositions.

Arrests, citations, charges, and dispositions should not be made canonical top-level routes unless there is a demonstrated need.

## Contextual Collection Pages

Contextual collection pages are filtered views.

Examples:

```txt
/tx/dallas-county/irving/personnel/
/tx/dallas-county/irving/incidents/
/tx/dallas-county/irving/videos/
/tx/dallas-county/irving/civil-cases/

/tx/dallas-county/irving/irving-police-department/personnel/
/tx/dallas-county/irving/irving-police-department/incidents/
/tx/dallas-county/irving/irving-police-department/videos/
/tx/dallas-county/irving/irving-police-department/civil-cases/

/personnel/james-markham-v-7635c7/incidents/
/personnel/james-markham-v-7635c7/videos/
/personnel/james-markham-v-7635c7/civil-cases/
```

A contextual collection page should not create a duplicate canonical record page.

It should link to canonical entity pages.

## Canonicalization Rules

Canonical pages should use self-canonical tags.

Examples:

```html
<link rel="canonical" href="https://www.policeconduct.org/personnel/james-markham-v-7635c7/" />
```

```html
<link rel="canonical" href="https://www.policeconduct.org/videos/2023-12-04-irving-body-camera-v-789abc/" />
```

```html
<link rel="canonical" href="https://www.policeconduct.org/civil-cases/ndtx-3-25-cv-03329-lotts-v-city-of-irving/" />
```

Contextual pages should self-canonical only when they provide substantial unique contextual value.

If a contextual page substantially duplicates a canonical entity page, it should canonicalize to the canonical entity page or not be indexed.

## Structured Data

Pages should use JSON-LD to express relationships between entities.

Structured data should not replace canonical tags or internal links.

Structured data should help search engines understand:

- the primary entity on the page;
- related agencies;
- related personnel;
- related incidents;
- related videos;
- related civil cases;
- parent and branch agency relationships.

## JSON-LD Examples

### Agency Page

URL:

```txt
/tx/dallas-county/irving/irving-police-department/
```

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/#profile-page",
  "url": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/",
  "name": "Irving Police Department - Agency Profile",
  "mainEntity": {
    "@type": "GovernmentOrganization",
    "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/#agency",
    "name": "Irving Police Department",
    "url": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/",
    "identifier": {
      "@type": "PropertyValue",
      "propertyID": "PoliceConduct.org agency identifier",
      "value": "agency-049f9a"
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Irving",
      "addressRegion": "TX",
      "addressCountry": "US"
    },
    "areaServed": {
      "@type": "AdministrativeArea",
      "name": "Irving, Texas"
    }
  }
}
</script>
```

### Personnel Page

URL:

```txt
/personnel/james-markham-v-7635c7/
```

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": "https://www.policeconduct.org/personnel/james-markham-v-7635c7/#profile-page",
  "url": "https://www.policeconduct.org/personnel/james-markham-v-7635c7/",
  "name": "James Markham - Personnel Profile",
  "mainEntity": {
    "@type": "Person",
    "@id": "https://www.policeconduct.org/personnel/james-markham-v-7635c7/#person",
    "name": "James Markham",
    "identifier": {
      "@type": "PropertyValue",
      "propertyID": "PoliceConduct.org personnel identifier",
      "value": "v-7635c7"
    },
    "worksFor": [
      {
        "@type": "GovernmentOrganization",
        "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/#agency",
        "name": "Irving Police Department",
        "url": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/"
      }
    ],
    "subjectOf": [
      {
        "@type": "WebPage",
        "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/personnel/james-markham-v-7635c7/#agency-personnel-page",
        "url": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/personnel/james-markham-v-7635c7/",
        "name": "James Markham at Irving Police Department"
      }
    ]
  }
}
</script>
```

### Agency-Scoped Personnel Page

URL:

```txt
/tx/dallas-county/irving/irving-police-department/personnel/james-markham-v-7635c7/
```

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/personnel/james-markham-v-7635c7/#profile-page",
  "url": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/personnel/james-markham-v-7635c7/",
  "name": "James Markham at Irving Police Department",
  "about": [
    {
      "@type": "Person",
      "@id": "https://www.policeconduct.org/personnel/james-markham-v-7635c7/#person",
      "name": "James Markham"
    },
    {
      "@type": "GovernmentOrganization",
      "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/#agency",
      "name": "Irving Police Department"
    }
  ],
  "mainEntity": {
    "@type": "Role",
    "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/personnel/james-markham-v-7635c7/#agency-association",
    "roleName": "Personnel association",
    "person": {
      "@id": "https://www.policeconduct.org/personnel/james-markham-v-7635c7/#person"
    },
    "worksFor": {
      "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/#agency"
    }
  }
}
</script>
```

### Incident Page

URL:

```txt
/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/
```

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "@id": "https://www.policeconduct.org/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/#incident",
  "url": "https://www.policeconduct.org/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/",
  "name": "Public intoxication arrest involving Irving Police Department",
  "startDate": "2023-12-04",
  "eventStatus": "https://schema.org/EventCompleted",
  "location": {
    "@type": "Place",
    "name": "Irving, Dallas County, Texas",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Irving",
      "addressRegion": "TX",
      "addressCountry": "US"
    }
  },
  "organizer": [
    {
      "@type": "GovernmentOrganization",
      "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/#agency",
      "name": "Irving Police Department"
    }
  ],
  "subjectOf": [
    {
      "@type": "VideoObject",
      "@id": "https://www.policeconduct.org/videos/2023-12-04-irving-body-camera-v-789abc/#video"
    },
    {
      "@type": "WebPage",
      "@id": "https://www.policeconduct.org/civil-cases/ndtx-3-25-cv-03329-lotts-v-city-of-irving/#case-page"
    }
  ]
}
</script>
```

### Video Page

URL:

```txt
/videos/2023-12-04-irving-body-camera-v-789abc/
```

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "@id": "https://www.policeconduct.org/videos/2023-12-04-irving-body-camera-v-789abc/#video",
  "url": "https://www.policeconduct.org/videos/2023-12-04-irving-body-camera-v-789abc/",
  "name": "Body camera video from December 4, 2023 Irving incident",
  "description": "Body camera video associated with a December 4, 2023 police-public interaction in Irving, Texas.",
  "uploadDate": "2026-04-29",
  "thumbnailUrl": [
    "https://www.policeconduct.org/media/thumbnails/2023-12-04-irving-body-camera-v-789abc.jpg"
  ],
  "contentUrl": "https://www.policeconduct.org/media/videos/2023-12-04-irving-body-camera-v-789abc.mp4",
  "publisher": {
    "@type": "Organization",
    "@id": "https://www.policeconduct.org/#organization",
    "name": "PoliceConduct.org"
  },
  "about": [
    {
      "@type": "Event",
      "@id": "https://www.policeconduct.org/tx/dallas-county/irving/incidents/2023/12/04/public-intoxication-arrest-i-7f31c2/#incident",
      "name": "December 4, 2023 Irving incident"
    },
    {
      "@type": "GovernmentOrganization",
      "@id": "https://www.policeconduct.org/tx/dallas-county/irving/irving-police-department/#agency",
      "name": "Irving Police Department"
    }
  ]
}
</script>
```

### Federal Parent and Branch Relationship

Federal parent URL:

```txt
/federal/fbi/
```

Branch office URL:

```txt
/tx/dallas-county/dallas/fbi-dallas-field-office/
```

Parent agency JSON-LD:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "GovernmentOrganization",
  "@id": "https://www.policeconduct.org/federal/fbi/#agency",
  "url": "https://www.policeconduct.org/federal/fbi/",
  "name": "Federal Bureau of Investigation",
  "alternateName": "FBI",
  "subOrganization": [
    {
      "@type": "GovernmentOrganization",
      "@id": "https://www.policeconduct.org/tx/dallas-county/dallas/fbi-dallas-field-office/#agency",
      "name": "FBI Dallas Field Office",
      "url": "https://www.policeconduct.org/tx/dallas-county/dallas/fbi-dallas-field-office/"
    }
  ]
}
</script>
```

Branch office JSON-LD:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "GovernmentOrganization",
  "@id": "https://www.policeconduct.org/tx/dallas-county/dallas/fbi-dallas-field-office/#agency",
  "url": "https://www.policeconduct.org/tx/dallas-county/dallas/fbi-dallas-field-office/",
  "name": "FBI Dallas Field Office",
  "parentOrganization": {
    "@type": "GovernmentOrganization",
    "@id": "https://www.policeconduct.org/federal/fbi/#agency",
    "name": "Federal Bureau of Investigation",
    "url": "https://www.policeconduct.org/federal/fbi/"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Dallas",
    "addressRegion": "TX",
    "addressCountry": "US"
  },
  "areaServed": {
    "@type": "AdministrativeArea",
    "name": "North Texas"
  }
}
</script>
```

## Database Relationship Requirements

URLs do not replace relationship modeling.

The database must represent relationships explicitly.

Examples:

- agency to parent agency;
- agency to branch office;
- agency to place;
- agency to jurisdiction or service area;
- personnel to agency;
- incident to agency;
- incident to personnel;
- incident to video;
- incident to civil case;
- video to agency;
- video to personnel;
- civil case to agency;
- civil case to personnel;
- civil case to incident.

### Agency Relationship Direction

Store canonical agency relationships in one direction and derive the inverse for display.

Example:

```txt
FBI Dallas Field Office branch_of FBI
```

Display inverse:

```txt
FBI has branch FBI Dallas Field Office
```

Recommended relationship examples:

```txt
branch_of
subdivision_of
member_of
successor_to
contracts_with
records_custodian_for
operates_in
located_in
serves_area
```

## Consequences

### Positive

This design:

- gives agencies human-readable address-based URLs;
- keeps personnel stable across agencies;
- keeps civil cases independent of any one agency;
- keeps videos canonical and reusable;
- keeps incidents tied to place and date without forcing agency ownership;
- supports contextual collection pages without duplicate canonical records;
- supports federal parent and branch office relationships;
- supports SEO through stable canonical URLs and structured data.

### Negative

The site will not have one universal URL shape for every entity.

That is intentional.

Each entity gets the public URL shape that matches its natural identity.

## Rules Summary

Use this for agencies:

```txt
/{state-or-territory}/{administrative-area}/{place}/{agency-slug}/
```

Use this for incidents:

```txt
/{state-or-territory}/{administrative-area}/{place}/incidents/{yyyy}/{mm}/{dd}/{incident-slug}/
```

Use this for personnel:

```txt
/personnel/{personnel-slug}/
```

Use this for civil cases:

```txt
/civil-cases/{case-slug}/
```

Use this for videos:

```txt
/videos/{video-slug}/
```

Use this for federal agencies:

```txt
/federal/{federal-agency-slug}/
```

Use contextual collection pages only as filtered views that link to canonical entity pages.
