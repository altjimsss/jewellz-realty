import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
	if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { data: authData, error: authError } = await supabaseServer.auth.getUser(token);
	if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const { data: profile } = await supabaseServer
		.from("profiles")
		.select("role, is_active")
		.eq("id", authData.user.id)
		.maybeSingle();
	if (!profile || profile.is_active === false || !["developer", "developer_partner"].includes(profile.role ?? "")) {
		return NextResponse.json({ error: "Access denied." }, { status: 403 });
	}

	const { data: developer, error: developerError } = await supabaseServer
		.from("developer_partners")
		.select("id")
		.eq("profile_id", authData.user.id)
		.maybeSingle();
	if (developerError) return NextResponse.json({ error: "Could not load developer profile." }, { status: 500 });
	if (!developer) return NextResponse.json({ appointments: [] });

	const { data: properties, error: propertiesError } = await supabaseServer
		.from("properties")
		.select("id, title")
		.eq("developer_id", developer.id);
	if (propertiesError) return NextResponse.json({ error: "Could not load developer properties." }, { status: 500 });

	const propertyIds = (properties ?? []).map((property) => property.id);
	if (!propertyIds.length) return NextResponse.json({ appointments: [] });

	const titleByPropertyId = new Map((properties ?? []).map((property) => [property.id, property.title]));
	const { data: appointments, error: appointmentsError } = await supabaseServer
		.from("appointments")
		.select("id, property_id, buyer_name, appointment_type, scheduled_at, location")
		.eq("status", "confirmed")
		.in("property_id", propertyIds)
		.order("scheduled_at", { ascending: true });
	if (appointmentsError) return NextResponse.json({ error: "Could not load confirmed appointments." }, { status: 500 });

	return NextResponse.json({
		appointments: (appointments ?? []).map((appointment) => ({
			...appointment,
			property_title: titleByPropertyId.get(appointment.property_id ?? "") ?? "Property viewing",
		})),
	});
}
