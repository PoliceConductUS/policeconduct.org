# GoodCop Video Candidate Queue

Created: 2026-05-06

## Purpose

This document captures candidate videos found while reviewing `r/GoodCop`.
These videos are not ready for the public video index until identifiable
officers can be linked to the appropriate agency-officer records.

Platform ingestion rule:

- videos will be added to the platform only after the officer's identity can be verified and linked to the correct agency-officer record.
- Agency-only identification is not enough.
- Do not create placeholder or unknown officers just to attach a video.
- Candidate videos without identifiable officers remain in this document until
  manual officer research is complete.

## Candidate Videos

Description review:

- YouTube descriptions were checked on 2026-05-06 where accessible.
- Officer names found in descriptions are still not enough for ingestion by
  themselves. Each named officer must be verified and matched to an
  `agency_officers` row before seed insertion.

### Louisville Police Officer Saves Unconscious Newborn Baby

| Field                         | Value                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Reddit post                   | https://www.reddit.com/r/GoodCop/comments/x1o435/louisville_police_officer_saves_unconscious/                                            |
| Source video                  | https://youtu.be/81ZPuZbpEzs                                                                                                             |
| Normalized video URL          | https://www.youtube.com/watch?v=81ZPuZbpEzs                                                                                              |
| Video title                   | Louisville Police Officer Save Unconscious Newborn Baby                                                                                  |
| Source channel                | PoliceActivity                                                                                                                           |
| Primary location              | Kentucky                                                                                                                                 |
| Agency clues                  | Louisville Police / Louisville Metro Police Department. Existing seed data includes Louisville Metro Police Department.                  |
| Officer identification status | Description identifies Louisville Metro Police Officers Nick Green and Noah Cole; needs manual verification and agency-officer matching. |
| Related reports/civil cases   | None identified from initial review.                                                                                                     |
| Suggested tags                | `positive-policing`, `medical-aid`, `rescue`, `source-subreddit-goodcop`, `source-channel-policeactivity`                                |
| Processing status             | Hold - needs officer identification.                                                                                                     |

Notes:

- Reddit title says the officer saved an unconscious newborn baby.
- YouTube description says Louisville Metro Police officers Nick Green and Noah
  Cole helped save a seven-day-old baby. It says Officer Cole called for an
  ambulance while Officer Green began infant CPR/back blows.
- Do not add until Nick Green and Noah Cole are verified and matched to
  `agency_officers` rows.

### Stillwater Body Camera Footage Shows 150 MPH Crash Scene

| Field                         | Value                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reddit post                   | https://www.reddit.com/r/GoodCop/comments/ykkoq7/stillwater_ok_police_first_to_respond_bodycam/        |
| Source video                  | https://youtu.be/O99v_X5Eq-E                                                                           |
| Normalized video URL          | https://www.youtube.com/watch?v=O99v_X5Eq-E                                                            |
| Video title                   | Stillwater body camera footage shows 150 mph crash scene that killed two                               |
| Source channel                | KFOR Oklahoma's News 4                                                                                 |
| Primary location              | Oklahoma                                                                                               |
| Agency clues                  | Stillwater, Oklahoma police first response. Agency not checked against seed data yet.                  |
| Officer identification status | YouTube description does not identify officer names.                                                   |
| Related reports/civil cases   | None identified from initial review.                                                                   |
| Suggested tags                | `positive-policing`, `medical-aid`, `source-subreddit-goodcop`, `source-channel-kfor-oklahomas-news-4` |
| Processing status             | Hold - needs officer identification.                                                                   |

Notes:

- Reddit selftext says the poster works there as a first responder and describes
  officers triaging a double-fatality crash.
- YouTube description identifies Stillwater Police Department as the releasing
  agency but does not name the officers.
- Do not add until the responding officer or officers are identified and matched
  to agency-officer rows.

### Cincinnati Police Officers Rush to Help Man Shot in Over-The-Rhine

| Field                         | Value                                                                                              |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Reddit post                   | https://www.reddit.com/r/GoodCop/comments/144osal/because_departments_dont_see_or_hear_about_most/ |
| Source video                  | https://www.youtube.com/watch?v=C2m3Vlot-Ak                                                        |
| Normalized video URL          | https://www.youtube.com/watch?v=C2m3Vlot-Ak                                                        |
| Video title                   | Video shows Cincinnati police officers rush to help man shot in Over-The-Rhine                     |
| Source channel                | WLWT                                                                                               |
| Primary location              | Ohio                                                                                               |
| Agency clues                  | Cincinnati Police Department. Agency not checked against seed data yet.                            |
| Officer identification status | YouTube description does not identify officer names.                                               |
| Related reports/civil cases   | None identified from initial review.                                                               |
| Suggested tags                | `positive-policing`, `medical-aid`, `source-subreddit-goodcop`, `source-channel-wlwt`              |
| Processing status             | Hold - needs officer identification.                                                               |

Notes:

- Reddit post frames the clip as an example of positive officer interactions.
- YouTube description identifies Cincinnati police officers generally but does
  not name them.
- Do not add until the officers in the video are identified and matched to
  agency-officer rows.

### Brownfield Officer Rescues Woman Before Storm Destroys Home

| Field                         | Value                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Reddit post                   | https://www.reddit.com/r/GoodCop/comments/hdtv0n/video_a_police_officer_in_brownfield_texas/               |
| Source article/video          | https://www.kcbd.com/2020/06/19/caught-camera-woman-rescued-home-seconds-before-it-collapsed-during-storm/ |
| Normalized video URL          | Article URL; direct video URL not extracted.                                                               |
| Video title                   | Caught on camera: woman rescued from home seconds before it collapsed during storm                         |
| Source channel                | KCBD                                                                                                       |
| Primary location              | Texas                                                                                                      |
| Agency clues                  | Brownfield, Texas police. Existing seed data includes Brownfield Police Department.                        |
| Officer identification status | Article metadata/extract did not identify officer names.                                                   |
| Related reports/civil cases   | None identified from initial review.                                                                       |
| Suggested tags                | `positive-policing`, `rescue`, `community-assistance`, `source-subreddit-goodcop`, `source-channel-kcbd`   |
| Processing status             | Hold - needs officer identification and direct video URL.                                                  |

Notes:

- Article/video source is not a simple YouTube URL.
- Initial article metadata/extract did not name the officer.
- Do not add until the officer is identified, matched to an agency-officer row,
  and a stable video URL is available.

### Florida Deputy Finds Missing Woman Thanks to Loyal Dog

| Field                         | Value                                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Reddit post                   | https://www.reddit.com/r/GoodCop/comments/1o1q4x2/florida_deputy_finds_missing_woman_thanks_to/               |
| Source video                  | https://youtu.be/T8CVWrzz5BQ                                                                                  |
| Normalized video URL          | https://www.youtube.com/watch?v=T8CVWrzz5BQ                                                                   |
| Video title                   | Florida Deputy Finds Missing Woman Thanks to Loyal Dog                                                        |
| Source channel                | RawCamPOV                                                                                                     |
| Primary location              | Florida                                                                                                       |
| Agency clues                  | Florida deputy; specific agency not identified from initial listing.                                          |
| Officer identification status | YouTube description could not be extracted during initial review.                                             |
| Related reports/civil cases   | None identified from initial review.                                                                          |
| Suggested tags                | `positive-policing`, `rescue`, `community-assistance`, `source-subreddit-goodcop`, `source-channel-rawcampov` |
| Processing status             | Hold - needs agency and officer identification.                                                               |

Notes:

- Candidate may be useful after agency and deputy are identified.
- YouTube description was not available through the extraction method used on
  2026-05-06.
- Do not add from source title alone.

### Fired Buffalo Officer Says "I Don't Regret It"

| Field                         | Value                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Reddit post                   | https://www.reddit.com/r/GoodCop/comments/7pkb28/at_last_a_good_cop_does_the_right_thing_and_loses/                           |
| Source video                  | https://www.youtube.com/watch?v=O4OOcGfVWns                                                                                   |
| Normalized video URL          | https://www.youtube.com/watch?v=O4OOcGfVWns                                                                                   |
| Video title                   | Fired cop says "I don't regret it" after stopping police officer from choking suspect                                         |
| Source channel                | WKBW TV \| Buffalo, NY                                                                                                        |
| Primary location              | New York                                                                                                                      |
| Agency clues                  | Buffalo Police Department. Officer appears to be Cariol Horne, but this must be manually verified before seed insertion.      |
| Officer identification status | YouTube description identifies Cariol Horne and Gregory Kwiatkowski; needs manual verification and agency-officer matching.   |
| Related reports/civil cases   | Possible civil/labor/legal history should be researched before linking.                                                       |
| Suggested tags                | `positive-policing`, `officer-intervention`, `de-escalation`, `source-subreddit-goodcop`, `source-channel-wkbw-tv-buffalo-ny` |
| Processing status             | Hold - needs officer verification and relationship research.                                                                  |

Notes:

- This is a stronger candidate because the officer may be identifiable, but it
  still requires manual confirmation and an agency-officer row.
- YouTube description says former Buffalo Police officer Cariol Horne tried to
  stop Officer Gregory Kwiatkowski from choking Neal Mack.
- Any eventual video linkage should distinguish Horne's intervention from
  Kwiatkowski's alleged misconduct.

### Pantigo, Texas Officer Allows Filming During Traffic Stop

| Field                         | Value                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Reddit post                   | https://www.reddit.com/r/GoodCop/comments/kr5eoj/good_officers_like_being_filmed_on_duty/                                  |
| Source video                  | https://youtu.be/tdyBqziABJc?t=687                                                                                         |
| Normalized video URL          | https://www.youtube.com/watch?v=tdyBqziABJc                                                                                |
| Video title                   | Pantigo Texas -I don't know what you have on you, can I search?                                                            |
| Source channel                | James Freeman                                                                                                              |
| Primary location              | Texas                                                                                                                      |
| Agency clues                  | Pantigo, Texas officer. Agency likely Pantego/Pantego Police Department; spelling in Reddit/Youtube title may be wrong.    |
| Officer identification status | YouTube description could not be extracted during initial review.                                                          |
| Related reports/civil cases   | None identified from initial review.                                                                                       |
| Suggested tags                | `positive-policing`, `de-escalation`, `right-to-record-police`, `source-subreddit-goodcop`, `source-channel-james-freeman` |
| Processing status             | Hold - needs agency spelling check and officer identification.                                                             |

Notes:

- Potentially useful for right-to-record context, but do not seed without the
  officer identity and correct agency.
- YouTube description was not available through the extraction method used on
  2026-05-06.

## Not Ready / Lower Confidence

These surfaced in the subreddit but should not be processed without deeper
research:

- `https://www.youtube.com/watch?v=VgBMnJyOiT0` - Windsor, Virginia traffic stop
  commentary video. Post framing is disputed and not a clear positive-policing
  candidate.
- `https://youtu.be/wZitEwlgHvQ` - hostage/stabbing incident. Serious use-of-force
  context; needs careful agency/officer/legal research before any classification.
- `https://www.youtube.com/watch?v=UtdAsPrpZ6M` - Florida supermarket racist
  tirade response. Agency/officer unclear from initial listing.
- `https://www.youtube.com/watch?v=-QxLdb77-Ic` - car launches off tow truck ramp
  in Lowndes County, Georgia. Needs agency/officer details.
- Reddit-hosted clips such as `v.redd.it` posts with no clear officer or agency
  identity should stay out of the platform unless manually researched.

## Later Processing Checklist

For each candidate before seed insertion:

1. Identify officer name(s) visible in or reliably associated with the video.
2. Confirm agency and assignment at the time of the event.
3. Match or add deterministic officer, agency, and `agency_officers` rows.
4. Add the video with a short slug and `source_label`.
5. Link through `video_agency_officers`.
6. Link reports or civil cases only when the video shows the event, is used in
   court, is referenced by the case, or is otherwise directly relevant.
7. Add source-channel and behavior tags.
8. Keep tags out of visible UI until tag index pages exist.
