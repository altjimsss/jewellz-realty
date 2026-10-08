import type { Metadata } from "next";
import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";

export const metadata: Metadata = {
	title: "Reset Password | Jewellz Realty",
	description: "Set a new password for your Jewellz Realty portal account.",
};

export default function ResetPassword() {
	return <ResetPasswordPage />;
}
