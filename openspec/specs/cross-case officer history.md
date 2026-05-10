# cross-case officer history

This is the problem that one officer can appear in many public systems, but nobody gives defense lawyers, prosecutors, agencies, or the public a clean way to see the whole picture.

The data exists.

It is just trapped in separate silos.

## The problem

An officer’s history may be spread across:

| Source                     | What it may contain                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Criminal court dockets     | Cases where the officer was arresting officer, complainant, witness, affiant, evidence handler |
| Suppression motions/orders | Prior findings about stops, searches, arrests, credibility, BWC conflicts                      |
| Prosecutor records         | Brady/Giglio alerts, internal “do not call” concerns, case-dismissal reasons                   |
| Police agency records      | Complaints, commendations, discipline, use of force, pursuits, training, assignments           |
| County jail records        | Booking role, intake decisions, medical/safety observations                                    |
| Civil dockets              | §1983 lawsuits, state tort claims, settlements, indemnification, deposition testimony          |
| Public-records portals     | Prior requests, denials, AG rulings, released videos, incident records                         |
| YouTube/news/social video  | Publicly visible incidents that may never become formal complaints                             |
| Certification agencies     | License status, decertification, separation reason, training history                           |
| Appellate cases            | Published or unpublished decisions mentioning the officer or agency practice                   |

The issue is not that there is no information.

The issue is that **each source names the same officer differently, stores records differently, and exposes different fragments of the truth.**

## Why lawyers miss it

A defense lawyer may know:

> Officer James Smith arrested my client.

But to understand whether that matters, they need to know:

> Has Officer James Smith had similar arrests challenged before?

That requires cross-system searching.

The lawyer might have to search:

- county criminal records
- district court records
- municipal court records
- federal PACER/CourtListener
- state appellate opinions
- police complaint portals
- prosecutor Brady lists, if public
- agency discipline files
- MuckRock/FOIA/TPIA releases
- news archives
- YouTube
- prior defense-lawyer knowledge

That is a lot of work for one case.

And it is often not economical for misdemeanors, traffic cases, public intoxication, obstruction, resisting, or low-level drug cases — exactly where repeated officer behavior may hide.

## The core PoliceConduct solution

PoliceConduct can become the layer that says:

> These scattered records appear to involve the same officer, agency, incident, allegation, case, or legal issue.

That is the value.

Not just hosting documents.

Not just showing profiles.

The real product is **entity resolution + provenance + legal relevance.**

## The data model should connect five things

At minimum, PoliceConduct should connect:

```text
Officer ⇄ Agency ⇄ Incident ⇄ Case ⇄ Source Record
```

Then add:

```text
Issue
Finding
Outcome
Training/Policy
```

So the system can answer:

| Question                                        | PoliceConduct answer                  |
| ----------------------------------------------- | ------------------------------------- |
| Where has this officer appeared before?         | Officer profile                       |
| What kinds of cases?                            | Case involvement history              |
| What legal issues repeat?                       | Issue tags                            |
| What did courts say?                            | Judicial findings                     |
| What did the agency do?                         | Complaint/discipline/training records |
| What source supports this?                      | Original document/video/citation      |
| Is this proven or alleged?                      | Status label                          |
| Is this useful to defense/prosecution/agencies? | Research packet                       |

## The most important distinction

You do **not** need to say:

> This officer is bad.

You say:

> These public records may be relevant to officer-history, agency-practice, credibility, training, supervision, disclosure, or pattern analysis.

That is safer, more useful, and more credible.

## Example officer profile

A strong profile might look like this:

# Officer Profile

**Officer:** James Smith
**Agency:** Irving Police Department
**Badge:** 1234
**Known roles:** Arresting officer, reporting officer, BWC operator, affiant

## Public case involvement

| Date       | Case           | Role              | Issue                                                       | Outcome                                 |
| ---------- | -------------- | ----------------- | ----------------------------------------------------------- | --------------------------------------- |
| 2023-12-04 | State v. Lotts | Arresting officer | Public intoxication, First Amendment retaliation allegation | Suppression order / dismissal / pending |
| 2024-02-11 | State v. Doe   | Reporting officer | Search incident to arrest                                   | Motion denied                           |
| 2024-07-19 | Roe v. City    | Defendant witness | Excessive force allegation                                  | Settled, no admission                   |

## Judicial findings

| Court                  | Finding                                | Source            |
| ---------------------- | -------------------------------------- | ----------------- |
| County Criminal Court  | Officer’s report conflicted with video | Suppression order |
| Federal District Court | No finding; allegation only            | Complaint         |

## Conduct indicators

| Indicator                  | Count | Notes                                            |
| -------------------------- | ----: | ------------------------------------------------ |
| Similar arrest allegations |     4 | Public intoxication / obstruction / interference |
| BWC-report mismatch claims |     3 | Alleged or judicially discussed                  |
| Sustained complaints       |     1 | If public and verified                           |
| Commendations              |     2 | Include positives too                            |

## Source records

Each record gets a source link and a confidence label:

| Record            | Source type       | Confidence      |
| ----------------- | ----------------- | --------------- |
| Police report     | Agency production | High            |
| Complaint         | Civil pleading    | Allegation only |
| Suppression order | Court record      | High            |
| YouTube video     | Public media      | Needs review    |
| News article      | Secondary source  | Medium          |

That gives users evidence, not conclusions.

## How PoliceConduct solves the scattered-data problem

### 1. Normalize officer identity

The same officer may appear as:

```text
J. Smith
James Smith
James A. Smith
Officer Smith
Badge 1234
ID 56789
Smith #1234
```

PoliceConduct should resolve these to one officer entity.

But it needs to do that carefully.

Use confidence levels:

| Match level | Meaning                                         |
| ----------- | ----------------------------------------------- |
| Exact       | Same badge/license/agency/date                  |
| Strong      | Same full name + agency + overlapping date      |
| Probable    | Same name + same jurisdiction + same assignment |
| Possible    | Similar name only; needs review                 |
| Rejected    | Reviewed and not same person                    |

My opinion: **never silently merge officer records.** Use deterministic rules first, then human approval for anything uncertain.

### 2. Preserve source provenance

Every fact should answer:

> Where did this come from?

That means every imported row, PDF, video, docket, email, or request response should preserve:

```text
source_name
source_url
source_type
source_received_date
source_record_identifier
import_batch_identifier
original_file_hash
extracted_text
extraction_confidence
human_review_status
```

This lets PoliceConduct be trusted by lawyers.

### 3. Separate facts from allegations

This is critical.

Use labels like:

| Label            | Meaning                                  |
| ---------------- | ---------------------------------------- |
| Alleged          | Someone claimed it                       |
| Reported         | Appears in agency/court/public record    |
| Judicially found | Court made a finding                     |
| Sustained        | Agency sustained it                      |
| Not sustained    | Agency did not sustain it                |
| Dismissed        | Case/claim dismissed                     |
| Settled          | Resolved without admission unless stated |
| Reversed         | Later court changed outcome              |
| Unknown          | Source does not say                      |

This is where PoliceConduct can be more credible than social media, news, or activist databases.

### 4. Tag legal issues

A lawyer does not only need “Officer Smith.”

They need:

```text
Officer Smith + public intoxication
Officer Smith + obstruction
Officer Smith + resisting arrest
Officer Smith + search incident to arrest
Officer Smith + BWC muted
Officer Smith + report contradicted by video
Officer Smith + First Amendment
Officer Smith + probable cause
Officer Smith + inventory search
```

Issue tags make the database useful.

Suggested issue categories:

| Category         | Example tags                                                                |
| ---------------- | --------------------------------------------------------------------------- |
| Fourth Amendment | stop, detention, search, arrest, probable cause, warrant, inventory         |
| First Amendment  | filming police, criticism, retaliation, protected speech                    |
| Use of force     | takedown, taser, firearm, handcuffs, injury                                 |
| Credibility      | report-video conflict, inconsistent testimony, judicial credibility finding |
| Evidence         | chain of custody, lab issue, bodycam gap, missing evidence                  |
| Disclosure       | Brady, Giglio, late disclosure, withheld video                              |
| Agency practice  | training gap, supervision gap, repeated complaint, policy failure           |
| Case outcome     | dismissed, suppressed, acquitted, convicted, settled                        |

### 5. Build cross-case views

The big win is not individual pages.

It is cross-case visibility.

Examples:

## Officer view

> Show all cases involving Officer Smith, grouped by issue.

## Agency view

> Show all officers with repeated suppression issues in the last five years.

## Legal issue view

> Show public-intoxication arrests where video allegedly contradicted officer reports.

## Prosecutor view

> Show officers with potential Brady/Giglio indicators.

## Defense view

> Show prior cases involving this officer that may support discovery, impeachment, suppression, or subpoena strategy.

## Agency training view

> Show recurring conduct patterns that may indicate training or supervision gaps.

That last one matters for your point: conduct is relative to training.

If officers repeatedly misunderstand the same constitutional boundary, that may be less about one “bad officer” and more about:

- bad training
- missing policy
- supervisor tolerance
- bad incentives
- poor report review
- lack of corrective feedback
- prosecutor tolerance
- court under-enforcement

## The agency-use case

PoliceConduct can help agencies ask:

| Agency question                                      | PoliceConduct value                |
| ---------------------------------------------------- | ---------------------------------- |
| Are certain issues repeating?                        | Pattern detection                  |
| Are problems officer-specific or unit-wide?          | Officer/unit/shift comparison      |
| Are new policies working?                            | Before/after analysis              |
| Are complaints linked to training gaps?              | Complaint + training correlation   |
| Are supervisors catching report/video mismatches?    | Review-quality analysis            |
| Are good officers being identified?                  | Positive-deviance discovery        |
| Are certain officers especially good at messy calls? | Commendation/outcome/video pattern |

This lets you position the site as:

> A public-records intelligence layer for officer conduct, agency practice, and legal-case review.

## What the first useful version should do

Do not try to solve everything first.

Build the smallest useful system:

### Version 1: officer-history research packet

Given one officer, generate:

```text
Officer identity summary
Known agency affiliations
Known badge/license identifiers
Known public cases
Known incident reports
Known videos
Known complaints
Known civil cases
Known judicial findings
Known source documents
Possible related records needing review
Suggested discovery topics
Suggested prosecutor disclosure review topics
```

This is immediately useful to:

- criminal defense lawyers
- prosecutors
- civil-rights lawyers
- journalists
- agencies
- researchers

## Best language for the feature

I would call it:

> Officer History Research Packet

Or:

> Officer Conduct Research Packet

Avoid:

> Misconduct Profile

Too accusatory.

Better:

> Officer-history and agency-practice research, sourced to public records.

## Strong homepage language

Use this:

> PoliceConduct.org makes officer-history and agency-practice research easier, faster, and more objective by connecting public records across courts, agencies, public-records releases, civil dockets, videos, complaints, commendations, and case outcomes.

Then:

> The goal is not to label officers. The goal is to organize source-backed information so defense lawyers, prosecutors, agencies, journalists, researchers, and the public can evaluate conduct in context.

## The deeper insight

The defense lawyer’s problem is:

> I need to know whether this officer’s conduct in my case is isolated or part of a pattern.

The prosecutor’s problem is:

> I need to know whether this officer creates disclosure, credibility, or wrongful-prosecution risk.

The agency’s problem is:

> I need to know whether this conduct reflects training, supervision, policy, or individual performance.

The public’s problem is:

> I need to know whether the system is learning from repeated events.

PoliceConduct can sit at the intersection of all four.
