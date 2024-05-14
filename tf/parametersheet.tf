resource "aws_s3_object" "parametersheet" {
  count         = var.captioner_enabled ? 1 : 0
  bucket        = aws_s3_bucket.public.bucket
  key           = "dynamic/data/rtmp-${random_id.parametersheet.b64_url}.html"
  content_type  = "text/html; charset=utf-8"
  cache_control = "max-age=0"
  content = templatefile("${path.module}/parametersheet.html.tftpl", {
    medialive_settings = local.captioner_medialive_settings
  })
}

# https://github.com/hashicorp/terraform/issues/22461 year = formatdate("YYYY", timestamp())
data "external" "parametersheet-year" {
  program = ["ruby", "-rjson", "-e", "puts JSON.generate(year: Time.now.year.to_s)"]
}

resource "random_id" "parametersheet" {
  keepers = {
    year = data.external.parametersheet-year.result.year
  }
  byte_length = 16
}
