import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}", // Include pages directory if it existed
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", // Include components directory
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}", // Include app directory
  ],
  theme: {
    extend: {
      // Add custom theme extensions here (e.g., colors, fonts, spacing)
      // backgroundImage: {
      //   "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      //   "gradient-conic":
      //     "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      // },
    },
  },
  plugins: [
    // Add any Tailwind CSS plugins here
    // require('@tailwindcss/forms'),
  ],
};
export default config;
