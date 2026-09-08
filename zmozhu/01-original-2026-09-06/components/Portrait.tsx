import Image from "next/image";
import fs from "fs";
import path from "path";

type PortraitProps = {
  src: string; // напр. "/images/tanya.jpg"
  alt: string;
  name: string;
  className?: string;
  priority?: boolean;
};

// Портрет 4:5. Якщо реальне фото покладено в /public/images — показуємо його
// через next/image. Якщо файлу немає — м'який кремовий плейсхолдер тих самих
// пропорцій (щоб верстка не стрибала до завантаження фото).
export default function Portrait({
  src,
  alt,
  name,
  className = "",
  priority = false,
}: PortraitProps) {
  const filePath = path.join(process.cwd(), "public", src);
  const exists = fs.existsSync(filePath);

  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-card bg-cream-deep ${className}`}
    >
      {exists ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 480px"
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-blush/60 text-center">
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="28" cy="21" r="10" fill="#F0C4B4" />
            <path
              d="M10 48c0-9.94 8.06-18 18-18s18 8.06 18 18"
              fill="#F0C4B4"
            />
          </svg>
          <span className="px-4 text-sm text-ink-soft">{name}</span>
        </div>
      )}
    </div>
  );
}
