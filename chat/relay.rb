require 'json'
require 'discordrb'
require 'aws-sdk-iotdataplane'
require 'aws-sdk-secretsmanager'

logger = Logger.new($stdout)
@iotdataplane = Aws::IoTDataPlane::Client.new(logger:)

env = ARGV[0]
env2 = ARGV[1] || env
secret = JSON.parse(Aws::SecretsManager::Client.new(logger:, ).get_secret_value(secret_id: "#{env}/discord").secret_string)

map = {
  '1232432709846962177' => 'a',
  '1232432728297832571' => 'b',
  '1232432757297123458' => 'c',
  # dummy
  '1239290402708918395' => 'a',
}
guild_id = '1232421362501550212'

bot = Discordrb::Bot.new(token: secret.fetch('bot_token'))

bot.message(in: map.keys.map(&:to_i)) do |e|
  next unless e.server.id.to_s == guild_id
  track = map[e.channel.id.to_s]
  next unless track

    payload = {
      kind: "Chat",
      track: track, 
      id: e.message.id.to_s,
      timestamp: e.message.id.to_i, # snowflake
      sender: {
        id: e.message.author.id.to_s,
        name: e.message.author.display_name,
        avatar_url: e.message.author.avatar_url('webp'),
        flags: {},
      },
      content: e.message.content,
      redacted: false,
      pid: $$,
    }
    topic =  "#{env2}/uplink/all/chats/#{track}"
    json = JSON.generate(payload)
    @iotdataplane.publish(
      topic:,
      qos: 0,
      retain: false,
      payload: json,
    )
   puts(topic:, json:)
end

bot.run
