provider "google-beta" {
  alias                           = "legacy"
  project                         = var.recaptcha_project_id
  add_terraform_attribution_label = false
}

resource "google_recaptcha_enterprise_key" "legacy_site" {
  provider     = google-beta.legacy
  project      = var.recaptcha_project_id
  display_name = "PoliceConduct.org"
  labels       = {}

  web_settings {
    integration_type  = "SCORE"
    allowed_domains   = ["PoliceConduct.org"]
    allow_all_domains = false
    allow_amp_traffic = false
  }

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = google_recaptcha_enterprise_key.legacy_site
  id = "projects/ipc-policeconduct/keys/6LcMSHQsAAAAAGY3Mo3mKIfQhmxsMPEDUqUejUR6"
}
