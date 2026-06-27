const fs = require('fs');
let content = fs.readFileSync('src/features/settings/components/workspace-sections/SettingsCoreSection.tsx', 'utf8');

content = content.replace(
  "import { QueryCard } from '@/shared/components/query-card';",
  "import { QueryFeedback } from '@/shared/components/query-feedback';"
);

content = content.replace(
  /<QueryCard\n\s*className="settings-primary-card"/g,
  '<QueryFeedback'
);
content = content.replace(
  /<QueryCard/g,
  '<QueryFeedback'
);

content = content.replace(
  /<\/QueryCard>/g,
  '</QueryFeedback>'
);

fs.writeFileSync('src/features/settings/components/workspace-sections/SettingsCoreSection.tsx', content);
