/**
 * Models Index — Export all shared Mongoose models.
 */

module.exports = {
  Worker: require('./Worker'),
  Contractor: require('./Contractor'),
  Dispute: require('./Dispute'),
  Grievance: require('./Grievance'),
  Job: require('./Job'),
  Session: require('./Session'),
  SafetyEvent: require('./SafetyEvent'),
  Toli: require('./Toli'),
  SkillProgress: require('./SkillProgress'),
  MigrationAdvisory: require('./MigrationAdvisory'),
};
