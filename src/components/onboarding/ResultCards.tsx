"use client";

type AttachmentResult = {
  style: string;
  scores: { anxiety: number; avoidance: number };
};

type LoveLanguageResult = {
  scores: Record<string, number>;
  topTwo: [string, string];
};

interface ResultCardsProps {
  attachment?: AttachmentResult;
  loveLanguages?: LoveLanguageResult;
}

const ATTACHMENT_EXPLANATIONS = {
  secure: {
    title: "Secure Attachment",
    description: "You're comfortable with both closeness and independence.",
    tips: [
      "You naturally balance connection and space",
      "You can communicate needs clearly",
      "You're a great foundation for healthy relationships"
    ]
  },
  anxious: {
    title: "Anxious Attachment",
    description: "You deeply value connection and may worry about losing it.",
    tips: [
      "Your partner can help by being consistent and reassuring",
      "Regular check-ins help you feel secure",
      "Your sensitivity helps you tune into relationship needs"
    ]
  },
  avoidant: {
    title: "Avoidant Attachment",
    description: "You value independence and may need space to process feelings.",
    tips: [
      "Your partner can help by respecting your need for space",
      "Taking time to think before talking is totally okay",
      "Your independence brings balance to relationships"
    ]
  },
  fearful: {
    title: "Fearful-Avoidant Attachment",
    description: "You want closeness but also fear it, creating inner conflict.",
    tips: [
      "Your partner can help by being patient and predictable",
      "Small steps toward connection are perfect",
      "Your awareness of this pattern is the first step to change"
    ]
  }
};

const LOVE_LANGUAGE_LABELS = {
  words: "Words of Affirmation",
  acts: "Acts of Service", 
  gifts: "Receiving Gifts",
  time: "Quality Time",
  touch: "Physical Touch"
};

const LOVE_LANGUAGE_TIPS = {
  words: "Your partner can help by expressing appreciation, giving compliments, and using encouraging words.",
  acts: "Your partner can help by taking on tasks, helping with daily responsibilities, and showing care through actions.",
  gifts: "Your partner can help by giving thoughtful surprises, remembering special occasions, and showing they were thinking of you.",
  time: "Your partner can help by spending focused time together, creating shared routines, and being fully present.",
  touch: "Your partner can help by offering hugs, holding hands, and using physical closeness to show affection."
};

export default function ResultCards({ attachment, loveLanguages }: ResultCardsProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">What this means & how to respect each other</h3>
      
      {attachment && (
        <div className="rounded-lg border p-4 bg-blue-50">
          <h4 className="font-semibold text-blue-900 mb-2">
            {ATTACHMENT_EXPLANATIONS[attachment.style as keyof typeof ATTACHMENT_EXPLANATIONS]?.title}
          </h4>
          <p className="text-blue-800 mb-3">
            {ATTACHMENT_EXPLANATIONS[attachment.style as keyof typeof ATTACHMENT_EXPLANATIONS]?.description}
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-blue-700">How your partner can support you:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              {ATTACHMENT_EXPLANATIONS[attachment.style as keyof typeof ATTACHMENT_EXPLANATIONS]?.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {loveLanguages && (
        <div className="rounded-lg border p-4 bg-green-50">
          <h4 className="font-semibold text-green-900 mb-2">Your Top Love Languages</h4>
          <div className="mb-3">
            <p className="text-green-800">
              <span className="font-medium">1. {LOVE_LANGUAGE_LABELS[loveLanguages.topTwo[0]]}</span>
              <br />
              <span className="font-medium">2. {LOVE_LANGUAGE_LABELS[loveLanguages.topTwo[1]]}</span>
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-700">How your partner can show love:</p>
            <div className="space-y-2">
              {loveLanguages.topTwo.map((lang, i) => (
                <div key={lang} className="text-sm text-green-700">
                  <p className="font-medium">{LOVE_LANGUAGE_LABELS[lang]}:</p>
                  <p className="ml-4">{LOVE_LANGUAGE_TIPS[lang]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-2">Remember</h4>
        <p className="text-sm text-gray-700">
          These results are just one way to understand yourself better. Share them with your partner 
          to help them understand how to support you, and ask about their results too. The goal is 
          mutual understanding, not labels.
        </p>
      </div>
    </div>
  );
}
