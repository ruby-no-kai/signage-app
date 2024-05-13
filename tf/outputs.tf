output "frontend_config" {
  value = local.frontend_config
}
output "captioner_ip_address" {
  value = var.captioner_enabled ? aws_instance.captioner[0].private_ip : null
}
output "captioner_medialive_settings" {
  value = {
    for k, _p in var.captioner_channels :
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

locals {
  cognito_url = "https://${var.cognito_domain}.auth.${data.aws_region.current.name}.amazoncognito.com"
  frontend_config = {
    aws_region = data.aws_region.current.name

    iot_endpoint                     = data.aws_iot_endpoint.current.endpoint_address
    iot_topic_prefix                 = "${var.name_prefix}"
    iot_iam_role_arn_unauthenticated = aws_iam_role.unauthenticated-mqtt.arn
    iot_iam_role_arn_authenticated   = aws_iam_role.authenticated-mqtt.arn

    dynamodb_table_name     = var.name_prefix
    identity_pool_id        = aws_cognito_identity_pool.pool.id
    user_pool_issuer        = "${aws_cognito_user_pool.pool.endpoint}"
    user_pool_authorize_url = "${local.cognito_url}/oauth2/authorize"
    user_pool_token_url     = "${local.cognito_url}/oauth2/token"
    user_pool_client_id     = aws_cognito_user_pool_client.identity.id
    user_pool_client_secret = aws_cognito_user_pool_client.identity.client_secret
    tenant                  = "default"
  }
}
