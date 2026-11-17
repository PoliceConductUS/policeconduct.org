# dataset-search-types Specification

## Purpose

Ensure search consumers can read the home-page Dataset using supported organization and geographic coverage types while preserving its existing identity and nonprofit metadata.

## Requirements

### Requirement: Dataset organization references use supported types

The home-page Dataset creator and publisher SHALL resolve to the shared Organization node. The node SHALL retain its existing identity and nonprofitStatus.

#### Scenario: Search consumer reads organization references

- **WHEN** the home page's JSON-LD is read
- **THEN** Dataset creator and publisher resolve by @id to the same Organization node
- **AND** its nonprofitStatus is https://schema.org/Nonprofit501c3

### Requirement: Dataset coverage uses a supported place

The Dataset spatialCoverage SHALL be a Place named United States.

#### Scenario: Search consumer reads geographic scope

- **WHEN** the home page's Dataset is read
- **THEN** spatialCoverage has type Place and name United States
