# Rush global commands

Rush global commands are invoked once for the entire repo.
See [Custom commands](https://rushjs.io/pages/maintainer/custom_commands/) for information on writing and using custom commands.

## `dist:package`

```txt
usage: rush dist:package [-h] --package-command COMMAND
                         [--copy-command COMMAND] [--include-all]
                         [--prerelease] [-t SUFFIX] [-b BRANCH]
                         [--version-policy POLICY] [-q] [-v]

Runs --package-command to build and package solution; then (optionally) runs
--copy-command to copy the --copied-files to --target-folder.
The --package-command and --copy-command must be rush "bulk" commands.

By default, custom "bulk" commands will run for every project in the repo, according to the dependency graph (similar to how "rush build" works).
Unless "--include-all" is specified, "dist:package" restricts the set of projects using the "--only" parameter. The target projects are detected based on each project's version number (package.json) and corresponding project tag in rush.json.

"Bulk" commands are invoked separately for each project from the context of the project. If "--target-folder" is a relative path, the folder will be created under each project's folder. To save the packages in one shared location, specify absolute path.

Optional arguments:
  -h, --help            Show this help message and exit.
  -q, --quiet           suppress startup information
  --package-command COMMAND
                        (Required) Rush bulk command to execute when
                        packaging the projects.
  --copy-command COMMAND
                        (Optional) Rush bulk command to execute when copying
                        the projects.
  --prerelease          (Optional) Build a prerelease version of the solution.
                         No tagging, no changelog updates, version is not set
                        as tag in rush.json.
  -t SUFFIX, --suffix SUFFIX
                        (Optional) Append a suffix to all changed versions.
  -b BRANCH, --target-branch BRANCH
                        If this parameter is specified, compare the checked
                        out branch with the specified branch to determine
                        which projects were changed. If this parameter is not
                        specified, the checked out branch is compared against
                        the "main" branch.
  --include-all         (Optional) If this flag is specified, all packages
                        with shouldPublish=true in rush.json or with a
                        specified version policy will be published if their
                        version is newer than published version.
  --version-policy POLICY
                        Version policy name. Only projects with this version
                        policy will be published if used with --include-all.
  -v, --verbose         Display the logs during the build, rather than just
                        displaying the build status summary

```

**Note:** The commands defined in `--package-command` and `--copy-command` parameters must be **existing rush bulk commands** defined in `command-line.json`.
The `dist:package` simply invokes them without appending any additional parameters. They could be called `--command1` and `--command2` just as well.

## Publishing prerelease

### Package all as prerelease

```bash
rush dist:package --include-all --prerelease `
  --package-command 'my-bulk-command' `
  --copy-command 'my-bulk-copyCommand'
# if your bulk command accepts parameters:
rush dist:package --include-all --prerelease `
  --package-command 'my-bulk-command --param1 --param2' `
  --copy-command 'my-bulk-copyCommand --param1 --param2'
# package only projects with version policy:
rush dist:package --include-all --prerelease --version-policy 'MyLibraries' `
  --package-command 'my-bulk-command' `
  --copy-command 'my-bulk-copyCommand --param1 --param2'
```

- retrieves a list of **all projects** managed by rush; if `--version-policy` is specified, selects all projects using the version policy
- invokes bulk `--package-command` command
- invokes bulk `--copy-command` (this command is optional)

This approach simplifies testing process, when a solution should be deployed to a testing environment before being released.

### Package changed as prerelease

```bash
rush dist:package --prerelease `
  --package-command 'my-bulk-command'`
  --copy-command 'my-bulk-copyCommand'
# or, if your bulk command accepts parameters:
rush dist:package --prerelease `
  --package-command 'my-bulk-command --param1 --param2'`
   --copy-command 'my-bulk-copyCommand --param1 --param2'
```

- gets **changed projects only**
- invokes bulk `--package-command` command
- invokes bulk `--copy-command` (this command is optional)

### How are changed projects detected in `--prerelease`?

**Changed projects** are detected using [ProjectChangeAnalyzer.getChangedProjectsAsync](https://api.rushstack.io/pages/rush-lib.projectchangeanalyzer.getchangedprojectsasync/) which returns projects that have changed in the current state of the repo when compared to the specified branch.
If `--target-branch` is specified, it compares the checked out branch with the specified branch to determine which projects were changed. Otherwise, the checked out branch is compared against the `main` branch.

## Publishing stable

### Publish all as stable

>Execute this command after `rush version`, to package and deploy release versions of the project.

```bash
# package all projects and copy the resulting files to specified location
rush dist:package --include-all `
  --package-command 'my-bulk-command' `
  --copy-command 'my-bulk-copyCommand'
# or, if your bulk commands accept parameters:
rush dist:package --include-all `
  --package-command 'my-bulk-command --param1 --param2' `
  --copy-command 'my-bulk-copyCommand --param1 --param2'
# package only projects with version policy:
rush dist:package --include-all --version-policy 'MyLibraries' `
  --package-command 'my-bulk-command' `
  --copy-command 'my-bulk-copyCommand'
```

- retrieves a list of **all projects** managed by rush; if `--version-policy` is specified, selects all projects using the version policy
- regenerates `CHANGELOG.md` files in case `CHANGELOG.json` files have been manually updated afer `rush version`,
- invokes bulk `--package-command` command
- invokes bulk `--copy-command` (this command is optional)
- tags the projects
- saves new tag values in `rush.json`
- commits `CHANGELOG.md`, `CHANGELOG.json` and `rush.json` files

### Publish changed as stable

```bash
# package changed projects and copy the resulting files to specified location
rush dist:package `
  --package-command 'my-bulk-command' `
  --copy-command 'my-bulk-copyCommand'
# or, if your bulk command accepts parameters:
rush dist:package `
  --package-command 'my-bulk-command --param1 --param2' `
  --copy-command 'my-bulk-copyCommand --param1 --param2'
# package only projects with version policy:
rush dist:package --version-policy 'MyLibraries' `
  --package-command 'my-bulk-command' `
  --copy-command 'my-bulk-copyCommand'
```

- retrieves a list of **changed projects** comparing project's version with a  `published_v{versionNumber}` tag,
- regenerates `CHANGELOG.md` files in case `CHANGELOG.json` files have been manually updated afer `rush version`,
- invokes bulk `--package-command` command
- invokes bulk `--copy-command` (this command is optional)
- tags changed projects
- saves new tag value for changed projects to `rush.json`
- commits `CHANGELOG.md`, `CHANGELOG.json` and `rush.json` files

### How are changed projects detected?

Since the change files are deleted during `rush version`, `rush dist:package` detects changed projects by comparing versions in each project's `package.json` file with a project's tags in the `rush.json` file. If no appropriate tags are found in `rush.json`, the project will be published.

> This command should be executed after `rush version`, to package and deploy release versions of the projects.
