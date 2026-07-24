import { useRef } from 'react';
import sadAnimation from './Sad_animation.json';
import Lottie, { type LottieRefCurrentProps } from 'lottie-react';

interface SadAnimationProps {
  width?: number;
  height?: number;
}
const LottieComponent = (
  Lottie as typeof Lottie & {
    default: typeof Lottie;
  }
).default;
export default function SadAnimation({
  width = 600,
  height = 300,
}: SadAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  return (
    <LottieComponent
      lottieRef={lottieRef}
      animationData={sadAnimation}
      autoplay
      loop
      style={{ width, height }}
    />
  );
}
