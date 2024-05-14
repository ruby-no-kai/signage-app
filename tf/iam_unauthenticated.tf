resource "aws_iam_role" "unauthenticated-stage1" {
  name                 = "${var.iam_role_prefix}CognitoGuest"
  description          = "${var.iam_role_prefix}CognitoGuest"
  assume_role_policy   = data.aws_iam_policy_document.unauthenticated-stage1-trust.json
  max_session_duration = 43200
}
data "aws_iam_policy_document" "unauthenticated-stage1-trust" {
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
      values   = ["unauthenticated"]
    }
  }
}

resource "aws_iam_role_policy" "unauthenticated-stage1" {
  role   = aws_iam_role.unauthenticated-stage1.name
  policy = data.aws_iam_policy_document.unauthenticated-stage1.json
}
data "aws_iam_policy_document" "unauthenticated-stage1" {
  statement {
    effect    = "Allow"
    actions   = ["sts:AssumeRole", "sts:TagSession"]
    resources = [aws_iam_role.unauthenticated-stage2.arn]


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




resource "aws_iam_role" "unauthenticated-stage2" {
  name                 = "${var.iam_role_prefix}BrowserGuest"
  description          = "${var.iam_role_prefix}BrowserGuest"
  assume_role_policy   = data.aws_iam_policy_document.unauthenticated-stage2-trust.json
  max_session_duration = 43200
}

data "aws_iam_policy_document" "unauthenticated-stage2-trust" {
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

resource "aws_iam_role_policy" "unauthenticated" {
  role   = aws_iam_role.unauthenticated-stage2.name
  policy = data.aws_iam_policy_document.unauthenticated.json
}

data "aws_iam_policy_document" "unauthenticated" {
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:Query"]
    resources = [aws_dynamodb_table.table.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values = [
        "*::sessions",
        "*::sponsors",
        "*::screen_controls",
        "*::venue_announcements",
      ]
    }
  }

  statement {
    effect    = "Allow"
    actions   = ["dynamodb:UpdateItem", "dynamodb:Query"]
    resources = [aws_dynamodb_table.table.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values = [
        "*::kiosks:$${aws:PrincipalTag/RkSignageUserSub}",
      ]
    }
  }


  statement {
    effect  = "Allow"
    actions = ["iot:Connect"]
    resources = [
      #"*",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:client/${var.name_prefix}-kiosk-*",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:client/${var.name_prefix}-u-*",
    ]
  }
  # https://docs.aws.amazon.com/iot/latest/developerguide/pub-sub-policy.html
  statement {
    effect  = "Allow"
    actions = ["iot:Publish"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/downlink/kiosk=$${aws:PrincipalTag/RkSignageUserSub}/*",
    ]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Subscribe"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topicfilter/${var.name_prefix}/uplink/*",
    ]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Receive"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/heartbeat",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/updates",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/captions/*",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/chats/*",
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/kiosk=$${aws:PrincipalTag/RkSignageUserSub}/*",
    ]
  }
}
