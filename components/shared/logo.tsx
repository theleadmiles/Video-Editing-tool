import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 20, text: "text-base" },
    md: { icon: 26, text: "text-xl" },
    lg: { icon: 34, text: "text-2xl" },
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Lightning bolt icon */}
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-gold"
        style={{ width: sizes[size].icon + 10, height: sizes[size].icon + 10 }}
      >
        <svg
          width={sizes[size].icon * 0.55}
          height={sizes[size].icon * 0.65}
          viewBox="0 0 14 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.5 1L1 10.5H7L5.5 17L13 7.5H7.5L8.5 1Z"
            fill="black"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <span
          className={cn(
            "font-display font-bold tracking-tight",
            sizes[size].text
          )}
        >
          <span className="text-white">bolt</span>
          <span className="text-gold-500">cut</span>
        </span>
      )}
    </div>
  );
}
