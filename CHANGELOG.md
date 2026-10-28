# Changelog

Versions are MAJOR.MINOR.PATCH. The version you're running is shown on the first screen and in the
Grown-up corner, which also says whether a newer one is out.

## [0.8.0] - 2026-10-28
### Fixed
- Letter names are checked by listening: for each letter several spellings are tried ("Ay", "A", …), a speech
  recognizer (Whisper) listens to each, and the one heard as the right letter is used in every clip. Every finished
  letter clip is listened to again and any miss is reported.
- Cheers and other lines always use the game's own clips; the phone's voice is only tried for her name when it
  isn't recorded, so phones that hide their voices (many Samsung phones) no longer cause silence or delays.
- The "voice isn't responding" banner no longer shows during play; it only appears if the clips can't load.

## [0.7.0] - 2026-10-28
### Added
- Works on phones with no built-in voice (many Samsung phones): greetings, cheers, sticker announcements and
  every other spoken line now have their own clip.
- **Record name** in Grown-up corner → Players: record her name in your voice and the cheers say it
  ("Great job, Lily!"). A recorded name is used on every device.
### Changed
- Letters are introduced with a one-second pause: "A." … "A is for Apple."
- Voice clips are slower and clearer.
- Sound check explains when the browser has no voices, and how to add them on Samsung phones. The speed and pitch
  sliders are labeled as device-voice only.

## [0.6.0] - 2026-10-28
### Added
- Version number on the first screen and in the Grown-up corner, with a "you're up to date" check.
- "What's new" page in the Grown-up corner (this list).
- An **Update** button appears when a newer version has downloaded, so there's no need to hard-refresh.

## [0.5.0] - 2026-10-28
### Added
- Sound check in Grown-up corner → Settings: shows whether the letter voice clips and the device's own voice work,
  with test buttons.
- A small note while playing if the device voice stops responding.
### Fixed
- The list of voice clips is always fetched fresh, so an older saved copy can't hide new clips.
- If the device voice gets stuck or errors, the line is retried with a voice installed on the device.

## [0.4.0] - 2026-10-28
### Added
- ◀ ▶ buttons to go back to a past letter or skip ahead; the left/right arrow keys do the same.
- On Level 1, tap any letter in the alphabet strip to jump to it.

## [0.3.0] - 2026-10-28
### Changed
- Each letter is introduced in one smooth sentence: "A! A is for Apple." / "¡A! A de Abeja."
- The phonics sound moved to its own **Letter sound** button.
- The speech bubble no longer shows /a/-style sound spellings.

## [0.2.0] - 2026-10-28
### Added
- Letter names, prompts and counting are pre-recorded with Kokoro, a free open-source voice, so letters are
  pronounced correctly ("A" is "ay"). Latin American Spanish pronunciation. Works offline.

## [0.1.1] - 2026-10-28
### Fixed
- "Grown-ups: hold" button works with a mouse and on tablets, and shows a countdown while held.

## [0.1.0] - 2026-10-28
### Added
- First version of FlowerCorn Land: find letters and numbers by keyboard or tapping, English and Spanish, cheers with
  her name, tracing, sticker book, levels 1–4, grown-up dashboard with trouble letters and CSV export, recording
  phonics sounds, and install-to-home-screen.
