import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";
const isUserSite = repo.endsWith(".github.io");
const base =
  process.env.ASTRO_BASE ??
  (isGithubActions ? (isUserSite ? "/" : `/${repo}`) : "/");

export default defineConfig({
  integrations: [tailwind()],
  base,
});
