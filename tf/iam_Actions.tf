data "aws_iam_openid_connect_provider" "github-actions" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "Actions" {
  count = length(var.github_actions_subs) > 0 ? 1 : 0

  name                 = "${var.iam_role_prefix}Actions"
  assume_role_policy   = data.aws_iam_policy_document.Actions-trust.json
  max_session_duration = 3600
  #permissions_boundary = data.aws_iam_policy.NocAdminBase.arn
}

data "aws_iam_policy_document" "Actions-trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    effect  = "Allow"
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github-actions.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = var.github_actions_subs
    }
  }
}

resource "aws_iam_role_policy" "Actions" {
  count = length(var.github_actions_subs) > 0 ? 1 : 0

  role   = aws_iam_role.Actions[0].id
  name   = "Actions"
  policy = data.aws_iam_policy_document.Actions.json
}

data "aws_iam_policy_document" "Actions" {
  statement {
    effect = "Allow"
    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:PutObject",
    ]
    resources = [
      aws_s3_bucket.public.arn,
      "${aws_s3_bucket.public.arn}/ui/*",
    ]
  }
}
