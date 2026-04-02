const { runCoreValidationTests } = require('./run-tests/core-validation-tests');
const { runStateScopeTests } = require('./run-tests/state-scope-tests');
const { runStaticRegressionTests } = require('./run-tests/static-regression-tests');

runCoreValidationTests();
runStateScopeTests();
runStaticRegressionTests();

if (process.exitCode) process.exit(process.exitCode);
console.log('All tests passed');
