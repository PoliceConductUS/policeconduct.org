## ADDED Requirements

### Requirement: Advanced consent defaults

The site SHALL default analytics_storage to denied unless a valid saved choice
grants it. The site SHALL load the Google tag on production hosts (https on
policeconduct.org and www.policeconduct.org) in both states for advanced consent
measurement. Consent defaults SHALL precede tag loading.

#### Scenario: Defaults before the tag loads

- **WHEN** a page loads on a production host
- **THEN** the consent default is sent before the Google tag script is requested
- **AND** the Google tag loads whether analytics is granted or denied

#### Scenario: No saved analytics grant

- **WHEN** no valid choice is stored, or the stored choice denies analytics
- **THEN** analytics_storage is denied before the Google tag loads
- **AND** cookieless measurement remains enabled

### Requirement: Separate advertising choice

ad_storage, ad_user_data and ad_personalization SHALL default to denied, and
allow_google_signals and allow_ad_personalization_signals SHALL default to false.
All five SHALL follow the saved advertising choice on initial load and on every
update. A Global Privacy Control signal SHALL keep all five denied or false,
overriding a saved advertising grant.

#### Scenario: No saved advertising grant

- **WHEN** no valid choice is stored, or the stored choice denies advertising, or the browser sends a Global Privacy Control signal
- **THEN** ad_storage, ad_user_data and ad_personalization are denied and allow_google_signals and allow_ad_personalization_signals are false in the consent default sent before the Google tag loads

#### Scenario: Saved advertising grant

- **GIVEN** a valid saved choice grants advertising and the browser sends no Global Privacy Control signal
- **WHEN** a page loads
- **THEN** the consent default sent before the Google tag loads grants ad_storage, ad_user_data and ad_personalization and sets allow_google_signals and allow_ad_personalization_signals to true

### Requirement: Consent controls do what their labels say

Allow all SHALL grant both categories, Decline all SHALL deny both categories,
and Save preferences SHALL set each category from its checkbox. The dialog SHALL
describe the Advertising choice as only what the Google Analytics property
settings let Google do.

#### Scenario: Visitor allows all

- **WHEN** the visitor uses Allow all
- **THEN** the site sends a consent update that grants analytics_storage, ad_storage, ad_user_data and ad_personalization
- **AND** sets allow_google_signals and allow_ad_personalization_signals to true
- **AND** saves both choices where browser storage is available

#### Scenario: Visitor declines all

- **WHEN** the visitor uses Decline all
- **THEN** the site sends a consent update that denies analytics_storage, ad_storage, ad_user_data and ad_personalization
- **AND** sets allow_google_signals and allow_ad_personalization_signals to false
- **AND** saves both choices where browser storage is available
- **AND** denied categories have their cookies removed (see Cookies removed for denied categories)

#### Scenario: Save category choices

- **WHEN** a visitor changes either category checkbox, saves preferences, and the browser stores the choice
- **THEN** analytics_storage follows the Analytics cookies checkbox
- **AND** ad_storage, ad_user_data, ad_personalization, allow_google_signals and allow_ad_personalization_signals follow the Advertising checkbox
- **AND** both choices are remembered
- **AND** the dialog closes and focus returns to the element that had focus before the dialog opened (Your privacy choices when the visitor opened it from there)

#### Scenario: Advertising description

- **WHEN** the dialog is shown
- **THEN** the Advertising description says only that Google may use visits to this site to personalize ads on other sites
- **AND** it does not mention ad measurement or conversion tracking

### Requirement: Saved choice handling

The site SHALL store, read, sync and clear the choice as described below.

#### Scenario: Storage unavailable

- **WHEN** the browser cannot store the choice
- **THEN** the current page applies it
- **AND** the dialog stays open and says the choice applies only to this page
- **AND** a later visit defaults to denied

#### Scenario: Saving fails after an earlier choice was saved

- **GIVEN** a choice that grants analytics is saved
- **WHEN** the visitor saves a new choice and the browser cannot store it
- **THEN** the site removes the earlier saved choice
- **AND** a later visit defaults to denied

#### Scenario: Visitor closes the dialog without choosing

- **GIVEN** no valid choice is saved
- **WHEN** the visitor presses Escape
- **THEN** nothing is saved and consent stays denied
- **AND** the dialog opens again on the next page

#### Scenario: Visitor closes Your privacy choices without changing

- **GIVEN** a valid choice is saved
- **WHEN** the visitor opens Your privacy choices and presses Escape
- **THEN** the saved choice and the applied consent are unchanged
- **AND** the dialog does not open on the next page

#### Scenario: Change in another tab

- **WHEN** a saved choice changes in another tab
- **THEN** this tab applies the new choice

#### Scenario: Choice cleared in another tab

- **WHEN** the saved choice is cleared in another tab
- **THEN** this tab applies denied consent and opens the dialog
- **AND** this happens also when this site removes the choice after a failed save in another tab

#### Scenario: Cookies removed for denied categories

- **WHEN** a page loads, or a choice is saved or changes in another tab
- **THEN** the site removes \_ga and \_ga\_\* cookies while analytics is denied
- **AND** removes \_gcl\_\*, \_gac and \_gac\_\* cookies while advertising is denied

#### Scenario: Invalid saved choice

- **WHEN** the saved value is not JSON with analytics and advertising each set to granted or denied
- **THEN** the site treats it as no choice, applies denied consent and opens the dialog
