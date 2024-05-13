resource "aws_iam_role" "Captioner" {
  name                 = "${var.iam_role_prefix}Captioner"
  description          = "signage-app Captioner"
  assume_role_policy   = data.aws_iam_policy_document.Captioner-trust.json
  max_session_duration = 43200
}

data "aws_iam_policy_document" "Captioner-trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = [
        "ec2.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role_policy" "Captioner" {
  role   = aws_iam_role.Captioner.name
  policy = data.aws_iam_policy_document.Captioner.json
}

data "aws_iam_policy_document" "Captioner" {
  statement {
    effect = "Allow"
    actions = [
      "transcribe:StartStreamTranscription*",
      "transcribe:StartStreamTranscriptionWebSocket",
    ]

    resources = [
      "*",
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "sts:GetServiceBearerToken",
    ]
    resources = ["*"]
  }
  #statement {
  #  effect = "Allow"
  #  actions = [
  #    "ecr:GetDownloadUrlForLayer",
  #    "ecr:BatchCheckLayerAvailability",
  #    "ecr:BatchGetImage",
  #    "ecr:DescribeImages",
  #  ]
  #  resources = [
  #    aws_ecr_repository.app.arn,
  #  ]
  #}

  statement {
    effect    = "Allow"
    actions   = ["iot:Connect"]
    resources = ["arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:client/${var.name_prefix}-captioner-*"]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Publish"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/captions/*",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/chats/*",
    ]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Subscribe"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topicfilter/${var.name_prefix}/downlink/*",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topicfilter/${var.name_prefix}/uplink/*",
    ]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Receive"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/*",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/downlink/*",
    ]
  }
}


resource "aws_iam_instance_profile" "Captioner" {
  name = aws_iam_role.Captioner.name
  role = aws_iam_role.Captioner.name
}

resource "aws_iam_role_policy_attachment" "captioner-ssm" {
  role       = aws_iam_role.Captioner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
