require 'yaml'
require 'aws-sdk-dynamodb'

@dynamodb = Aws::DynamoDB::Client.new
yml_path, table_name, tenant = ARGV[0,3]
abort "Usage: #$0 yml_path table_name tenant " unless yml_path && table_name && tenant

updated_at = Time.now.to_i
touched_items = {}

sponsor_data = YAML.load(File.read(yml_path))
plans = sponsor_data.each_value.select { |plan| %w(ruby platinum gold).include?(plan.fetch(:base_plan)) }
eligible_sponsors = plans.flat_map{ |_| _.fetch(:plans).each_value.flat_map { |__| __.fetch(:sponsors) } }


eligible_sponsors.each_with_index do |sponsor, order_index| 
  id = sponsor.fetch(:id).to_s
  pk = "#{tenant}::sponsors"
  sk =  "#{tenant}::sponsors:#{id}"
  data = {
    tenant:,
    id:,
    plan: sponsor.fetch(:base_plan),
    name: sponsor.fetch(:name),
    avatar_url: "https://rubykaigi.org/2024/images/sponsors/#{sponsor.fetch(:asset_file_id)}@3x.png",
    order_index:,
    updated_at:,
  }
  p(pk:,sk:,data:)
  @dynamodb.update_item(
    table_name:,
    key: { pk:, sk: },
    update_expression: "set #{data.keys.map { "##{_1} = :#{_1}" }.join(', ')}",
    expression_attribute_names: data.keys.map { ["##{_1}", _1.to_s] }.to_h,
    expression_attribute_values: data.transform_keys { ":#{_1}" },
  )
  touched_items[sk] = true
end

pk =  "#{tenant}::sponsors"
@dynamodb.query(table_name:, expression_attribute_values: {":pk" => pk}, key_condition_expression: 'pk = :pk').flat_map(&:items).each do |item|
  sk = item.fetch('sk')
  unless touched_items[sk]
    p [:delete, pk, sk]
    @dynamodb.delete_item(
      table_name:,
      key: { pk:, sk: },
    )
  end
end
