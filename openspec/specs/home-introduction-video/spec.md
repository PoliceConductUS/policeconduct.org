# home-introduction-video Specification

## Purpose

Make the published PoliceConduct.org introduction available on the home page,
with accessible playback, a readable summary and next-step links, and accurate
metadata that identifies the same video and stable thumbnail.

## Requirements

### Requirement: Home-page introduction video

The home page SHALL present the published introduction video between its hero
and National overview, with the heading “What is PoliceConduct.org?” and one
short factual introductory sentence. Existing content SHALL remain intact.

#### Scenario: A visitor reaches the introduction

- **WHEN** a visitor opens the home page
- **THEN** the introduction follows the hero and precedes National overview
- **AND** the video can be played in the page using its published YouTube URL

### Requirement: Responsive accessible playback

The player SHALL use the existing video embed URL helper and shared 16:9 ratio
utilities, have an accessible title, load lazily, allow fullscreen, and not
autoplay. The section SHALL use shared heading and spacing styles without
introducing inline CSS.

#### Scenario: Desktop and mobile visitors view the player

- **WHEN** the home page is viewed at desktop or mobile widths
- **THEN** the player fits its container at a 16:9 ratio without horizontal overflow
- **AND** its iframe has a meaningful title and fullscreen support
- **AND** generated HTML has no inline CSS and requests no autoplay

### Requirement: Readable summary and linked next steps

The introduction SHALL include a concise visible summary of the video’s public
records and public experiences, how to explore state, agency, personnel, report,
and civil-case records, and how to share experiences, volunteer, or donate.
It SHALL link to the existing find-records, report form, and data-and-methods pages.
It SHALL make no claim that records or reports are verified or accurate.

#### Scenario: A visitor reads without playing the video

- **WHEN** a visitor reads the introduction without playing the video
- **THEN** the summary explains its main topics in plain English
- **AND** links lead to `/find-records/`, `/report/new/`, and `/data-and-methods/`

### Requirement: Accurate video metadata and stable thumbnail

The home page SHALL describe the embedded introduction with a VideoObject using
its actual title, visible summary, YouTube embed URL, publication date, source
duration, English language, existing publisher organization, and stable absolute
thumbnail URL. The approved local JPEG SHALL be 1280 by 720 pixels. A YouTube
watch URL SHALL NOT be described as a video content URL. Shared metadata values
SHALL come from one page-local source.

#### Scenario: A crawler reads the home page

- **WHEN** a crawler reads generated home-page HTML
- **THEN** it finds matching visible summary text and valid VideoObject JSON-LD
- **AND** the thumbnail is a local public asset with an absolute canonical URL
- **AND** the home page remains indexable under existing crawl rules
