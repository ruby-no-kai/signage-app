resource "aws_s3_bucket" "public" {
  bucket = "${var.name_prefix}-pub"
}

resource "aws_s3_bucket_public_access_block" "public" {
  bucket = aws_s3_bucket.public.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

data "aws_iam_policy_document" "public" {
  statement {
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = [
      "${aws_s3_bucket.public.arn}/*",
    ]
    principals {
      type = "AWS"
      identifiers = [
        "*",
      ]
    }
  }
}

resource "aws_s3_bucket_policy" "public" {
  bucket = aws_s3_bucket.public.id
  policy = data.aws_iam_policy_document.public.json

  depends_on = [aws_s3_bucket_public_access_block.public]
}

resource "aws_s3_object" "config" {
  count         = var.manage_config_in_s3 ? 1 : 0
  bucket        = aws_s3_bucket.public.bucket
  key           = "dynamic/config.json"
  content_type  = "application/json; charset=utf-8"
  cache_control = "max-age=0, must-revalidate"
  content       = "${jsonencode(local.frontend_config)}\n"
}
