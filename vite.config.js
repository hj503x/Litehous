import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If deploying to https://<username>.github.io/litehous, keep base as "/litehous/".
// If deploying to https://<username>.github.io (a user/org root site), set base to "/".
export default defineConfig({
  plugins: [react()],
  base: "/litehous/",
});
