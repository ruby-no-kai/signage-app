variable "iam_role_prefix" {
  type = string
}
variable "name_prefix" {
  type = string
}
variable "app_domain" {
  type = string
}
variable "cognito_domain" {
  type = string
}
variable "certificate_arn" {
  type = string
}

variable "oidc_client_id" {
  type = string
}
variable "oidc_client_secret" {
  type = string
}
variable "oidc_issuer" {
  type = string
}
variable "config" {
  type    = map(string)
  default = {}
}

variable "callback_urls" {
  type    = set(string)
  default = []
}

locals {
  callback_urls = toset(setunion(var.callback_urls, ["https://${var.app_domain}/oauth2callback"]))
}
