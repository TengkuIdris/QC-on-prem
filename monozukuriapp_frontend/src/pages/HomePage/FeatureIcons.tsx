import React from "react";

interface OptimizedIconProps {
  src: string;
  webpSrc?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}

export function OptimizedIcon({ src, webpSrc, alt, width, height, className, style }: OptimizedIconProps) {
  return (
    <picture>
      {webpSrc && (
        <source
          srcSet={webpSrc}
          type="image/webp"
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        aria-hidden="true"
        className={className}
        sizes={`${width}px`}
        style={{
          width,
          height,
          objectFit: "contain",
          display: "block",
          ...style,
        }}
      />
    </picture>
  );
}

export function ParetoIcon() {
  return (
    <OptimizedIcon
      src="/image/parento.svg"
      alt="パレート図"
      width={95}
      height={95}
    />
  );
}

export function FishboneIcon() {
  return (
    <OptimizedIcon
      src="/image/fishbone.svg"
      alt="特性要因図"
      width={180}
      height={140}
    />
  );
}

export function WhyWhyIcon() {
  return (
    <OptimizedIcon
      src="/image/5w.png"
      alt="なぜなぜ分析"
      width={130}
      height={130}
    />
  );
}

export function LightbulbIcon() {
  return (
    <div className="bg-white rounded-full p-2 relative w-28 h-28">
      <OptimizedIcon
        src="/image/lightbulb_icon.svg"
        alt="ご意見・ご要望"
        width={95}
        height={95}
        className="absolute top-[54%] left-1/2 transform -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
