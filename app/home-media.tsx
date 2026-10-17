import styles from "./home.module.css";

export function HomeMedia() {
  return (
    <picture className={styles.homeMedia} data-authored-media="home-poster">
      <source
        srcSet="/media/stills/home-poster-720.avif 720w, /media/stills/home-poster-1440.avif 1440w"
        sizes="(max-width: 767px) 100vw, 72vw"
        type="image/avif"
      />
      <source
        srcSet="/media/stills/home-poster-720.webp 720w, /media/stills/home-poster-1440.webp 1440w"
        sizes="(max-width: 767px) 100vw, 72vw"
        type="image/webp"
      />
      <img
        alt="MONOLITH graphite desktop synthesizer viewed from above, centered on its oversized MORPH encoder."
        decoding="async"
        fetchPriority="high"
        height="900"
        loading="eager"
        src="/media/stills/home-poster-1440.webp"
        width="1440"
      />
    </picture>
  );
}
