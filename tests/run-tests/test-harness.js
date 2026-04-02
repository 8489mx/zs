function run(name, fn) {
  try {
    fn();
    console.log(`OK ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

module.exports = {
  run,
};
