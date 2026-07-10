import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useRef } from 'react';

interface SadAnimationProps {
  width?: number;
  height?: number;
}

export default function SadAnimation({
  width = 0,
  height = 0,
}: SadAnimationProps) {
  const dotLottieRef = useRef(null);
  return (
    <DotLottieReact
      src="/lottie/Sad-animation.lottie"
      autoplay
      loop
      style={{ width: 600, height: 300 }}
      width={width}
      height={height}
      dotLottieRefCallback={(dotLottie) => {
        dotLottieRef.current = dotLottie;
      }}
    />
  );
}
