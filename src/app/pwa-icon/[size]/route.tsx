import { ImageResponse } from "next/og";
import { IconArt } from "@/components/icon-art";

const SIZES = [192, 512] as const;
export const dynamic = "force-static";
export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  const size = (SIZES as readonly number[]).includes(n) ? n : 192;
  return new ImageResponse(<IconArt size={size} />, { width: size, height: size });
}
