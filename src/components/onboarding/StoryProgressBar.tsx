"use client";

interface StoryProgressBarProps {
  totalSlides: number;
  currentSlide: number;
  progress: number; // 0-100
}

export function StoryProgressBar({ totalSlides, currentSlide, progress }: StoryProgressBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex gap-1 z-10">
      {Array.from({ length: totalSlides }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-[3px] rounded-full overflow-hidden"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{
              width: i < currentSlide ? "100%" : i === currentSlide ? `${progress}%` : "0%",
              backgroundColor: "#d4a54a"
            }}
          />
        </div>
      ))}
    </div>
  );
}
