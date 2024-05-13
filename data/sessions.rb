require 'yaml'
require 'aws-sdk-dynamodb'

TRACKS = {
  'Large Hall' => :a,
  'Small Hall' => :b,
  'Large Studio' => :c,
}

@dynamodb = Aws::DynamoDB::Client.new
presentations_yml, speakers_yml, schedule_yml, table_name, tenant = ARGV[0,5]
abort "Usage: #$0 presentations_yml speakers_yml schedule_yml table_name tenant " unless presentations_yml && speakers_yml && schedule_yml && table_name && tenant

updated_at = Time.now.to_i
touched_items = {}

speakers_data = YAML.safe_load(File.read(speakers_yml))
speakers = speakers_data.fetch('keynotes',{}).merge(speakers_data.fetch('speakers', {}))

presentations = YAML.safe_load(File.read(presentations_yml))
schedule = YAML.safe_load(File.read(schedule_yml))

sessions = []

long_title_session = nil

schedule.each do |day, day_data| # day = "may15"
  #day_ts = Time.parse("#{day.capitalize.sub(/\d/, ' ')} #{Time.now.year} 00:00:00 +09:00")
  day_data.fetch('events', []).each do |event|
    begin_ts = Time.parse("#{day.capitalize.sub(/\d/, ' \0')} #{Time.now.year} #{event.fetch('begin')}:00 +09:00")
    end_ts = Time.parse("#{day.capitalize.sub(/\d/, ' \0')} #{Time.now.year} #{event.fetch('end')}:00 +09:00")

    event.fetch('talks', {}).each do |hall, talk_slug|
      track = TRACKS.fetch(hall)
      presentation = presentations.fetch(talk_slug)

      p [ begin_ts, end_ts]
      sessions.push(
        slug: talk_slug,
        starts_at: begin_ts.to_i,
        ends_at: end_ts.to_i,
        track:,
        hall:,
        title: presentation.fetch('title'),
        speakers: presentation.fetch('speakers',[]).map do |speaker_info|
          id = speaker_info.fetch('id')
          speaker = speakers.fetch(id)
          {
            slug: id,
            name: speaker.fetch('name'),
            github_id: speaker.fetch('github_id', nil),
            twitter_id: speaker.fetch('twitter_id', nil),
            avatar_url: "https://gravatar.com/avatar/#{speaker.fetch('gravatar_hash')}?s=512", # TODO:
          }
        end,
        updated_at:,
      )
      long_title_session ||= sessions.last
      long_title_session = sessions.last if sessions.last.fetch(:title).size > long_title_session.fetch(:title).size
    end
  end
end

sessions.each do |session|
  pk = "#{tenant}::sessions"
  sk = "#{tenant}::sessions:#{session.fetch(:ends_at).to_i}:#{session.fetch(:track)}"
  data = session
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

pk =  "#{tenant}::sessions"
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

p(long_title_session:)
