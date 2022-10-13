# spfx bulk commands

> Rush "bulk" commands are invoked separately for each project.  Rush will look in each project's package.json file for a "scripts" entry whose name matches the command name.  By default, the command will run for every project in the repo, according to the dependency graph (similar to how "rush build" works). The set of projects can be restricted e.g. using the "--to" or "--from" parameters.
>
>See [Custom commands](https://rushjs.io/pages/maintainer/custom_commands/) for information on writing and using custom commands.

The following rush bulk commands are provisioned if you choose **spfx bulk commands** configuration:

## `spfx:package` and  `spfx:package-dev`

```txt
usage: rush spfx:package [-h] [-p COUNT] [--timeline] [-t PROJECT]
                         [-T PROJECT] [-f PROJECT] [-o PROJECT] [-i PROJECT]
                         [-I PROJECT]
                         [--to-version-policy VERSION_POLICY_NAME]
                         [--from-version-policy VERSION_POLICY_NAME] [-v]
                         [--ignore-hooks] [-q]

Creates SPFx packages by running spfx:package command. Invokes 'gulp clean &&
gulp bundle --ship && gulp package-solution --ship' command.

```

> The `spfx:package` and  `spfx:package-dev` have all the usual parameters by default enabled for bulk commands, plus `--quiet`.
>
>`spfx:package-dev`, bumps the revision number in `/config/package-solution.json` of changed projects, and `spfx:package` copies version from `package.json` to the `/config/package-solution.json` in `major.minor.patch.0` format.
>
>To make sure that these changes will not be detected by `rush change`, the `package-solution.json` files are registered in [rush-project.json (experimental)](https://rushjs.io/pages/configs/rush-project_json) files specific to individual projects.

## Package SPFx solution

```bash
# build prerelease
rush spfx:package-dev
# build stable
rush spfx:package
```

These commands may be provided to `dist:package` using the `--package-command` parameter, to be executed for each changed project.
They run individually for each project in the repo. Rush looks for a corresponding script name in each project's **package.json** file.

```bash
## Prerelease -------------------
# package ALL as prerelease
rush dist:package --include-all --prerelease `
  --package-command 'spfx:package-dev'

# package ALL projects WITH version policy:
rush dist:package --include-all --prerelease --version-policy 'SPFx' `
  --package-command 'spfx:package-dev'

#  package CHANGED as prerelease
rush dist:package --prerelease `
  --package-command 'spfx:package-dev'

## Stable -------------------
# package ALL as stable
rush dist:package --include-all `
  --package-command 'spfx:package-dev'

# package ALL projects WITH version policy:
rush dist:package --include-all --version-policy 'SPFx' `
  --package-command 'spfx:package-dev'

#  package CHANGED as stable
rush dist:package `
  --package-command 'spfx:package-dev'
```

### `spfx:package` in package.json

Corresponding commands are added to `package.json` files for each selected project and may be adjusted as needed.

```json
  "scripts": {
    "spfx:package": "gulp clean && gulp bundle --ship && gulp package-solution --ship",
    "spfx:package-dev": "gulp clean && gulp bundle --ship --prerelease && gulp package-solution --ship",
  }
```

## `spfx:copy`

The `spfx:copy` comand has all the usual parameters enabled for bulk commands, plus `--target-folder` and `--copied-files`.

```txt
usage: rush spfx:copy [-h] [-p COUNT] [--timeline] [-t PROJECT] [-T PROJECT]
                      [-f PROJECT] [-o PROJECT] [-i PROJECT] [-I PROJECT]
                      [--to-version-policy VERSION_POLICY_NAME]
                      [--from-version-policy VERSION_POLICY_NAME] [-v]
                      [--ignore-hooks] --target-folder FOLDER_PATH
                      --copied-files FILE_FILTER

Copies files specified in '--copied-files' parameter to the target
destination specified in '--target-folder'. Invokes 'gulp copySPFx' command.

Arguments:
  --target-folder FOLDER_PATH
                        (Optional) Location to deploy packaged solution. If
                        relative, it is relative to each project's directory.
                        If --copy-command is used, this parameter is required.
  --copied-files FILE_FILTER
                        (Optional) Filter to select files to copy. Must be
                        relative to the project folder. If --copy-command is
                        used, this parameter is required.
```

>If relative path is specified in `--target-folder` parameter, the files will be copied to folders relative to each project's directory.

Bulk command copying solution assets to a target location.
May be provided to  `dist:package` using the `--copy-command` parameter.

## Copy packages to target location

```bash
rush spfx:copy  `
  --target-folder "C:\temp" `
  --copied-files "./sharepoint/solution/*.sppkg,./sharepoint/assets/elements.xml"  `
```

This command may be provided to `dist:package` using the `--copy-command` parameter.
It runs individually for each project in the repo. Rush looks for a corresponding script name in each project's **package.json** file.

```bash
rush dist:package --include-all --prerelease `
  --package-command 'spfx:package-dev' `
  --copy-command 'spfx:copy --target-folder "C:\temp" --copied-files "./sharepoint/solution/*.sppkg,./sharepoint/assets/elements.xml"'
```

### `spfx:copy` in package.json

This command is added to `package.json` file for each selected project and may be adjusted as needed.

```json
  "scripts": {
     "spfx:copy": "gulp copySPFx"
  }
```

## Additional resources

### gulpfile.js tasks

These tasks are added to gulpfile.js of each selected SPFx project by the SPFx subgenerator.

#### set-version

**set-version** subtask is invoked during `gulp bundle`. It either copies or bumps revision version in the `/config/package-solution.json`, based on the `package.json` version. The task is defined in **gitTasks/set-version.js** file and integrated into SPFx toolchain as described [here](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/toolchain/integrate-gulp-tasks-in-build-pipeline).

```js
const { setVersion } = require('../../gulpTasks/set-version');
let setVersionSubTask = build.subTask('set-version-subtask', setVersion);
let setVersionTask = build.task('set-version', setVersionSubTask);

build.rig.addPreBuildTask(setVersionTask);
```

#### copySPFx

**copySPFx** task is invoked by `spfx:copy` rush command and copies files defined in `--copied-files` parameter to a target folder specified in `--target-folder` .

```js
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
```

### set-version.js

**gulpTasks/set-version.js** script reads version from **package.json** and depending on the presence of `--prerelease` flag, either copies the version or bumps revision version in the `/config/package-solution.json`.

When invoking `gulp serve` manually, revision version will be increased constantly during development and testing in your local environment. Once you commit your changes, the CI/CD deployment doesn't have to increase versions to ensure successfull deploymnet, as your current vcersion and the installed version are different.

Alternative approach, increasing revision version in the CI/CD pipeline, would lead to merge conflicts.

The `--prerelease` flag is used by CI/CD pipelines in `features/*` branches to ensure the versions are not updated in the `/config/package-solution.json` files

```js
const ship = buildOptions.args["ship"];
const prerelease = buildOptions.args["prerelease"];

if (prerelease === true) {
    console.log('CI for prerelease version, do not update versions in package-solution.json');
}
else {
    // spfx:package
    if (ship === true) {
        versionSync();
    }
    // manually gulp serve || gulp bundle
    if (ship === undefined) {
        versionRevision();
    }
}

return gulp.src('./config/package-solution.json')
    .pipe(gulp.dest('./config'))
```

### rush version policy

Creates  **individualVersion** version policy named **SPFx**
