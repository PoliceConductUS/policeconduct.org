# YouTube Auditor → PoliceConduct.org Report Generator

## Purpose

Process YouTube channels from First Amendment auditors and generate structured police conduct reports from video transcripts. Each video that documents a police encounter becomes one report.

## Input

A YAML file `channels.yaml` listing YouTube channels to process:

```yaml
channels:
  - name: LongIslandAudit
    url: https://www.youtube.com/@LongIslandAudit
    auditor: SeanPaul Reyes
  - name: AuditTheAudit
    url: https://www.youtube.com/@AuditTheAudit
    auditor: unknown
  # Add more channels here
```

## Pipeline

### Step 1: Enumerate Videos

For each channel, fetch the list of public videos (use `yt-dlp --flat-playlist --print id,title,upload_date` or the YouTube Data API). Store the video index as:

```
data/channels/{channel-name}/index.json
```

Skip videos already processed (check `data/reports/` for existing report with matching `videoId`).

### Step 2: Get Transcript

For each unprocessed video:

1. Attempt to pull the YouTube auto-generated or manual transcript using `yt-dlp --write-auto-sub --sub-lang en --skip-download` or a transcript API.
2. If no transcript is available, skip the video and log it to `data/skipped.log`.
3. Store raw transcript in `data/transcripts/{video-id}.txt`.

### Step 3: Classify the Video

Before generating a report, determine whether the video documents a police/government encounter. Many auditor channels include vlogs, legal commentary, court appearances, or reaction videos that are not incident reports.

Send the transcript (or first 2000 words) to the LLM with this classification prompt:

```
You are classifying a YouTube video transcript. Does this video document a specific, identifiable encounter between a civilian and law enforcement or government security?

Answer ONLY with one of:
- ENCOUNTER: The video shows or narrates a specific police/security encounter at an identifiable location
- NOT_ENCOUNTER: The video is commentary, a vlog, court footage, reaction content, or does not document a specific incident
- UNCLEAR: Cannot determine from the transcript

Transcript:
{transcript}
```

Only proceed to Step 4 for videos classified as `ENCOUNTER`.

### Step 4: Generate the Report

Send the full transcript to the LLM with the following system prompt:

```
You are a factual report writer for policeconduct.org, a public accountability database. Your job is to produce an accurate, neutral, source-attributed report of a police encounter based solely on a YouTube video transcript.

RULES:
- State ONLY what is said or described in the transcript. Do not infer motive, speculate about mental states, or editorialize.
- Use direct quotes from the transcript when possible. Attribute all quotes.
- If officer names, badge numbers, or department names are stated in the video, include them. If not stated, use descriptive identifiers ("Officer 1," "the sergeant," etc.).
- If the location (city, state, building) is stated or identifiable, include it.
- Do not characterize conduct as "excessive," "illegal," "unconstitutional," or any other legal conclusion. Describe what happened; let readers draw conclusions.
- Note any visible/audible context: Were cameras turned off? Was the person detained, handcuffed, arrested? Were rights read? Was a supervisor called?

OUTPUT FORMAT (JSON):
{
  "title": "Brief descriptive title of the incident",
  "date": "YYYY-MM-DD or null if unknown",
  "location": {
    "description": "Where the encounter took place",
    "city": "city or null",
    "state": "state or null",
    "type": "post office | library | courthouse | street | government building | police station | other"
  },
  "agency": {
    "name": "Department or agency name if identifiable, else null",
    "type": "municipal | county | state | federal | campus | private security | unknown"
  },
  "officers": [
    {
      "identifier": "Name if stated in video, otherwise 'Officer 1' etc.",
      "rank": "if stated",
      "badgeNumber": "if stated",
      "description": "Brief physical/role description from video if helpful"
    }
  ],
  "civilians": [
    {
      "identifier": "Name of the auditor/civilian",
      "role": "auditor | bystander | complainant"
    }
  ],
  "narrative": "Detailed factual narrative derived from the transcript. Use chronological order. Include direct quotes. This is the main body of the report.",
  "keyMoments": [
    {
      "timestamp": "HH:MM:SS if available from transcript",
      "description": "Brief description of a significant moment"
    }
  ],
  "outcome": "How the encounter ended — released, arrested, cited, trespassed, etc.",
  "legalContext": [
    "List any laws, rights, or legal concepts explicitly discussed in the video (e.g., 'First Amendment,' 'trespassing,' 'Terry stop')"
  ],
  "source": {
    "videoId": "YouTube video ID",
    "videoUrl": "Full YouTube URL",
    "channelName": "Channel name",
    "channelUrl": "Channel URL",
    "uploadDate": "YYYY-MM-DD",
    "transcriptMethod": "auto-generated | manual | whisper"
  },
  "disclosure": "This report was generated automatically by policeconduct.org software. The narrative was derived from the video's transcript using AI language processing. No human editor reviewed this report prior to publication. The original video is embedded above for viewers to verify the account independently. If you are an officer or agency named in this report and believe it contains an error, please contact corrections@policeconduct.org. Published by the Institute for Police Conduct, Inc., a nonprofit organization."
}
```

### Step 5: Store the Report

Save each report as:

```
data/reports/{video-id}.json
```

### Step 6: Quality Gate (Optional but Recommended)

Before publishing, run a second LLM pass:

```
Review this police encounter report for accuracy against the source transcript. Flag any:
1. Claims not supported by the transcript
2. Editorializing or legal conclusions
3. Misattributed quotes
4. Missing key details from the transcript

Transcript:
{transcript}

Report:
{report_json}
```

Store the review output alongside the report as `{video-id}.review.json`. If any flags are raised, mark the report as `"status": "needs_review"` rather than `"status": "ready"`.

## Directory Structure

```
scripts/generate-reports/
├── prompt.md              # This file
├── channels.yaml          # Input: channels to process
├── run.sh                 # Entry point (or run.py)
└── data/
    ├── channels/          # Video indexes per channel
    ├── transcripts/       # Raw transcripts
    ├── reports/           # Generated report JSON files
    ├── reviews/           # Quality gate output
    └── skipped.log        # Videos without transcripts
```

## Disclosure Language

Every published report MUST include the disclosure field verbatim. The embedded YouTube video serves as the primary source — the report is a navigational aid, not a replacement for watching the video.

## Rate Limiting & Courtesy

- Respect YouTube rate limits. Add delays between transcript fetches.
- Process no more than 50 videos per channel per run.
- Store everything locally before any database writes.

## Starter Channels

These are well-known First Amendment auditors whose content primarily documents police encounters:

```yaml
channels:
  - name: LongIslandAudit
    url: https://www.youtube.com/@LongIslandAudit
    auditor: SeanPaul Reyes
  - name: AuditTheAudit
    url: https://www.youtube.com/@AuditTheAudit
    auditor: unknown
  - name: LackLuster
    url: https://www.youtube.com/@LackLuster
    auditor: unknown
  - name: AmagansettPress
    url: https://www.youtube.com/@AmagansettPress
    auditor: Jason Gutterman
  - name: TheeCivilRightLawyer
    url: https://www.youtube.com/@TheCivilRightsLawyer
    auditor: John Bryan
  - name: JamesFreeman
    url: https://www.youtube.com/@JamesFreeman
    auditor: unknown
```

## Liability Safeguards Built Into This Design

1. **Transcript-derived only** — narrative comes from what was said on video, not AI inference
2. **No legal conclusions** — describes conduct, doesn't label it
3. **Source video embedded** — reader can verify everything
4. **Disclosure on every report** — transparent about AI generation
5. **Correction contact** — named officers/agencies can request corrections
6. **Quality gate** — second-pass review catches hallucination before publish
7. **Descriptive identifiers** — officers only named if they identify themselves on video
