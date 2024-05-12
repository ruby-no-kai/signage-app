resource "aws_cognito_identity_pool" "pool" {
  identity_pool_name               = var.name_prefix
  allow_unauthenticated_identities = true

  cognito_identity_providers {
    client_id               = aws_cognito_user_pool_client.identity.id
    provider_name           = aws_cognito_user_pool.pool.endpoint
    server_side_token_check = false
  }
}

resource "aws_cognito_identity_pool_roles_attachment" "user_role_attachment" {
  identity_pool_id = aws_cognito_identity_pool.pool.id
  roles = {
    "authenticated"   = "${aws_iam_role.authenticated.arn}"
    "unauthenticated" = "${aws_iam_role.unauthenticated.arn}"
  }
}
