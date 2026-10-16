import styles from "./product.module.css";

type ProductMediaProps = {
  alt: string;
  className?: string;
  eager?: boolean;
  kind: "hero" | "morph";
  sizes: string;
};

const MEDIA = {
  hero: {
    base: "product-hero",
    height: 1800,
    width: 1440,
  },
  morph: {
    base: "product-morph",
    height: 900,
    width: 1440,
  },
} as const;

export function ProductMedia({
  alt,
  className,
  eager = false,
  kind,
  sizes,
}: ProductMediaProps) {
  const media = MEDIA[kind];
  const classes = [styles.productMedia, className].filter(Boolean).join(" ");

  return (
    <picture className={classes} data-authored-media={kind}>
      <source
        srcSet={`/media/stills/${media.base}-720.avif 720w, /media/stills/${media.base}-1440.avif 1440w`}
        sizes={sizes}
        type="image/avif"
      />
      <source
        srcSet={`/media/stills/${media.base}-720.webp 720w, /media/stills/${media.base}-1440.webp 1440w`}
        sizes={sizes}
        type="image/webp"
      />
      <img
        alt={alt}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
        height={media.height}
        loading={eager ? "eager" : "lazy"}
        src={`/media/stills/${media.base}-720.webp`}
        width={media.width}
      />
    </picture>
  );
}
