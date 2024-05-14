data "aws_iot_endpoint" "current" {
  endpoint_type = "iot:Data-ATS"
}

#resource "aws_iot_policy" "unauthenticated" {
#  name   = "${var.name_prefix}-unauthenticated"
#  policy = data.aws_iam_policy_document.unauthenticated-iot.json
#}
#resource "aws_iot_policy" "authenticated" {
#  name   = "${var.name_prefix}-authenticated"
#  policy = data.aws_iam_policy_document.authenticated-iot.json
#}
