output "frontend_config" {
  value = local.frontend_config
}
output "captioner_ip_address" {
  value = var.captioner_enabled ? aws_instance.captioner[0].private_ip : null
}
output "captioner_medialive_settings" {
  value = local.captioner_medialive_settings
}

output "cloudfront_distribution_domain_name" {
  value = aws_cloudfront_distribution.public.domain_name
}

output "rtmp_parametersheet_url" {
  value = var.captioner_enabled ? "https://${var.app_domain}/data/rtmp-${random_id.parametersheet.b64_url}.html" : null
}

locals {
  cognito_url = "https://${var.cognito_domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
  frontend_config = {
    aws_region = data.aws_region.current.name

    iot_endpoint     = data.aws_iot_endpoint.current.endpoint_address
    iot_topic_prefix = "${var.name_prefix}"

    dynamodb_table_name = var.name_prefix

    user_pool_issuer        = "${aws_cognito_user_pool.pool.endpoint}"
    user_pool_authorize_url = "${local.cognito_url}/oauth2/authorize"
    user_pool_token_url     = "${local.cognito_url}/oauth2/token"
    user_pool_client_id     = aws_cognito_user_pool_client.identity.id
    user_pool_client_secret = aws_cognito_user_pool_client.identity.client_secret

    identity_pool_id = aws_cognito_identity_pool.pool.id

    iam_role_arn_unauthenticated_stage1 = aws_iam_role.unauthenticated-stage1.arn
    iam_role_arn_unauthenticated_stage2 = aws_iam_role.unauthenticated-stage2.arn
    iam_role_arn_authenticated_stage1   = aws_iam_role.authenticated-stage1.arn
    iam_role_arn_authenticated_stage2   = aws_iam_role.authenticated-stage2.arn

    tenant = "default"
  }

  captioner_medialive_settings = {
    for k, _p in(var.captioner_enabled ? var.captioner_channels : {}) :
    k => {
      public_outbound_ip = data.aws_eip.medialive-channel-public-outbound[k].public_ip
      private_input = {
        url        = replace(data.aws_medialive_input.private[k].destinations[0].url, "//[^/]+$/", "")
        stream_key = replace(data.aws_medialive_input.private[k].destinations[0].url, "/^.+//", "")
      }
      public_input = {
        url        = replace(data.aws_medialive_input.public[k].destinations[0].url, "//[^/]+$/", "")
        stream_key = replace(data.aws_medialive_input.public[k].destinations[0].url, "/^.+//", "")
      }
    }
  }


}
