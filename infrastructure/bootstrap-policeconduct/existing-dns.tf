# Existing public DNS records adopted without changing mail policy or verification.
# Values and TTLs were read from Route53 during the INS-153 inventory.

resource "aws_route53_record" "google_mail_dmarc" {
  zone_id = local.route53_zone_id
  name    = "_dmarc.policeconduct.org."
  type    = "TXT"
  ttl     = 3600
  records = ["v=DMARC1; p=none; pct=100"]
}

import {
  to = aws_route53_record.google_mail_dmarc
  id = "${local.route53_zone_id}__dmarc.${var.domain_name}_TXT"
}

resource "aws_route53_record" "google_mail_dkim" {
  zone_id = local.route53_zone_id
  name    = "google._domainkey.policeconduct.org."
  type    = "TXT"
  ttl     = 3600
  records = ["v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuJkd+aelS38ceVkIBKXKGJsDnKZeL/PIYn8ivW1/S8/dlgdJHZp9iPsDLgySF0kKSGKhkWlKbsxobx3GCBn6rxFMQMroyfhNRZJynI3jSL1NOufjgQjNscNaYhuA5chW49Osx0VYcYjhIOMHHpQWdyZdDTet8btk88muRUqNFOb02Z3XYF\" \"XPuHVneanm3egpPHJYnxrm1mvnN0fjFVKAcrUKbsDZHjxK1QZZqmJ5EiN5O6pZ+FIbAFlGYyx23iI/vLtoAmsLk8TLOyjmFDC6OLb7q5FNxMhlUPiSo5khfJYiCIg2L4/9olY7tVS2IL1E+zqQGdIBuUzkLZ5l4tG3XwIDAQAB"]
}

import {
  to = aws_route53_record.google_mail_dkim
  id = "${local.route53_zone_id}_google._domainkey.${var.domain_name}_TXT"
}

resource "aws_route53_record" "google_domain_verification" {
  zone_id = local.route53_zone_id
  name    = "xdvktfq76yak.policeconduct.org."
  type    = "CNAME"
  ttl     = 3600
  records = ["gv-wvopyga6fjhcn2.dv.googlehosted.com."]
}

import {
  to = aws_route53_record.google_domain_verification
  id = "${local.route53_zone_id}_xdvktfq76yak.${var.domain_name}_CNAME"
}

# extra_dns_records must not repeat a record adopted above: two resources would
# then manage one record, and removing either one deletes it.
locals {
  adopted_dns_record_keys = [
    for record in [
      aws_route53_record.google_mail_dmarc,
      aws_route53_record.google_mail_dkim,
      aws_route53_record.google_domain_verification,
    ] : "${lower(trimsuffix(record.name, "."))} ${record.type}"
  ]
}
