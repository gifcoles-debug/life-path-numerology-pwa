'use strict';
// 用法：node scripts/run-job.js news | linkcheck | lvr [季別，例如 114S2]
const db = require('../src/db');
const scheduler = require('../src/scheduler');

const [name, season] = process.argv.slice(2);
if (!scheduler.JOBS[name]) {
  console.error(`用法：node scripts/run-job.js ${Object.keys(scheduler.JOBS).join(' | ')} [季別]`);
  process.exit(1);
}
db.open();
scheduler.runJob(name, season ? { season } : undefined).then((r) => {
  console.log(r.ok ? '✔' : '✘', r.message);
  process.exit(r.ok ? 0 : 1);
});
