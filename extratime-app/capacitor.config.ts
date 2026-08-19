import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.extratime",
  appName: "Extra Time",
  webDir: "out",
  server: {
    url: "https://extratime-five.vercel.app/",
    cleartext: true,
  },
};

export default config;
