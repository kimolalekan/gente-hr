import { cn } from "@/lib/utils";

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary ring-1 ring-border",
        size === "md" ? "size-9 text-xs" : "size-8 text-xs",
      )}
    >
      {initials}
    </span>
  );
}
