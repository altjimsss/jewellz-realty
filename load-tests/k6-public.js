import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
	scenarios: {
		ramp_public_traffic: {
			executor: "ramping-vus",
			stages: [
				{ duration: "1m", target: Number(__ENV.USERS ?? 200) },
				{ duration: "3m", target: Number(__ENV.USERS ?? 200) },
				{ duration: "1m", target: 0 },
			],
		},
	},
	thresholds: {
		http_req_failed: ["rate<0.02"],
		http_req_duration: ["p(95)<2500"],
	},
};

const baseUrl = __ENV.BASE_URL ?? "http://localhost:3000";
const propertyPath = __ENV.PROPERTY_PATH ?? "/project-list/azure-studio-condo";

function sessionId() {
	return `k6-${__VU}-${__ITER}-${Date.now()}`;
}

export default function () {
	const sid = sessionId();

	let response = http.get(`${baseUrl}/project-list`);
	check(response, { "project list loads": (res) => res.status >= 200 && res.status < 400 });

	response = http.get(`${baseUrl}${propertyPath}?utm_source=k6&utm_medium=load&utm_campaign=public`);
	check(response, { "property detail loads": (res) => res.status >= 200 && res.status < 400 });

	const analyticsHeaders = { headers: { "Content-Type": "application/json" } };
	response = http.post(
		`${baseUrl}/api/analytics`,
		JSON.stringify({
			events: [
				{ event: "property_view", sessionId: sid, propertyId: __ENV.PROPERTY_ID, source: "k6", path: propertyPath },
				{ event: "property_gallery_open", sessionId: sid, propertyId: __ENV.PROPERTY_ID, source: "k6", path: propertyPath },
				{ event: "property_dwell_time", sessionId: sid, propertyId: __ENV.PROPERTY_ID, source: "k6", path: propertyPath, durationSeconds: 45 },
			],
		}),
		analyticsHeaders,
	);
	check(response, { "analytics accepts batch": (res) => res.status >= 200 && res.status < 300 });

	if (__ITER % 20 === 0) {
		response = http.post(
			`${baseUrl}/api/inquiries`,
			JSON.stringify({
				propertyId: __ENV.PROPERTY_ID,
				buyerName: `Load Test ${__VU}`,
				buyerEmail: `load-${__VU}-${__ITER}@example.com`,
				subject: "Load test inquiry",
				message: "This is a synthetic load test inquiry.",
				source: "k6_load_test",
				sessionId: sid,
			}),
			analyticsHeaders,
		);
		check(response, { "inquiry route remains available": (res) => [200, 201, 422, 429].includes(res.status) });
	}

	sleep(Math.random() * 2 + 1);
}
