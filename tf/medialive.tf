data "aws_iam_role" "MediaLiveAccessRole" {
  name = "MediaLiveAccessRole"
}

data "external" "medialive-channel-cfn" {
  program = ["jrsonnet", "--ext-str", "DEFAULT_TAGS=${jsonencode(data.aws_default_tags.current.tags)}", "${path.module}/medialive-cfn/external.jsonnet"]
}

# NOTE: We know now terraform-aws-provider now natively supports MediaLive, but MediaLive configuration is still too repetitive and is difficult to keep it DRY using Terraform

locals {
  captioner_channels = var.captioner_enabled ? var.captioner_channels : {}
}

resource "aws_cloudformation_stack" "medialive-channel" {
  for_each      = local.captioner_channels
  name          = "${var.name_prefix}-medialive-${each.key}"
  template_body = data.external.medialive-channel-cfn.result.template

  parameters = {
    ChannelName         = each.key
    StreamKey           = each.value.stream_key
    CaptionerUrl        = "udp://${aws_instance.captioner[0].private_ip}:${each.value.udp_port}"
    Subnet1Id           = var.captioner_params.medialive_subnet_id_1
    Subnet2Id           = var.captioner_params.medialive_subnet_id_2
    RoleArn             = var.captioner_params.medialive_role_arn
    VpcSgIds            = join(",", var.captioner_params.medialive_security_group_ids)
    MedialiveSgPublicId = var.captioner_params.medialive_input_security_group_id
    NamePrefix          = var.name_prefix
  }
}

data "aws_eip" "medialive-channel-public-outbound" {
  for_each = local.captioner_channels
  id       = aws_cloudformation_stack.medialive-channel[each.key].outputs.PublicOutboundEip
}
data "aws_medialive_input" "private" {
  for_each = local.captioner_channels
  id       = aws_cloudformation_stack.medialive-channel[each.key].outputs.PrivateInputId
}
data "aws_medialive_input" "public" {
  for_each = local.captioner_channels
  id       = aws_cloudformation_stack.medialive-channel[each.key].outputs.PublicInputId
}
