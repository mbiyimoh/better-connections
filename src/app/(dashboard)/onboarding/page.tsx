"use client";

import { StoryOnboarding } from "@/components/onboarding/StoryOnboarding";

export default function OnboardingPage() {
  return (
    <div className="fixed inset-0 bg-[#0D0D0F] z-50">
      <StoryOnboarding />
    </div>
  );
}
