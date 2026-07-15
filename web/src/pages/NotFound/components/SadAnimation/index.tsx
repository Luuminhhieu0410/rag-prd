import { useRef } from 'react';
import sadAnimation from './Sad_animation.json';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

interface SadAnimationProps {
  width?: number;
  height?: number;
}

export default function SadAnimation({
  width = 600,
  height = 300,
}: SadAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  return (
    <Lottie.default
      lottieRef={lottieRef}
      animationData={sadAnimation}
      autoplay
      loop
      style={{ width, height }}
    />
  );
}
