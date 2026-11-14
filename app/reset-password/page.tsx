import type { Metadata } from "next";
import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";

export const metadata: Metadata = {
	title: "Reset Password | J'WELLZ REALTY",
	description: "Set a new password for your J'WELLZ REALTY portal account.",
};

export default function ResetPassword() {
	return <ResetPasswordPage />;
}
