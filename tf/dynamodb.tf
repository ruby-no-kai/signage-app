resource "aws_dynamodb_table" "table" {
  name         = var.name_prefix
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }


  global_secondary_index {
    name            = "inverted"
    hash_key        = "sk"
    range_key       = "pk"
    projection_type = "ALL"
  }
}
