## ADDED Requirements

### Requirement: Requested files receive content checks

The scanner SHALL apply its existing path, filename, and UTF-8 content-pattern checks to every requested file without size or NUL-byte exclusions. An unreadable input SHALL fail the scan.

#### Scenario: Large or NUL-containing input has a prohibited pattern

- **WHEN** a requested file larger than 2 MiB or containing a NUL byte contains a prohibited home-path pattern
- **THEN** the scan fails with a redacted finding

#### Scenario: A requested input is unreadable

- **WHEN** the scanner cannot read a requested file
- **THEN** it fails instead of reporting a clean scan

### Requirement: All-agency comparison includes tribal LEAs

The all-agency classification subtotal SHALL include tribal law enforcement agencies, matching the BJS 2018 all-agency denominator.

#### Scenario: A held agency has a sourced tribal classification

- **WHEN** a tribal LEA is included in a state's classified records
- **THEN** it contributes one to the held total and all-agency subtotal
