// web/src/components/common/UserAvatar.tsx
type UserAvatarProps = {
  imageUrl?: string | null;
  emoji?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-16 w-16 text-2xl",
  xl: "h-24 w-24 text-4xl",
} as const;

export default function UserAvatar({
  imageUrl,
  emoji,
  name,
  size = "md",
  className = "",
}: UserAvatarProps) {
  return (
    <div
      className={[
        SIZE_CLASS[size],
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground/10",
        className,
      ].join(" ")}
      aria-label={name ? `${name} 프로필` : "사용자 프로필"}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name ? `${name} 프로필 이미지` : "프로필 이미지"}
          className="h-full w-full object-cover"
        />
      ) : emoji ? (
        <span aria-hidden="true">{emoji}</span>
      ) : (
        <span aria-hidden="true">👤</span>
      )}
    </div>
  );
}