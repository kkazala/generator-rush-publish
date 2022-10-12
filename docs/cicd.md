# Automation

Just like regular rush commands, you may use the custom commands in your pipelines:

```yml
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

You may find example azure pipelines in [azure-pipelines](../azure-pipelines/) folder.
> **Important**: New pipelines created after the September 2022 Azure DevOps sprint 209 update have Shallow fetch enabled by default and configured with a depth of 1.
>
>See [Shallow fetch](https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines#shallow-fetch)
