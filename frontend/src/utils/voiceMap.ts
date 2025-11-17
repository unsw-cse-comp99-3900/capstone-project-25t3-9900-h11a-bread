/* ---------- Azure voice map ---------- */
export const VOICE_MAP = {
  American: {
    male: [
      "en-US-GuyNeural",
      "en-US-BrianNeural",
      "en-US-JasonNeural",
      "en-US-BrandonNeural",
      "en-US-ChristopherNeural",
    ],
    female: [
      "en-US-JennyNeural",
      "en-US-AriaNeural",
      "en-US-AvaNeural",
      "en-US-JaneNeural",
      "en-US-CoraNeural",
    ],
  },
  British: {
    male: [
      "en-GB-RyanNeural",
      "en-GB-AlfieNeural",
      "en-GB-ElliotNeural",
      "en-GB-EthanNeural",
      "en-GB-OliverNeural",
    ],
    female: [
      "en-GB-AbbiNeural",
      "en-GB-BellaNeural",
      "en-GB-HollieNeural",
      "en-GB-LibbyNeural",
      "en-GB-SoniaNeural",
    ],
  },
  Australian: {
    male: [
      "en-AU-WilliamNeural",
      "en-AU-DuncanNeural",
      "en-AU-TimNeural",
      "en-AU-KenNeural",
      "en-AU-DarrenNeural",
    ],
    female: [
      "en-AU-TinaNeural",
      "en-AU-NatashaNeural",
      "en-AU-AnnetteNeural",
      "en-AU-FreyaNeural",
      "en-AU-JoanneNeural",
    ],
  },
  Indian: {
    male: [
      "en-IN-PrabhatNeural",
      "en-IN-ArjunNeural",
      "en-IN-AaravNeural",
      "en-IN-KunalNeural",
      "en-IN-RehaanNeural",
    ],
    female: [
      "en-IN-NeerjaNeural",
      "en-IN-AnanyaNeural",
      "en-IN-AartiNeural",
      "en-IN-AashiNeural",
      "en-IN-KavyaNeural",
    ],
  },
} as const;

export type AccentKey = keyof typeof VOICE_MAP;
export type GenderKey = "male" | "female";
