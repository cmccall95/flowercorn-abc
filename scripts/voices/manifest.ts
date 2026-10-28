// Prints every fixed spoken line (letter intros, sounds, prompts) as JSON for generate.py.
// Run: npx vite-node scripts/voices/manifest.ts > scripts/voices/manifest.json
import { allVoiceLines } from '../../src/audio/lines';

process.stdout.write(JSON.stringify(allVoiceLines(), null, 1) + '\n');
