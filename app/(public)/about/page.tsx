import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Jewellz Realty",
  description: "Learn more about Jewellz Realty.",
};

export default function Page() {
  redirect("/about-us");
}
