import fs from "node:fs/promises";
import path from "node:path";

const mode = process.argv[2];
if (mode !== "enable" && mode !== "disable") {
  console.error('Usage: node scripts/toggle-next-api-routes.mjs <enable|disable>');
  process.exit(1);
}

const projectRoot = process.cwd();
const appApiRoot = path.join(projectRoot, "app", "api");

const routeMappings = [
  {
    template: path.join(projectRoot, "route-templates", "proxy.route.ts"),
    target: path.join(projectRoot, "app", "api", "proxy", "route.ts"),
  },
  {
    template: path.join(projectRoot, "route-templates", "wmsdates.route.ts"),
    target: path.join(projectRoot, "app", "api", "wmsdates", "route.ts"),
  },
  {
    template: path.join(projectRoot, "route-templates", "wmtsdates.route.ts"),
    target: path.join(projectRoot, "app", "api", "wmtsdates", "route.ts"),
  },
];

const pathExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const pruneEmptyDirs = async (dirPath, stopAt) => {
  let current = dirPath;
  while (current.startsWith(stopAt) && current !== stopAt) {
    let entries = [];
    try {
      entries = await fs.readdir(current);
    } catch {
      return;
    }
    if (entries.length > 0) return;
    await fs.rmdir(current);
    current = path.dirname(current);
  }
};

if (mode === "enable") {
  for (const route of routeMappings) {
    const templateExists = await pathExists(route.template);
    if (!templateExists) {
      console.error(`Missing route template: ${path.relative(projectRoot, route.template)}`);
      process.exit(1);
    }

    const content = await fs.readFile(route.template, "utf8");
    await fs.mkdir(path.dirname(route.target), { recursive: true });
    await fs.writeFile(route.target, content, "utf8");
    console.log(`Enabled ${path.relative(projectRoot, route.target)}`);
  }
  process.exit(0);
}

for (const route of routeMappings) {
  await fs.rm(route.target, { force: true });
  await pruneEmptyDirs(path.dirname(route.target), appApiRoot);
  console.log(`Disabled ${path.relative(projectRoot, route.target)}`);
}
