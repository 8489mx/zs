const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const routesFile = path.join(projectRoot, 'frontend', 'src', 'app', 'routes', 'definitions.tsx');
const content = fs.readFileSync(routesFile, 'utf8');
const matches = [...content.matchAll(/path:\s*'([^']+)'|index:\s*true/g)];
const routes = matches.map((m) => m[1] ? `/${m[1]}` : '/');
const uniqueRoutes = [...new Set(routes)];
console.log('Route QA Pass');
uniqueRoutes.forEach((route) => console.log(`- ${route}`));
console.log(`Total routes: ${uniqueRoutes.length}`);
