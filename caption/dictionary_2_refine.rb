# Refine vanila transcript with LLM for transcribe CLM, and generate dictionary candidate

require 'open-uri'
require 'yaml'
require 'aws-sdk-s3'
require 'aws-sdk-bedrockruntime'

FileUtils.mkdir_p File.join('tmp', 'refine')
FileUtils.mkdir_p File.join('tmp', 'transcript')

logger = Logger.new($stdout)
@bedrock = Aws::BedrockRuntime::Client.new(region: 'ap-northeast-1', logger:)

is_skip = ARGV.delete('--skip')
is_dictionary = ARGV.delete('--dic')
source = ARGV[0] or abort "Usage: #$0 source_name"


if is_skip && File.exist?(File.join("tmp", "transcript", "#{source}#{is_dictionary}.txt"))
  puts "skip"
  exit 0
end

year,slug = source.split(?-,2)

presentations = YAML.safe_load(URI.open("https://rubykaigi.org/#{year}/data/presentations.yml", "r", &:read))
speakers = YAML.safe_load(URI.open("https://rubykaigi.org/#{year}/data/speakers.yml", "r", &:read))
  .then { _1.fetch('keynotes',{}).merge(_1.fetch('speakers', {})) }

talk = presentations.fetch(slug)
session_speakers = talk.fetch('speakers').map { speakers.fetch(_1.fetch('id')) }

transcript = File.read(File.join('tmp', 'rec-transcript', "#{source}.txt"))

prompt_preamble = <<~EOF
  You are a professional technical interpreter specializing in refining transcriptions of technical conferences on the Ruby programming language.
  You are expected to be familiar with the latest Ruby language ecosystem and innovation, such as Rubygems, Bundler, Ruby on Rails, RBS, parsers such as Prism/Lrama, and interpreter internals like YJIT, garbage collection, Ractor, async scheduler.

  Your task is to improve the quality of a English transcription of a technical talk session in the conference called RubyKaigi.

  The text given in <original_transcript> tag is a transcript of the talk session which you need to work on.
  Make the transcription in <original_transcript> more readable and accurate by following the instructions in <refine_instructions> tag. Output must be made in format described in the <output_instructions> tag.

  We provide several informations to understand the <original_transcript> and your mission in detail. You may use the informations below, and these informations are provided for your reference:
  - The text given in <prior_transcription> tag. It is the transcript of the talk session prior to this conversation with you.
  - The <speaker_information> tag.
  - The <session_information> tag.
  - The <attendee_information> tag, which contains other speaker names so you can ease correcting name.
  - Any information inside <reminder> tag are reminders for you.
EOF

refine_instruction = <<~EOF
  <refine_instructions>
  - Remove filler words. We don't consider conjunctive a filler word, such as "so", "and".
  - Correct mistaken transcriptions, which can be often found for software names, library names, technology names, protocol names, Ruby language features, and well-known contributor names in the community.
  - Improve transcription correctness. You'll find mistakes like below, but not limited to these.
    - Ruby runtime version numbers such as 2.7, 3.0, 3.1, and so on. For instance, You need to correct "Rub33", "Ruby 33", "B 33" to "Ruby 3.3"
    - this conference name must be written as "RubyKaigi", instead of "Ruby Kaigi" or "RubyKagi"
  - You may use backquotes (``) if you find a code snippet (includes constant names, variable names, function names) in a transcript. But, multi-line code blocks are prohibited.
  - You are ONLY allowed to correct words and terms as requested above. Never skip any of the original transcription, and never add any contents that is not given in the original transcription.
  - Because you are an interpreter for deaf, you are NOT allowed to sprinkle your thoughts on output.
  </refine_instructions>
EOF

prompt_dictionary = <<~EOF
  <output_instructions>
  - Your output is a custom vocabulary dictionary for Amazon Transcribe.
    - List ONLY corrected term and words.
    - Single term or word is allowed per line.
  - The output should start directly with the vocabulary data.
  - Process the text in <original_transcription> tag.
  </output_instructions>
EOF

prompt_correction = <<~EOF
  <output_instructions>
    - Provide ONLY the refined transcription of the text in <original_transcription> tag.
    - Do NOT include any introductory text such as "Here is the improved transcription:".
    - The output should start directly with the refined English text.
  </output_instructions>
EOF

session_data = <<~EOF
  <session_information>
    <title>#{talk.fetch('title')}</title>
    <abstract>#{talk.fetch('description')}</abstract
  </session>
EOF

session_speakers.each do |speaker|
  session_data << <<~EOF
    <speaker_information>
      <name>#{speaker.fetch('name')}</name>
      <bio>#{speaker.fetch('bio')}</bio>
    </speaker_information>
  EOF
end

session_data << "\n<attendee_information>"
speakers.each_value do |speaker|
  session_data << <<~EOF
    <name>#{speaker.fetch('name')}</name>
  EOF
end
session_data << "</attendee_information>"

inputs = transcript.split(/\n\n/).inject([''.dup]) do |r,i|
  s = r.last
  if s.size >= 2000
    s = ''.dup
    r << s
  end
  s << i
  s << "\n\n"
  r
end.map do |slice|
 <<~EOF
    <original_transcription>
    #{slice}
    </original_transcription>
  EOF
end

system = [prompt_preamble, refine_instruction, is_dictionary ? prompt_dictionary : prompt_correction, session_data].join("\n")
reminder = ["<reminder>", session_data, refine_instruction, is_dictionary ? prompt_dictionary : prompt_correction,"</reminder>"].join("\n")

start = Time.now
p start

prior_transcription = ''

File.open(File.join("tmp", "refine", "#{source}#{is_dictionary}.jsonl"), "w") do |jsonl_io|
  File.open(File.join("tmp", "refine", "#{source}#{is_dictionary}.txt"), "w") do |txt_io|
    inputs.each do |input|
      messages = [
        *(if prior_transcription.empty?
          [
            {
              role: "user",
              content: "<prior_transcription>#{prior_transcription}</prior_transcription>",
            },
            {
              role: "user",
              content: reminder,
            }
          ]
        end),
        {
          role: "user",
          content: input,
        },
      ]
      puts messages.map { _1.fetch(:content) }.join(?\n)
      @bedrock.invoke_model_with_response_stream(
        model_id: 'anthropic.claude-haiku-4-5-20251001-v1:0',
        content_type: 'application/json',
        accept: 'application/json',
        body: JSON.generate({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 8192 * 6,
          system:,
          messages:,
        }),
      ) do |stream|
        stream.on_error_event do |event|
          raise event
        end

        stream.on_event do |event|
          case event
          when Aws::BedrockRuntime::Types::PayloadPart
            payload = JSON.parse(event.bytes)
            jsonl_io.puts JSON.generate(payload)
            case payload.fetch('type')
            when 'message_start'
              p payload
            when 'content_block_start'
              txt_io.write payload.dig('content_block', 'text')
              prior_transcription << payload.dig('content_block', 'text')
            when 'content_block_delta'
              txt_io.write payload.dig('delta', 'text')
              txt_io.flush
              prior_transcription << payload.dig('delta', 'text')
            when 'message_delta'
              p payload
            when 'message_stop'
              p payload
            end
          else
            p event
          end
        end
      end
      txt_io.write "\n\n"
      prior_transcription << "\n\n"
    end
  end
end

File.write(File.join('tmp', 'transcript', "#{source}#{is_dictionary}.txt"), File.read(File.join('tmp', 'refine', "#{source}#{is_dictionary}.txt")))
p Time.now-start
