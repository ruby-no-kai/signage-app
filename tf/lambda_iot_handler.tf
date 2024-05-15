resource "aws_lambda_function" "iot-handler" {
  function_name = "${var.name_prefix}-iot-handler"

  filename         = "${path.module}/iot_handler.zip"
  source_code_hash = data.archive_file.iot_handler.output_base64sha256
  handler          = "iot_handler.handle"
  runtime          = "ruby3.2"
  architectures    = ["arm64"]

  role = aws_iam_role.IotHandler.arn

  memory_size = 128
  timeout     = 15

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.table.name
      NAME_PREFIX         = var.name_prefix
      TENANT              = "default"
    }
  }
}

data "archive_file" "iot_handler" {
  type        = "zip"
  source_file = "${path.module}/iot_handler.rb"
  output_path = "${path.module}/iot_handler.zip"
}

resource "aws_lambda_permission" "iot-handler_iot" {
  function_name = aws_lambda_function.iot-handler.function_name
  statement_id  = "iot"
  action        = "lambda:InvokeFunction"
  principal     = "iot.amazonaws.com"
}

resource "aws_iot_topic_rule" "iot-handler" {
  name        = replace("${var.name_prefix}-iot-handler-0", "-", "_")
  description = "iot-handler"
  enabled     = true
  sql         = "SELECT *, topic() as topic FROM '${var.name_prefix}/downlink/#'"
  sql_version = "2016-03-23"

  lambda {
    function_arn = aws_lambda_function.iot-handler.arn
  }
}



resource "aws_iam_role" "IotHandler" {
  name                 = "${var.iam_role_prefix}IotHandler"
  description          = "signage-app IotHandler"
  assume_role_policy   = data.aws_iam_policy_document.IotHandler-trust.json
  max_session_duration = 43200
}

data "aws_iam_policy_document" "IotHandler-trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = [
        "lambda.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role_policy" "IotHandler" {
  role   = aws_iam_role.IotHandler.name
  policy = data.aws_iam_policy_document.IotHandler.json
}

data "aws_iam_policy_document" "IotHandler" {
  statement {
    effect    = "Allow"
    actions   = ["iot:Connect"]
    resources = ["arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:client/${var.name_prefix}-lambda-*"]
  }
  statement {
    effect  = "Allow"
    actions = ["iot:Publish"]
    resources = [
      "arn:aws:iot:${data.aws_region.current.name}:${data.aws_caller_identity.current.id}:topic/${var.name_prefix}/uplink/all/heartbeat",
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

  statement {
    effect  = "Allow"
    actions = ["dynamodb:Query"]
    resources = [
      aws_dynamodb_table.table.arn,
      "${aws_dynamodb_table.table.arn}/index/inverted",
    ]
  }

  statement {
    effect    = "Allow"
    actions   = ["dynamodb:UpdateItem", "dynamodb:DeleteItem"]
    resources = [aws_dynamodb_table.table.arn]

    condition {
      test     = "ForAllValues:StringLike"
      variable = "dynamodb:LeadingKeys"
      values = [
        "*::kiosks",
        "*::kiosks:*",
      ]
    }
  }
}

resource "aws_iam_role_policy_attachment" "function-AWSLambdaBasicExecutionRole" {
  role       = aws_iam_role.IotHandler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
