/*
Run in browser console after app loads:
window.__zstoreApp && window.__zstoreApp.smokeTests && window.__zstoreApp.smokeTests()
*/
(function(){
  if(!window.__zstoreApp || typeof window.__zstoreApp.smokeTests !== 'function'){
    console.warn('Smoke tests are not available yet. Load the app first.');
    return;
  }
  const report = window.__zstoreApp.smokeTests();
  console.table(report.tests.map((test) => ({ test: test.name, pass: test.pass })));
  console.log(report);
})();
