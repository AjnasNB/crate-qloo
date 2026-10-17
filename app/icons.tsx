import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

// Static presentation-only SVGs. No icon-library context or separate React runtime.
function Icon({ size = 24, strokeWidth = 1.75, children, ...props }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{children}</svg>;
}

export function ArrowDownToLine(props: IconProps) {
  return <Icon {...props}><path d="M12 3v12m-5-5 5 5 5-5M4 18v3h16v-3" /></Icon>;
}
export function ArrowRight(props: IconProps) {
  return <Icon {...props}><path d="M4 12h16m-6-6 6 6-6 6" /></Icon>;
}
export function Box(props: IconProps) {
  return <Icon {...props}><path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5" /></Icon>;
}
export function Check(props: IconProps) {
  return <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>;
}
export function ChevronRight(props: IconProps) {
  return <Icon {...props}><path d="m9 5 7 7-7 7" /></Icon>;
}
export function CircleHelp(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="9" /><path d="M9.4 8.7a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2-2.6 3.8M12 17h.01" /></Icon>;
}
export function FileText(props: IconProps) {
  return <Icon {...props}><path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h8" /></Icon>;
}
export function LockKeyhole(props: IconProps) {
  return <Icon {...props}><rect x="4" y="10" width="16" height="12" rx="2" /><path d="M7 10V7a5 5 0 0 1 10 0v3M12 15v3" /></Icon>;
}
export function UnlockKeyhole(props: IconProps) {
  return <Icon {...props}><rect x="4" y="10" width="16" height="12" rx="2" /><path d="M7 10V7a5 5 0 0 1 9.5-2M12 15v3" /></Icon>;
}
export function Minus(props: IconProps) {
  return <Icon {...props}><path d="M5 12h14" /></Icon>;
}
export function Music2(props: IconProps) {
  return <Icon {...props}><path d="M9 18V5l11-2v13M9 8l11-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="17" cy="16" rx="3" ry="3" /></Icon>;
}
export function Pin(props: IconProps) {
  return <Icon {...props}><path d="m16 3 5 5-5 2-2 5-3-2-7 7 7-7-2-3 5-2 2-5Z" /></Icon>;
}
export function Plus(props: IconProps) {
  return <Icon {...props}><path d="M5 12h14M12 5v14" /></Icon>;
}
export function RefreshCw(props: IconProps) {
  return <Icon {...props}><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5" /></Icon>;
}
export function Search(props: IconProps) {
  return <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></Icon>;
}
export function Settings2(props: IconProps) {
  return <Icon {...props}><path d="M3 6h7m4 0h7M3 18h13m4 0h1" /><circle cx="12" cy="6" r="2" /><circle cx="18" cy="18" r="2" /></Icon>;
}
export function ShieldCheck(props: IconProps) {
  return <Icon {...props}><path d="m12 2 9 4v6c0 5-6 8.5-9 10-3-1.5-9-5-9-10V6l9-4Z" /><path d="m8 12 3 3 5-6" /></Icon>;
}
export function Upload(props: IconProps) {
  return <Icon {...props}><path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" /></Icon>;
}
export function X(props: IconProps) {
  return <Icon {...props}><path d="m6 6 12 12M18 6 6 18" /></Icon>;
}
