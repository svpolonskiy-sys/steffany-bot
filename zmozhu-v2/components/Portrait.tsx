import Image from "next/image";

type PortraitProps = {
  src: string;
  alt: string;
  name: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
};

// Портрет 4:5. Усі фото — реальні, лежать у /public/images.
export default function Portrait({
  src,
  alt,
  name,
  className = "",
  imgClassName = "",
  priority = false,
  sizes = "(max-width: 768px) 100vw, 480px",
}: PortraitProps) {
  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden bg-sand ${className}`}
      data-name={name}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`object-cover ${imgClassName}`}
      />
    </div>
  );
}
