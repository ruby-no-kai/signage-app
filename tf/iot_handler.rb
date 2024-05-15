require 'aws-sdk-dynamodb'
require 'aws-sdk-iotdataplane'
$stdout.sync = true

module IotHandler
  def self.logger
    @logger ||= Logger.new($stdout)
  end

  def self.dynamodb
    @dynamodb ||= Aws::DynamoDB::Client.new(logger:)
  end

  def self.iotdataplane
    @iotdataplane = Aws::IoTDataPlane::Client.new(logger:)
  end

  def self.dynamodb_table
    ENV['DYNAMODB_TABLE_NAME']
  end

  def self.name_prefix
    ENV['NAME_PREFIX']
  end

  def self.tenant
    ENV['TENANT']
  end

  def self.handle(event:, context:)
    p event
    topic = event.fetch('topic')
    case topic
    when %r{/downlink/.+?/heartbeat$}
      handle_heartbeat(event)
    end
  end

  def self.handle_heartbeat(event)
    data = {
      last_boot_at: event.fetch('booted_at'),
      last_heartbeat_at: event.fetch('ts'),
      revision: event.fetch('revision'),
    }

    dynamodb.update_item(
      table_name: dynamodb_table,
      key: {
        pk: "#{tenant}::kiosks:#{event.fetch('from')}",
        sk: "#{tenant}::kiosks",
      },
      condition_expression: "attribute_exists(#pk)",
      update_expression: "set #{data.keys.map { "##{_1} = :#{_1}" }.join(', ')}",
      expression_attribute_names: data.keys.map { ["##{_1}", _1.to_s] }.to_h.merge("#pk" => "pk"),
      expression_attribute_values: data.transform_keys { ":#{_1}" },
    )

    iotdataplane.publish(
      topic: "#{name_prefix}/uplink/all/heartbeat",
      qos: 0,
      retain: false,
      payload: JSON.generate({
        kind: "HeartbeatUplink",
        from: "",
        nonce: "sr_#{SecureRandom.urlsafe_base64(12)}",
        in_reply_to: event.fetch('nonce'),
        ts: Time.now.to_i,
      }),
    )

  end
end

def handle(event:, context:)
  IotHandler.handle(event:, context:)
end
