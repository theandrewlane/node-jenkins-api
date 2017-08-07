const async = require('async');
const fs = require('fs');
const chai = require('chai');
const expect = chai.expect;

const chaiLike = require('chai-like');
const chaiThings = require('chai-things');

chai.use(chaiLike);
chai.use(chaiThings);

const jenkinsapi = require('../lib/main');
const JENKINS_URL = 'http://localhost:8080';

// var USER = 'jenkins';
// var TOKEN = 'a5af9f12a1723c2a45c4c6bfd88d0044';
// var JENKINS_URL = "http://" + USER + ":" + TOKEN + "@localhost:8080";

const JOB_NAME_TEST = 'asrwqersfdzdraser-test';
const JOB_NAME_NEW = 'asrwqersfdzdraser-test-new';
const JOB_NAME_COPY = 'asrwqersfdzdraser-test-copy';
const JOB_NAME_REPORT = 'asrwqersfdzdraser-test-with-report';

const TEST_CONFIG_XML_FILE = 'test/test_config.xml';
const TEST_WITH_PARAMS_CONFIG_XML_FILE = 'test/test_with_params_config.xml';
const TEST_WITH_REPORT_CONFIG_XML_FILE = 'test/test_with_report_config.xml';
const DEVELOPMENT_PROJECT_XML_CONFIG
  = '<?xml version="1.0" encoding="UTF-8"?><project><description>development</description></project>';
const ORIGINAL_DESCRIPTION = 'development';
const REPLACED_DESCRIPTION = 'feature';

describe('Node Jenkins API', function () {

  let jenkins;

  before(function (done) {

    it('Should exist', function () {
      expect(jenkinsapi.init).to.be.a('function');
    });

    jenkins = jenkinsapi.init(JENKINS_URL);

    expect(jenkins.delete_job).to.be.a('function');
    expect(jenkins.all_jobs).to.be.a('function');

    async.waterfall([
      (next) => {
        // Ignoring 404 errors
        async.parallel([
          (cb) => jenkins.delete_job(JOB_NAME_TEST, () => cb()),
          (cb) => jenkins.delete_job(JOB_NAME_NEW, () => cb()),
          (cb) => jenkins.delete_job(JOB_NAME_COPY, () => cb())
        ], () => next());
      },
      (next) => {
        fs.readFile(TEST_CONFIG_XML_FILE, 'utf8', next);
      },
      (xmlConfig, next) => {
        jenkins.create_job(JOB_NAME_TEST, xmlConfig, next);
      },
      (data, next) => {
        jenkins.all_jobs(next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_TEST });
        next();
      }
    ], done);
  });

  it('Should show all jobs', function (done) {
    expect(jenkins.all_jobs).to.be.a('function');

    jenkins.all_jobs(function (error, data) {
      expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_TEST });
      done(error);
    }); // all_jobs
  });


  it('Should read xml of existing job', function (done) {
    expect(jenkins.get_config_xml).to.be.a('function');

    jenkins.get_config_xml(JOB_NAME_TEST, function (error, data) {
      expect(data).to.be.a('string').that.contains(ORIGINAL_DESCRIPTION);
      done(error);
    }); // get_config_xml
  });


  it('Should show job info', function (done) {
    expect(jenkins.job_info).to.be.a('function');

    jenkins.job_info(JOB_NAME_TEST, function (error, data) {
      expect(data).to.be.an('object').like({ name: JOB_NAME_TEST, description: ORIGINAL_DESCRIPTION });
      done(error);
    }); // job_info
  });


  it('Should create and delete job', function (done) {
    expect(jenkins.create_job).to.be.a('function');
    expect(jenkins.delete_job).to.be.a('function');

    async.waterfall([
      (next) => {
        jenkins.create_job(JOB_NAME_NEW, DEVELOPMENT_PROJECT_XML_CONFIG, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_NEW });
        jenkins.all_jobs(next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_NEW });
        jenkins.delete_job(JOB_NAME_NEW, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_NEW });
        jenkins.all_jobs(next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.does.not.contain.something.like({ name: JOB_NAME_NEW });
        next();
      }
    ], done);
  });


  it('Should copy job', function (done) {
    expect(jenkins.copy_job).to.be.a('function');

    async.waterfall([
      (next) => {
        jenkins.copy_job(
          JOB_NAME_TEST,
          JOB_NAME_COPY,
          (data) => data.replace(ORIGINAL_DESCRIPTION, REPLACED_DESCRIPTION),
          next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_COPY });
        jenkins.get_config_xml(JOB_NAME_COPY, next);
      },
      (data, next) => {
        expect(data).to.be.a('string').that.contains(REPLACED_DESCRIPTION);
        jenkins.delete_job(JOB_NAME_COPY, next);
      }
    ], done);
  });


  it('Should update job config', function (done) {
    expect(jenkins.update_config).to.be.a('function');

    async.waterfall([
      (next) => {
        jenkins.copy_job(JOB_NAME_TEST, JOB_NAME_COPY, (data) => data, () => next());
      },
      (next) => {
        jenkins.update_config(JOB_NAME_COPY, (data) => data.replace(ORIGINAL_DESCRIPTION, REPLACED_DESCRIPTION), next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_COPY });
        jenkins.get_config_xml(JOB_NAME_COPY, next);
      },
      (data, next) => {
        expect(data).to.be.a('string').that.contains(REPLACED_DESCRIPTION);
        jenkins.delete_job(JOB_NAME_COPY, next);
      }
    ], done);
  });

  it('Should disable/enable job', function (done) {
    expect(jenkins.disable_job).to.be.a('function');
    expect(jenkins.enable_job).to.be.a('function');

    async.waterfall([
      (next) => {
        jenkins.copy_job(JOB_NAME_TEST, JOB_NAME_COPY, (data) => data, next);
      },
      (data, next) => {
        jenkins.disable_job(JOB_NAME_COPY, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_COPY, color: 'disabled', buildable: false });
        jenkins.enable_job(JOB_NAME_COPY, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_COPY }).and.not.like({ color: 'disabled' });
        jenkins.delete_job(JOB_NAME_COPY, next);
      }
    ], done);
  });


  const TEST_VIEW_NAME = 'ewoiurewlkjr-test-view';
  const TEST_VIEW_CONF = {
    name: TEST_VIEW_NAME,
    description: `This is the ${TEST_VIEW_NAME} job-in-jenkins View`,
    statusFilter: '',
    'job-in-jenkins': true,
    useincluderegex: true,
    includeRegex: 'prefix.*',
    columns: [{
      'stapler-class': 'hudson.views.StatusColumn',
      $class: 'hudson.views.StatusColumn'
    },
    {
      'stapler-class': 'hudson.views.WeatherColumn',
      $class: 'hudson.views.WeatherColumn'
    },
    {
      'stapler-class': 'hudson.views.JobColumn',
      $class: 'hudson.views.JobColumn'
    }, {
      'stapler-class': 'hudson.views.LastSuccessColumn',
      $class: 'hudson.views.LastSuccessColumn'
    },
    {
      'stapler-class': 'hudson.views.LastFailureColumn',
      $class: 'hudson.views.LastFailureColumn'
    },
    {
      'stapler-class': 'hudson.views.LastDurationColumn',
      $class: 'hudson.views.LastDurationColumn'
    },
    {
      'stapler-class': 'hudson.views.BuildButtonColumn',
      $class: 'hudson.views.BuildButtonColumn'
    }]
  };

  it('Should CRUD a view', function (done) {
    expect(jenkins.create_view).to.be.a('function');
    expect(jenkins.view_info).to.be.a('function');
    expect(jenkins.all_views).to.be.a('function');
    expect(jenkins.update_view).to.be.a('function');
    expect(jenkins.delete_view).to.be.a('function');


    async.waterfall([
      (next) => {
        jenkins.delete_view(TEST_VIEW_NAME, () => next()); // Ignoring error
      },
      (next) => {
        jenkins.create_view(TEST_VIEW_NAME, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });
        jenkins.view_info(TEST_VIEW_NAME, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });
        jenkins.all_views(next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.contains.something.like({ name: TEST_VIEW_NAME });
        jenkins.update_view(TEST_VIEW_NAME, TEST_VIEW_CONF, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });
        jenkins.delete_view(TEST_VIEW_NAME, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });
        jenkins.all_views(next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.does.not.contain.something.like({ name: TEST_VIEW_NAME });
        next();
      }
    ], done);
  });

  it('Should add/remove and list jobs in view', function (done) {
    expect(jenkins.all_jobs_in_view).to.be.a('function');
    expect(jenkins.add_job_to_view).to.be.a('function');
    expect(jenkins.remove_job_from_view).to.be.a('function');

    async.waterfall([
      (next) => {
        jenkins.delete_view(TEST_VIEW_NAME, () => next()); // Ignoring error
      },
      (next) => {
        jenkins.create_view(TEST_VIEW_NAME, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });
        jenkins.add_job_to_view(TEST_VIEW_NAME, JOB_NAME_TEST, next);
      },
      (data, next) => {
        jenkins.all_jobs_in_view(TEST_VIEW_NAME, next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.contains.something.like({ name: JOB_NAME_TEST });
        jenkins.remove_job_from_view(TEST_VIEW_NAME, JOB_NAME_TEST, next);
      },
      (data, next) => {
        jenkins.all_jobs_in_view(TEST_VIEW_NAME, next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.does.not.contain.something.like({ name: JOB_NAME_TEST });
        jenkins.delete_view(TEST_VIEW_NAME, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: TEST_VIEW_NAME });
        next();
      }
    ], done);
  });


  const APPROX_JOB_RUN_TIME = 11000;
  const APPROX_JOB_STOP_TIME = 2000;
  const START_TO_END_JOB_TIME = 14000;

  it('Should start/stop and list builds', function (done) {
    expect(jenkins.build).to.be.a('function');
    expect(jenkins.job_info).to.be.a('function');
    expect(jenkins.queue_item).to.be.a('function');
    expect(jenkins.all_builds).to.be.a('function');
    expect(jenkins.build_info).to.be.a('function');
    expect(jenkins.stop_build).to.be.a('function');
    expect(jenkins.console_output).to.be.a('function');
    expect(jenkins.last_build_info).to.be.a('function');
    expect(jenkins.delete_build).to.be.a('function');

    let queueId, buildId;

    async.waterfall([
      (next) => {
        jenkins.build(JOB_NAME_TEST, next);
      },
      (data, next) => {
        expect(data).to.be.an('object');
        expect(data.queueId).to.be.a('number');
        // Store queueId
        queueId = data.queueId;
        jenkins.job_info(JOB_NAME_TEST, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_TEST });
        expect(data.queueItem).to.be.an('object').like({ _class: 'hudson.model.Queue$WaitingItem', id: queueId });
        jenkins.queue_item(queueId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ id: queueId });
        setTimeout(next, APPROX_JOB_RUN_TIME);
      },
      (next) => {
        jenkins.queue_item(queueId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ id: queueId });
        expect(data.executable).to.be.an('object');
        expect(data.executable.number).to.be.a('number');
        // Store buildId
        buildId = data.executable.number;
        jenkins.job_info(JOB_NAME_TEST, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ name: JOB_NAME_TEST });
        expect(data.lastBuild).to.be.an('object').like({ _class: 'hudson.model.FreeStyleBuild' });
        expect(data.lastBuild.number).to.equal(buildId);
        jenkins.all_builds(JOB_NAME_TEST, next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.contains.something.like({ id: `${buildId}` });
        jenkins.build_info(JOB_NAME_TEST, buildId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ number: buildId, building: true, result: null });
        jenkins.stop_build(JOB_NAME_TEST, buildId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ body: `Build ${buildId} stopped.` });
        setTimeout(next, APPROX_JOB_STOP_TIME);
      },
      (next) => {
        jenkins.build_info(JOB_NAME_TEST, buildId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ number: buildId, building: false, result: 'ABORTED' });
        jenkins.console_output(JOB_NAME_TEST, buildId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object');
        expect(data.body).to.be.a('string').that.contains('sleep 60');
        jenkins.last_build_info(JOB_NAME_TEST, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ number: buildId, building: false, result: 'ABORTED' });
        jenkins.delete_build(JOB_NAME_TEST, buildId, next);
      },
      (data, next) => {
        jenkins.all_builds(JOB_NAME_TEST, next);
      },
      (data, next) => {
        expect(data).to.be.an('array').that.does.not.contain.something.like({ id: `${buildId}` });
        next();
      }
    ], done);
  }).timeout(START_TO_END_JOB_TIME);


  it('Should build with params', function (done) {
    const SLEEP_TIME = 123;
    let queueId, buildId;

    async.waterfall([
      (next) => {
        fs.readFile(TEST_WITH_PARAMS_CONFIG_XML_FILE, 'utf8', next);
      },
      (xmlConfig, next) => {
        jenkins.create_job(JOB_NAME_NEW, xmlConfig, next);
      },
      (data, next) => {
        jenkins.build_with_params(JOB_NAME_NEW, { sleep_time: SLEEP_TIME }, next);
      },
      (data, next) => {
        expect(data).to.be.an('object');
        expect(data.queueId).to.be.a('number');
        // Store queueId
        queueId = data.queueId;
        setTimeout(next, APPROX_JOB_RUN_TIME);
      },
      (next) => {
        jenkins.queue_item(queueId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ id: queueId });
        expect(data.executable).to.be.an('object');
        expect(data.executable.number).to.be.a('number');
        // Store buildId
        buildId = data.executable.number;
        jenkins.console_output(JOB_NAME_NEW, buildId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object');
        expect(data.body).to.be.a('string').that.contains(`sleep ${SLEEP_TIME}`);
        jenkins.delete_job(JOB_NAME_NEW, next);
      }
    ], done);
  }).timeout(START_TO_END_JOB_TIME);

  // Use for onetime tasks do this
  it('Should show a test report', function (done) {
    let queueId, buildId;

    async.waterfall([
      (next) => {
        fs.readFile(TEST_WITH_REPORT_CONFIG_XML_FILE, 'utf8', next);
      },
      (xmlConfig, next) => {
        jenkins.create_job(JOB_NAME_REPORT, xmlConfig, next);
      },
      (data, next) => {
        jenkins.build(JOB_NAME_REPORT, next);
      },
      (data, next) => {
        expect(data).to.be.an('object');
        expect(data.queueId).to.be.a('number');
        // Store queueId
        queueId = data.queueId;
        // Wait for the job to finish
        setTimeout(next, APPROX_JOB_RUN_TIME);
      },
      (next) => {
        jenkins.last_build_info(JOB_NAME_REPORT, next);
      },
      (data, next) => {
        expect(data).to.be.an('object').like({ queueId: queueId, result: 'SUCCESS' });
        expect(data.number).to.be.a('number');
        // Store buildId
        buildId = data.number;
        jenkins.test_result(JOB_NAME_REPORT, buildId, next);
      },
      (data, next) => {
        expect(data).to.be.an('object')
          .like({ duration: 0.006, empty: false, failCount: 0, passCount: 1, skipCount: 0 });
        jenkins.delete_job(JOB_NAME_REPORT, next);
      }
    ], done);
  }).timeout(START_TO_END_JOB_TIME);

  // For onetime tasks do this
  // it.only('should do this', function(done) {
  //  jenkins.last_build_report(JOB_NAME_REPORT, function (error, data) {
  //    done();
  //  }); // queue_item
  // });

});
