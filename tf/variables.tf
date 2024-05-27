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
variable "callback_urls" {
  type    = set(string)
  default = []
}

variable "config" {
  type    = map(string)
  default = {}
}

variable "captioner_enabled" {
  type    = bool
  default = false
}
variable "captioner_params" {
  type = object({
    vpc_id                            = string
    ec2_security_group_ids            = set(string)
    medialive_security_group_ids      = set(string)
    medialive_input_security_group_id = string
    ec2_subnet_id                     = string
    medialive_subnet_id_1             = string
    medialive_subnet_id_2             = string
    medialive_role_arn                = string
    ssh_import_ids                    = optional(set(string), [])
  })
  default = {
    vpc_id                            = ""
    ec2_security_group_ids            = []
    medialive_input_security_group_id = ""
    medialive_security_group_ids      = []
    ec2_subnet_id                     = ""
    medialive_subnet_id_1             = ""
    medialive_subnet_id_2             = ""
    medialive_role_arn                = ""
  }
}
variable "captioner_channels" {
  type = map(object({
    stream_key = string
    udp_port   = number
  }))
  default = {}
}

variable "cloudfront_log_bucket" {
  type = string
}

variable "cloudfront_log_prefix" {
  type = string
}

variable "manage_config_in_s3" {
  type    = bool
  default = true
}

variable "github_actions_subs" {
  type    = set(string)
  default = []
}

locals {
  callback_urls = toset(setunion(var.callback_urls, ["https://${var.app_domain}/oauth2callback"]))
}
