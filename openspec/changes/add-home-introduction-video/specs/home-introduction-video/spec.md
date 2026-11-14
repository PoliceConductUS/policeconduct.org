## ADDED Requirements

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
