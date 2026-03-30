import { memo, type HTMLAttributes, type ReactNode } from "react";

type GlitchCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

function GlitchCardBase({ children, className = "", ...rest }: GlitchCardProps) {
  return (
    <div className={`glitch-card ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export default memo(GlitchCardBase);
