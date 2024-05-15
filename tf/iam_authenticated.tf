resource "aws_iam_role" "authenticated-stage1" {
  name                 = "${var.iam_role_prefix}CognitoUser"
  description          = "${var.iam_role_prefix}CognitoUser"
  assume_role_policy   = data.aws_iam_policy_document.authenticated-stage1-trust.json
  max_session_duration = 43200
}
data "aws_iam_policy_document" "authenticated-stage1-trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type = "Federated"
      identifiers = [
        "cognito-identity.amazonaws.com"
      ]
    }
    condition {
      test     = "StringEquals"
      variable = "cognito-identity.amazonaws.com:aud"
      values   = [aws_cognito_identity_pool.pool.id]
    }
    condition {
      test     = "ForAnyValue:StringLike" # weird but console warns if this is StringEquals
      variable = "cognito-identity.amazonaws.com:amr"
      values   = ["authenticated"]
    }
  }
}

resource "aws_iam_role_policy" "authenticated-stage1" {
  role   = aws_iam_role.authenticated-stage1.name
  policy = data.aws_iam_policy_document.authenticated-stage1.json
}
data "aws_iam_policy_document" "authenticated-stage1" {
  statement {
    effect    = "Allow"
    actions   = ["sts:AssumeRole", "sts:TagSession"]
    resources = [aws_iam_role.authenticated-stage2.arn]


    condition {
      test     = "ForAllValues:StringEquals"
      variable = "aws:TagKeys"
      values   = ["RkSignageUserSub"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/RkSignageUserSub"
      values   = ["$${cognito-identity.amazonaws.com:sub}"]
    }
  }
}

########

resource "aws_iam_role" "authenticated-stage2" {
  name                 = "${var.iam_role_prefix}BrowserUser"
  description          = "${var.iam_role_prefix}BrowserUser"
  assume_role_policy   = data.aws_iam_policy_document.authenticated-stage2-trust.json
  max_session_duration = 3600
}
data "aws_iam_policy_document" "authenticated-stage2-trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole", "sts:TagSession"]
    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.id}:root",
        // aws_iam_role.authenticated-stage1.arn,
        // "arn:aws:iam::${data.aws_caller_identity.current.id}:role/${var.iam_role_prefix}CognitoUser"
      ]
    }
  }
}

resource "aws_iam_role_policy" "authenticated-unauth" {
  role   = aws_iam_role.authenticated-stage2.name
  policy = data.aws_iam_policy_document.unauthenticated.json
}

resource "aws_iam_role_policy" "authenticated" {
  role   = aws_iam_role.authenticated-stage2.name
  policy = data.aws_iam_policy_document.authenticated.json
}
data "aws_iam_policy_document" "authenticated" {
  statement {
    effect  = "Allow"
    actions = ["dynamodb:Query"]
    resources = [
      aws_dynamodb_table.table.arn,
      "${aws_dynamodb_table.table.arn}/index/inverted",
    ]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values = [
        "*::kiosks",
        "*::kiosks:*",
      ]
    }
  }

  statement {
    effect    = "Allow"
    actions   = ["dynamodb:UpdateItem", "dynamodb:DeleteItem"]
    resources = [aws_dynamodb_table.table.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values = [
        "*::screen_controls",
        "*::venue_announcements",
        "*::kiosks",
        "*::kiosks:*",
      ]
    }
  }
  #  statement {
  #    effect  = "Allow"
  #    actions = ["iot:*"]
  #    resources = [
  #      "*"
  #    ]
  #  }

  #statement {
  #  effect    = "Allow"
  #  actions   = ["iot:connect"]
  #  resources = ["arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:client/${var.name_prefix}-control-*-$${cognito-identity.amazonaws.com:sub}"]
  #}
  # https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html
  statement {
    effect  = "Allow"
    actions = ["iot:Publish"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/updates",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/kiosk=*/updates",
    ]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Subscribe"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topicfilter/${var.name_prefix}/downlink/*",
    ]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Receive"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/downlink/*",
    ]
  }
}

