'use strict';

const build = require('@microsoft/sp-build-web');
const fs = require('fs');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

var getTasks = build.rig.getTasks;
build.rig.getTasks = function () {
  var result = getTasks.call(build.rig);
  result.set('serve', result.get('serve-deprecated'));
  return result;
};

// ********* disable tslint for pnp V3*******
// https://pnp.github.io/pnpjs/getting-started/#spfx-version-1121-later
build.tslintCmd.enabled = false;
// ********* disable tslint *******


// ********* set version in package-solution.json *******
const { setVersion } = require('../../gulpTasks/set-version');
let setVersionSubTask = build.subTask('set-version-subtask', setVersion);
let setVersionTask = build.task('set-version', setVersionSubTask);

build.rig.addPreBuildTask(setVersionTask);
// ********* set version in package-solution.json  *******

// ********** copy *.sppkg to a directory
const gulp = require('gulp');
const argv = build.rig.getYargs().argv;

gulp.task('copySPFx', function () {
  console.log(`COPYING ${argv.copiedFiles} to ${argv.targetFolder}`)
  fs.mkdirSync(argv.targetFolder, { recursive: true });

  const pckg = require('./package.json')
  const copiedFiles = argv.copiedFiles.split(",")
  const pckgSolution = require('./config/package-solution.json')
  const folderName = `${argv.targetFolder}/${pckg.name}_${pckgSolution.solution.version}`

  console.log(`COPYING ${pckg.name} to ${folderName}`)
  return gulp.src(copiedFiles, { allowEmpty: true })
    .pipe(gulp.dest(folderName))
});

// ********** copy *.sppkg to a directory

build.initialize(gulp);
