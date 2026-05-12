import { init } from "@plausible-analytics/tracker";
import { useEffect } from "react";

export default function PlausibleAnalytics() {
	useEffect(() => {
		init({
			domain: "eisdealer.gartz.dev",
			endpoint: "https://apps.gartz.dev/api/event",
		});
	}, []);

	return null;
}
