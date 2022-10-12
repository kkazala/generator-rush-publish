# Automation

>There are two stages in a Rush publishing flow. The first stage is during development. Developers are asked to provide change files to track changes that deserve a space in change log. The second stage is at publishing time. Rush can be used to gather all change files to increase version, update change log, and publish new packages to a npm registry.
>
> How to enforce developers to provide change files
>
> `rush change --verify`
>
>This command fails if a developer modifies a public package without providing related change files. It is recommended to add this command as a step of CI builds so that build fails when change files are missing.
>
>[How to use Rush in your build flow to automate publishing of updated packages](https://rushjs.io/pages/maintainer/publishing)

## CI/CD

If you want to automatically build and deploy changed projects whenever you commit your changes to the features/* branch, you can use [CI/CD](../azure-pipelines/rush-publishx.yml) pipeline which will detect the branch you are on, and build, package and deploy prerelease versions to your Development SPO site.

Executing the below pipeline will invoke the following command:

```bash
rush dist:package --prerelease `
  --package-command spfx:package-dev `
  --copy-command spfx:copy `
  --target-folder /home/vsts/work/1/a `
  --copied-files ./sharepoint/solution/*.sppkg,./sharepoint/assets/elements.xml `
  --verbose
```

```yml
variables:
  - name: packageAll
    ${{ if eq(parameters.PackageAll, 'true') }}:
      value: '--include-all'
    ${{ else }}:
      value: ''
  # version policy is only useful with --include-all
  - name: versionPolicy
    ${{ if eq(parameters.PackageAll, 'true') }}:
      value: '--version-policy "MyLibraries" '
    ${{ else }}:
      value: ''
  - name: prerelease
    ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
      value: ''
    ${{ else }}:
      value: '--prerelease'
  - name: packageCommand
    ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
      value: 'spfx:package'
    ${{ else }}:
      value: 'spfx:package-dev'
  - name: verbose
    ${{ if eq(parameters.Verbose, 'true') }}:
      value: '--verbose'
    ${{ else }}:
      value: ''

trigger:
  branches:
    include:
    - features/*

steps:
  - checkout: self
    persistCredentials: true
    # https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines#remarks
    fetchDepth: 0

  - template: templates/prerequisites.yml
  - script: 'node common/scripts/install-run-rush.js install'
    displayName: 'Rush Install'
  - script: 'node common/scripts/install-run-rush.js build'
    displayName: 'Rush Build'

  - script: 'node common/scripts/install-run-rush.js dist:package ${{ variables.packageAll }} ${{ variables.prerelease }}
          ${{ variables.cmdPackage }} ${{ variables.cmdCopy }}
          ${{ variables.versionPolicy }} ${{ variables.verbose }}'
    displayName: 'Rush ${{ variables.packageCommand }}'

  #Publish artifacts
  - task: PublishBuildArtifacts@1
    inputs:
      artifactName: 'SPFx'
    displayName: 'Publish Artifact: SPFx'
```

## PR and branch policy

Once you are ready, you will create a Pull Request to merge your changes to the main branch.

To ensure that change files are generated before PR is completed, it's recommended to create a [PR](../azure-pipelines/pr.yml) pipeline that is used in [branch policy](https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops&tabs=browser#build-validation) on `main` branch.
If release managers manually execute `rush version`, you may want to exclude `releases/*` branch, becasue `rush change --verify` fill fail after the change files have been deleted.

```yml
trigger: none

variables:
  isPR: $[and(eq(variables['Build.Reason'], 'PullRequest'),startsWith(variables['System.PullRequest.SourceBranch'], 'refs/heads/features/'))]

jobs:
  - job: PRBuild
    condition: and(succeeded(),eq(variables.isPR, 'true'))

    steps:
      - checkout: self
        persistCredentials: true
        # https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines#remarks
        fetchDepth: 0
      - template: templates/prerequisites.yml

      - script: 'node common/scripts/install-run-rush.js change --verify '
        displayName: 'Verify Change Logs'

      - script: 'node common/scripts/install-run-rush.js install'
        displayName: 'Rush Install'
```

## Release management

As a release manager, you will now start preparing release.
Executing `rush version --bump` will update `changelog.json` and `changelog.md` for all changed projects, and delete the change files.
You may edit `changelog.json` file if you want to update the change log. Do NOT edit `changelog.md` directly, as it is alawys overrident based on the `changelog.json` file.

Unless you are allowed to commit directly to the `main`, you need to create a new branch for your release. If you are using the [PR](../azure-pipelines/pr.yml) pipeline described above, make sure that the branch you are working on for example `releases/*` and NOT `features/*`. You already deleted change files, and `rush change -v` will fail.

Once you are ready to publish and deploy stable version of your packages, you may manually start the  [CI/CD](../azure-pipelines/rush-publishx.yml). If invoked on the `main` branch, the following command will be invoked by the pipeline:

```bash
rush dist:package `
  --package-command spfx:package `
  --copy-command spfx:copy `
  --target-folder /home/vsts/work/1/a `
  --copied-files ./sharepoint/solution/*.sppkg,./sharepoint/assets/elements.xml `
  --verbose
```

## Important

You may find example azure pipelines in [azure-pipelines](../azure-pipelines/) folder.

New pipelines created after the September 2022 Azure DevOps sprint 209 update have Shallow fetch enabled by default and configured with a depth of 1.
See [Shallow fetch](https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines#shallow-fetch)
