/**
 * Future AI boundary. Route code must depend on this interface, not an SDK.
 * No provider or API key is configured in the current implementation.
 */
export class InterviewAiPort {
  async generateQuestions(_context) { throw new Error('AI interview generation is not configured.') }
  async evaluateAnswer(_context) { throw new Error('AI answer evaluation is not configured.') }
  async transcribeAudio(_file) { throw new Error('Speech transcription is not configured.') }
}
