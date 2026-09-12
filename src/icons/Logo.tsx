import React from "react";
import logoImg from "../assets/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 20, className = "" }) => {
  return (
    <img
      src={logoImg}
      alt="Omni MCP"
      style={{ width: size, height: size }}
      className={`rounded-md object-contain shrink-0 ${className}`}
    />
  );
};
