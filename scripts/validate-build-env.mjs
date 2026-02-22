const requiredVars = ["PUBLIC_RECAPTCHA_SITE_KEY"];

const missingVars = requiredVars.filter((name) => {
  const value = process.env[name];
  return typeof value !== "string" || value.trim() === "";
});

if (missingVars.length > 0) {
  console.error("Build failed: missing required environment variable(s):");
  for (const name of missingVars) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}
