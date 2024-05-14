data "aws_cloudfront_origin_request_policy" "Managed-AllViewerExceptHostHeader" {
  name = "Managed-AllViewerExceptHostHeader"
}
data "aws_cloudfront_origin_request_policy" "Managed-CORS-S3Origin" {
  name = "Managed-CORS-S3Origin"
}
data "aws_cloudfront_cache_policy" "Managed-CachingDisabled" {
  name = "Managed-CachingDisabled"
}
data "aws_cloudfront_cache_policy" "Managed-CachingOptimized" {
  name = "Managed-CachingOptimized"
}

moved {
  from = aws_cloudfront_distribution.dot-net
  to   = aws_cloudfront_distribution.public
}

resource "aws_cloudfront_distribution" "public" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "rk-signage-app/${var.name_prefix}"
  aliases         = [var.app_domain]

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }

  logging_config {
    include_cookies = false
    bucket          = var.cloudfront_log_bucket
    prefix          = var.cloudfront_log_prefix
  }

  origin {
    origin_id   = "s3public-ui"
    domain_name = aws_s3_bucket.public.bucket_regional_domain_name
    origin_path = "/ui"
  }


  origin {
    origin_id   = "s3public-dynamic"
    domain_name = aws_s3_bucket.public.bucket_regional_domain_name
    origin_path = "/dynamic"
  }


  ordered_cache_behavior {
    path_pattern = "/metrics"

    allowed_methods = ["GET", "HEAD", "OPTIONS", ]
    cached_methods  = ["GET", "HEAD"]

    target_origin_id         = "s3public-dynamic"
    cache_policy_id          = data.aws_cloudfront_cache_policy.Managed-CachingDisabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.Managed-CORS-S3Origin.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  ordered_cache_behavior {
    path_pattern = "/config.json"

    allowed_methods = ["GET", "HEAD", "OPTIONS", ]
    cached_methods  = ["GET", "HEAD"]

    target_origin_id         = "s3public-dynamic"
    cache_policy_id          = data.aws_cloudfront_cache_policy.Managed-CachingDisabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.Managed-CORS-S3Origin.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  ordered_cache_behavior {
    path_pattern = "/data/*"

    allowed_methods = ["GET", "HEAD", "OPTIONS", ]
    cached_methods  = ["GET", "HEAD"]

    target_origin_id         = "s3public-dynamic"
    cache_policy_id          = data.aws_cloudfront_cache_policy.Managed-CachingOptimized.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.Managed-CORS-S3Origin.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  default_cache_behavior {
    allowed_methods = ["GET", "HEAD", "OPTIONS", ]
    cached_methods  = ["GET", "HEAD"]

    target_origin_id         = "s3public-ui"
    cache_policy_id          = data.aws_cloudfront_cache_policy.Managed-CachingDisabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.Managed-CORS-S3Origin.id

    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name      = "${var.name_prefix}"
    Component = "cloudfront"
  }
}
