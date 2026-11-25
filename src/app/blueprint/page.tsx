import type { Metadata } from "next";
import { Wizard } from "@/components/Wizard";

export const metadata: Metadata = {
  title: "Build your project blueprint | Cynbit prototype",
  description: "Six quick questions → instant phases, stack, timeline and budget range for your project.",
};

export default function BlueprintPage() {
  return <Wizard />;
}
