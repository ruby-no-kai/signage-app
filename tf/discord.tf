resource "aws_secretsmanager_secret" "discord" {
  name = "${var.name_prefix}/discord"
}
