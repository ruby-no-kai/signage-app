resource "aws_cognito_user_pool" "pool" {
  name             = var.name_prefix
  alias_attributes = ["preferred_username", "email"]

  schema {
    name                     = "role"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 0
      max_length = 128
    }
  }
}

resource "aws_cognito_user_pool_domain" "pool" {
  user_pool_id = aws_cognito_user_pool.pool.id
  domain       = var.cognito_domain
}

resource "aws_cognito_identity_provider" "oidc" {
  user_pool_id  = aws_cognito_user_pool.pool.id
  provider_name = "externaloidc"
  provider_type = "OIDC"

  provider_details = {
    attributes_request_method     = "GET"
    authorize_scopes              = "email profile openid"
    client_id                     = var.oidc_client_id
    client_secret                 = var.oidc_client_secret
    oidc_issuer                   = var.oidc_issuer
    attributes_url_add_attributes = false # ?
  }

  attribute_mapping = {
    email = "email"
    #sub                = "sub"
    name               = "name"
    username           = "sub"
    preferred_username = "preferred_username"
    "custom:role"      = "role"
  }
}

resource "aws_cognito_user_pool_client" "identity" {
  user_pool_id = aws_cognito_user_pool.pool.id
  name         = "${var.name_prefix}-cognito-identity"

  callback_urls   = local.callback_urls
  generate_secret = true

  access_token_validity = 18
  id_token_validity     = 18

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["externaloidc"]

  write_attributes = []

  depends_on = [aws_cognito_identity_provider.oidc]
}
