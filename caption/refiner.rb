# Backport of the work made at https://github.com/tokyorubykaigi12/captioner which is a fork of this work.
require 'anthropic'
require 'aws-sdk-bedrockruntime'
require 'logger'
require 'thread'
require_relative './schedule'

class Refiner
  def initialize(backend:, schedule:, track:, logger: Logger.new($stdout))
    @schedule = schedule
    @track = track
    @logger = logger
    @backend = backend

    @lock = Mutex.new

    @key = nil
    @session = nil
    @cache = MiniCache.new
    @captions = {}
    @log_io = nil
    @log = String.new
    switch_key
  end

  def generate_key(session)
    session ? "#{session.starts_at.strftime('%Y%m%d-%H%M%S')}-#{session.slug.gsub(/\//, ':')}" : 'intermission'
  end

  def switch_key(new = @schedule.current(track: @track))
    newkey = generate_key(new)
    return if newkey == @key
    @key = newkey
    @session = new
    @cache = MiniCache.new
    @captions = {}
    @log_io&.close
    @log_io = File.open("tmp/refiner_#{@key}.txt", "a+").tap do |io|
      io.sync = true
    end
    @log = begin
      @log_io.rewind
      @log_io.read
    end
  end

  def make_sentences(text, is_partial: true)
    sentences = text.scan(/.+?(?:[^\d]\.\s+|[\?!]$|\.\s+|\z)/)
    sentences.inject([]) do |r,i|
      if r.empty?
        r << i
      else
        if i.split(/\s+/).size < 3
          r.last << i
        else
          r << i
        end
      end
      r
    end

    remainder = sentences.pop #if !sentences.empty? && !sentences.last.match?(/(?:[^\d]\.|[\?!])\s*\z/)
    if remainder && remainder.size > 100
      words = remainder.split(/\s+/)
      new_sentence = String.new
      limit = 100 * (remainder.size / 100)
      until new_sentence.size > limit
        new_sentence << "#{words.shift} "
      end
      sentences.push new_sentence.strip
      remainder = words.join(' ')
    end

    unless is_partial
      sentences.push(remainder) if remainder
      remainder = nil
    end
    if sentences.empty?
      remainder = text
    end

    p(text:)
    p(sentences:,remainder:)
    [sentences, remainder]
  end

  def refine(caption, use_latest: false, &callback)
    @lock.synchronize do
      switch_key()
      if use_latest
        if caption.is_partial
          caption = @captions[caption.result_id]
          return unless caption
        else
          return unless @captions[caption.result_id]
        end
      else
        @captions[caption.result_id] = caption
      end

      sentences, remainder = make_sentences(caption.transcript, is_partial: caption.is_partial)

      full_sentence = caption.is_partial ? nil : (@cache.cache(caption.transcript) do
        dispatch_refinement(caption, caption.transcript, &callback)
      end)
      refined_sentences = sentences.map do |sentence|
        @cache.cache(sentence, prevent_fetch: !!full_sentence) do
          dispatch_refinement(caption, sentence, &callback)
        end || RefineData.new(RefineInput.new(session: @session, log: @log, schedule: @schedule, sentence:), nil)
      end

      output = CaptionData.new(
        result_id: caption.result_id,
        is_partial: full_sentence&.result ? false : true,
        transcript: full_sentence&.result || [*refined_sentences.map(&:current), remainder].join(' '),
        source: :refiner,
      )

      callback.call(output)
      return unless full_sentence&.result

      o = "#{output.transcript}\n"
      @log_io&.write(o)
      @log << o
      @captions.delete(caption.result_id)
      callback.call(output)
    end
  end

  def dispatch_refinement(caption, sentence, &callback)
    @backend.dispatch(
      RefineInput.new(
        session: @session,
        log: @log,
        schedule: @schedule,
        sentence: sentence,
      ),
    ) do |data|
      self.refine(caption, use_latest: true, &callback)
    end
  end

end

class MiniCache
  MAX_SIZE = 1000

  def initialize
    @storage = {}
  end

  def cache(key, prevent_fetch: false, &block)
    if val = @storage[key]
      return val
    else
      return nil if prevent_fetch
      # Remove oldest entry if we're at capacity
      if @storage.size >= MAX_SIZE
        @storage.shift # remove oldest entry
      end
      @storage[key] = block.call
    end
  end
end

RefineData = Struct.new(
  :input,
  :result,
) do
  def current
    result || input.sentence
  end
end

class RefineBackend
  Item = Data.define(:data, :callback)
  def initialize
    @queue = Queue.new
    @ths = nil
  end

  def threads = 8

  def start
    @ths = threads.times.map do
      Thread.new do
        while item = @queue.pop
          handle_item(item) 
        end
      end.tap { _1.abort_on_exception = true }
    end
  end

  private def handle_item(item)
    retries = 0
    begin
      process(item)
    rescue => e
      warn e.full_message
      retries += 1
      if retries < 3 && retryable?(e)
        sleep(2 ** retries)
        retry
      end
    end
  end

  private def retryable?(e)
    case e
    when Aws::BedrockRuntime::Errors::ThrottlingException,
         Aws::BedrockRuntime::Errors::ServiceUnavailableException,
         Aws::BedrockRuntime::Errors::ModelTimeoutException,
         Aws::BedrockRuntime::Errors::InternalServerException
      true
    else
      # ruby-anthropic raises Faraday errors / generic StandardError; retry on
      # transient-looking messages, skip obvious 4xx prompt bugs.
      msg = e.message.to_s
      !msg.match?(/\b(400|401|403|404|invalid_request|authentication|permission)\b/i)
    end
  end

  def dispatch(input, &callback)
    data = RefineData.new(input, nil)
    @queue.push(Item.new(data:,callback:))
    data
  end
end

class AnthropicBackend < RefineBackend
  def initialize
    @anthropic = Anthropic::Client.new(api_key: ENV.fetch('ANTHROPIC_API_KEY'))
    super()
  end

  def process(item)
    t = Time.now
    p request: item.data
    response = @anthropic.messages.create(
      model: :"claude-haiku-4-5-20251001",
      system_: [
        { type: "text", text: item.data.input.system, cache_control: { type: "ephemeral" } },
      ],
      messages: item.data.input.messages,
      max_tokens: 1000,
      temperature: 0,
    )
    text_block = response.content.find { |b| b.type == :text }
    item.data.result = text_block&.text
    p took: Time.now-t, response: item.data, usage: response.usage
    item.callback.call(item.data)
    nil
  end
end

class BedrockBackend < RefineBackend
  def initialize
    @bedrock = Aws::BedrockRuntime::Client.new(region: 'ap-northeast-1')
    super()
  end

  def process(item)
    t = Time.now
    p request: item.data
    response = @bedrock.converse(
      model_id: 'anthropic.claude-haiku-4-5-20251001-v1:0',
      system: [
        { text: item.data.input.system },
        { cache_point: { type: 'default' } },
      ],
      messages: item.data.input.messages.map do |m|
        { role: m[:role], content: [{ text: m[:content] }] }
      end,
      inference_config: { max_tokens: 1000, temperature: 0.0 },
    )
    item.data.result = response.output.message.content.first.text
    p took: Time.now-t, response: item.data
    item.callback.call(item.data)
    nil
  end
end

class RefineInput
  def initialize(session:, log:, schedule:, sentence:)
    @session = session
    @log = log
    @schedule = schedule
    @sentence = sentence
  end

  attr_reader :session
  attr_reader :log
  attr_reader :schedule
  attr_reader :sentence

  def inspect
    "#<#{self.class.name} session=#{@session&.slug&.inspect} sentence=#{sentence.inspect}>"
  end

  def system
    [
      PROMPT,
      INSTRUCTION,
      attendee_information,
      session_information,
    ].join(?\n)
  end

  def reminder
    <<~EOF
      <reminder>
        #{session_information}
        #{INSTRUCTION}
      </reminder>
    EOF
  end

  def session_information
    return nil unless @session
    <<~EOF
      <session_information>
        <title>#{@session.title}</title>
        <abstract>
          #{@session.description}
        </abstract>
      </session_information>
      <speaker_information>
        #{@session.speakers.map do |speaker|
          "<name>#{speaker.name}</name><bio>#{speaker.bio}</bio>"
        end.join(?\n)}
      </speaker_information>
    EOF
  end

  def attendee_information
    <<~EOF
      <attendee_information>
        #{@schedule.known_speaker_names.sort.map do |name|
          "<name>#{name}</name>"
        end.join(?\n)}
      </attendee_information>
    EOF
  end

  def messages
    [
      #*(unless @log.empty?
      #  [
      #    {
      #      role: "user",
      #      content: "<prior_transcription>\n#{@log}\n</prior_transcription>",
      #    },
      #    {
      #      role: "user",
      #      content: reminder,
      #    },
      #  ]
      #end),
      {
        role: "user",
        content: "<original_transcription>\n#{@sentence}\n</original_transcription>",
      },
    ].compact
  end

  PROMPT = <<~EOF
    You are a professional technical interpreter specializing in refining transcriptions of technical conferences on the Ruby programming language.
    You have expert knowledge of the entire Ruby ecosystem including: RubyGems, Bundler, Ruby on Rails, RBS, parsers (Prism/Lrama), and interpreter internals (YJIT, garbage collection, Ractor, async scheduler).

    Your task is to improve the quality and accuracy of English transcriptions from RubyKaigi conference talks. You'll work with the text in the <original_transcript> tag, making it more readable and technically accurate while preserving the original content.

    The following contextual information will be provided to help you understand the transcript better:
    - <attendee_information>: Contains accurate names of known attendees, speakers, and Ruby contributors
    - <prior_transcription>: The transcript of the talk session prior to the current segment
    - <speaker_information>: Details about the current speaker(s)
    - <session_information>: Information about the talk topic and content
    - <reminder>: Any specific notes or reminders for your task
  EOF

  INSTRUCTION =<<~EOF
    <refine_instructions>
      1. CLEAN UP LANGUAGE:
         - Remove filler words (um, uh, you know, etc.)
         - Preserve conjunctions like "so", "and", "but" as these are not filler words
         - If a segment consists only of filler words, leave it as is

      2. CORRECT TECHNICAL TERMS:
         - Ruby version numbers: Convert "Rub33", "Ruby 33", "B 33" to "Ruby 3.3"
         - Conference name: Always use "RubyKaigi" (not "Ruby Kaigi" or "RubyKagi")
         - Software/library names: Correct misinterpretations and use community-standard abbreviations where appropriate (e.g., "Rails" instead of "Ruby on Rails", "RSpec" instead of "R Spec"). Use the most commonly recognized form in the Ruby community.
         - Ruby language features: Fix terms related to YJIT, garbage collection, Ractor, etc.
         - Community contributor names: First prioritize names as listed in <attendee_information>, then supplement with your knowledge of well-known Ruby contributors when someone isn't listed.

      3. FORMAT CODE ELEMENTS:
         - Use backticks (`) around inline code snippets, method names, variables, and constants
         - Example: "We use the `each` method" instead of "We use the each method"
         - Do NOT create multi-line code blocks

      4. CONTENT INTEGRITY:
         - Never skip any part of the original transcription
         - Never add content not present in the original
         - If uncertain about a technical term, use context clues from the surrounding text
         - For truly ambiguous cases, preserve the original wording

      5. INTERPRETER BOUNDARIES:
         - As an interpreter for the deaf, focus solely on accurate transcription
         - Do NOT add your own thoughts, explanations, or commentary

      6. HANDLING BROKEN TRANSCRIPTIONS:
         - Process whatever content is in <original_transcript> even if it appears incomplete or garbled
         - Never respond with error messages like "transcript appears incomplete" or "please provide more content"
         - Never ask for additional information or clarification
         - For unintelligible fragments, preserve them as closely as possible while correcting obvious technical terms
         - Output your best refinement of the available content, even if it's fragmentary
         - If you cannot make sense of a portion, keep the original text as-is rather than requesting clarification
    </refine_instructions>

    <output_instructions>
      - Provide ONLY the refined transcription of the text in <original_transcript>
      - Start directly with the refined content
      - Do NOT include phrases like "Here is the improved transcription:"
      - Do NOT include any explanation about your changes
      - If the transcript appears broken or incomplete, still provide your best refinement without commenting on its incomplete nature
    </output_instructions>
  EOF
end
