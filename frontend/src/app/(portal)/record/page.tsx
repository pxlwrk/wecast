import type { Metadata } from "next";
import ScreenRecorder from "@/components/media/ScreenRecorder";

export const metadata: Metadata = { title: "Aufnehmen" };

export default function RecordPage() {
  return <ScreenRecorder />;
}
