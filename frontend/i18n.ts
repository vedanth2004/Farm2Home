import { getRequestConfig } from "next-intl/server";

// Can be imported from a shared config
const locales = ["en", "ta", "hi"];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    // Default to English if locale is not found
    locale = "en";
  }

  return {
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
