data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*"]
  }
}

data "external" "captioner-userdata" {
  program = ["jrsonnet", "--ext-str", "SSH_IMPORT_IDS=${jsonencode(var.captioner_params.ssh_import_ids)}", "${path.module}/captioner-cloudinit.jsonnet"]
}

resource "aws_instance" "captioner" {
  count         = var.captioner_enabled ? 1 : 0
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t4g.micro"
  subnet_id     = var.captioner_params.ec2_subnet_id

  vpc_security_group_ids = var.captioner_params.ec2_security_group_ids
  iam_instance_profile   = aws_iam_instance_profile.Captioner.name

  user_data = data.external.captioner-userdata.result.userData

  tags = {
    Name      = "${var.name_prefix}-captioner"
    Component = "captioner"
  }
  lifecycle {
    ignore_changes = [ami]
  }
}
