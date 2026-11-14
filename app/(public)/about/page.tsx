import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About J'WELLZ REALTY",
  description: "Learn more about J'WELLZ REALTY.",
};

export default function Page() {
  redirect("/about-us");
}
