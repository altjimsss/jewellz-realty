import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");
	const next = searchParams.get("next") ?? "/admin";

	const redirectUrl = new URL(next, origin);

	// Preserve code and error params for the destination page
	if (code) {
		redirectUrl.searchParams.set("code", code);
	}
	const error = searchParams.get("error");
	const errorDesc = searchParams.get("error_description");
	const errorCode = searchParams.get("error_code");

	if (error) redirectUrl.searchParams.set("error", error);
	if (errorDesc) redirectUrl.searchParams.set("error_description", errorDesc);
	if (errorCode) redirectUrl.searchParams.set("error_code", errorCode);

	return NextResponse.redirect(redirectUrl.toString());
}