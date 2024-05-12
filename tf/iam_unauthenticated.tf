resource "aws_iam_role" "unauthenticated" {
  name                 = "${var.iam_role_prefix}CognitoGuest"
  description          = "${var.iam_role_prefix}CognitoGuest"
  assume_role_policy   = data.aws_iam_policy_document.unauthenticated-trust.json
  max_session_duration = 43200
}

data "aws_iam_policy_document" "unauthenticated-trust" {
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

resource "aws_iam_role_policy" "unauthenticated" {
  role   = aws_iam_role.unauthenticated.name
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
        "*::kiosks:$${cognito-identity.amazonaws.com:sub}",
      ]
    }
  }
  statement {
    effect    = "Allow"
    actions   = ["sts:AssumeRole"]
    resources = [aws_iam_role.unauthenticated-mqtt.arn]
  }
}
resource "aws_iam_role_policy" "unauthenticated-iot" {
  role   = aws_iam_role.unauthenticated.name
  policy = data.aws_iam_policy_document.unauthenticated-iot.json
}
data "aws_iam_policy_document" "unauthenticated-iot" {
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

resource "aws_iam_role" "unauthenticated-mqtt" {
  name                 = "${var.iam_role_prefix}CognitoGuestMqtt"
  description          = "${var.iam_role_prefix}CognitoGuestMqtt"
  assume_role_policy   = data.aws_iam_policy_document.unauthenticated-mqtt-trust.json
  max_session_duration = 43200
}
data "aws_iam_policy_document" "unauthenticated-mqtt-trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.id}:role/${var.iam_role_prefix}CognitoGuest"
      ]
    }
    condition {
      test     = "ForAllValues:StringEquals"
      variable = "aws:TagKeys"
      values   = ["RkSignageUserSub"]
    }
  }
  statement {
    effect  = "Allow"
    actions = ["sts:TagSession"]
    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.id}:role/${var.iam_role_prefix}CognitoGuest"
      ]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/RkSignageUserSub"
      values   = ["$${cognito-identity.amazonaws.com:sub}"]
    }
    condition {
      test     = "ForAllValues:StringEquals"
      variable = "aws:TagKeys"
      values   = ["RkSignageUserSub"]
    }
  }
}
resource "aws_iam_role_policy" "unauthenticated-mqtt-iot" {
  role   = aws_iam_role.unauthenticated-mqtt.name
  policy = data.aws_iam_policy_document.unauthenticated-iot.json
}
