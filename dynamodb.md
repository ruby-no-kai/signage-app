# DynamoDB

- `pk` (S)
- `sk` (S)

## VenueAnnouncement

- pk: `{tenant}::venue_announcements`
- sk: `{tenant}::venue_announcements:{id}`
- id: udld
- order_index: number
- enabled: boolean
- content: text
- url: text
- applicable_kiosks: Array of string
- updated_at: number

## ScreenControl

- pk: `{tenant}::screen_controls`
- sk: `{tenant}::screen_control:{track}`
- track:
- mode: `rotation` | `filler` | `message`
- show_sessions: boolean
- intermission: boolean
- message?:
    - heading?: string
    - footer?: string
- lightning_timer?
    - starts_at: number
    - ends_at: number
    - expires_at: number
- updated_at: number

## Session

- pk: `{tenant}::sessions`
- sk: `{tenant}::sessions:{ends_at}:{track}`
- slug
- track
- starts_at
- ends_at
- title
- speakers: array of
    - name
    - slug
    - avatar_url
- updated_at: number

## Sponsor

- pk: `{tenant}::sponsors`
- sk: `{tenant}::sponsors:{id}`
- id
- order_index
- name
- avatar_url
- plan
- updated_at: number

## Kiosks

- pk: `{tenant}::kiosks:{id}`
- sk: `{tenant}::kiosks`
- id
- tenant
- name
- revision
- data_versions
- last_heartbeat_at
- updated_at: number
