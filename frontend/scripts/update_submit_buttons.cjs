const fs = require('fs');
const glob = require('glob');
const files = glob.sync('C:/zn/frontend/src/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace disabled={isPending || something} with isPending={isPending} disabled={something}
  content = content.replace(/<SubmitButton([^>]*?)disabled=\{([^}]+)\}/g, (match, before, disabledExpr) => {
    if (disabledExpr === 'isPending' || disabledExpr === 'mutation.isPending' || disabledExpr === 'isSubmitting' || disabledExpr === 'isBusy') {
      return `<SubmitButton${before}isPending={${disabledExpr}}`;
    }
    
    const parts = disabledExpr.split('||').map(p => p.trim());
    const pendingVars = ['isPending', 'mutation.isPending', 'isSubmitting', 'isBusy', 'isSaving'];
    const pendingPartIndex = parts.findIndex(p => pendingVars.includes(p));
    
    if (pendingPartIndex !== -1) {
      const pendingPart = parts[pendingPartIndex];
      parts.splice(pendingPartIndex, 1);
      if (parts.length > 0) {
        return `<SubmitButton${before}isPending={${pendingPart}} disabled={${parts.join(' || ')}}`;
      } else {
        return `<SubmitButton${before}isPending={${pendingPart}}`;
      }
    }

    return match; // Unchanged
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
