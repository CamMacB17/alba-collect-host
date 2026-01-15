const APP_URL = process.env.APP_URL;
const CRON_SECRET = process.env.CRON_SECRET;

if (!APP_URL) {
  throw new Error("APP_URL environment variable is required");
}

if (!CRON_SECRET) {
  throw new Error("CRON_SECRET environment variable is required");
}

const url = `${APP_URL}/api/cron/cleanup-pledges`;

try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-cron-secret": CRON_SECRET,
    },
  });

  const body = await response.text();
  console.log(`Status: ${response.status}`);
  console.log(`Response: ${body}`);

  if (response.status >= 200 && response.status < 300) {
    process.exit(0);
  } else {
    process.exit(1);
  }
} catch (error) {
  console.error("Error calling cleanup endpoint:", error);
  process.exit(1);
}
