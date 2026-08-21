import { cn } from "@/lib/utils";

/**
 * A visual divider. Horizontal separators use a semantic `<hr>`; vertical
 * ones are purely decorative and hidden from assistive technology.
 */
export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <div
        aria-hidden="true"
        className={cn("h-full w-px shrink-0 bg-border", className)}
      />
    );
  }
  return (
    <hr className={cn("h-px w-full shrink-0 border-0 bg-border", className)} />
  );
}
