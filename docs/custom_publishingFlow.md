
# Deploy your SPFx project to a DEV environment

For SPFx projects, `rush build` invokes `gulp bundle`, as defined in each project's package.json file. Each changed project will be rebuilt, but you will have mismatching versions in `/config/package-solution.json` and `package.json`.
> See [How to version new SharePoint Framework projects](https://n8d.at/how-to-version-new-sharepoint-framework-projects) for details on SPFx projects versioning.

## 1. Prepare for deployment

Before deploying new version of your solution, you have to update the version number in `/config/package-solution.json`. Otherwise, you would need to uninstall your solution, delete it from Recycle Bin, and delete it from the 2nd stage Recycle Bin.

### `dist:package --prerelease` + `spfx:package-dev`

- builds and packages changed projects using bulk command referenced in `--package-command` parameter
- `spfx:package-dev`, bumps the revision number in `/config/package-solution.json` of changed projects
- copies packages to a target location using rush command  defined in `--copy-command` parameter.

```sh
# prepare your projects for deployment to a Dev environment
# package-solution.json version: major.minor.patch.revision+

$copiedFiles = "./sharepoint/solution/*.sppkg,./sharepoint/assets/elements.xml"
$targetFolder="C:\MyArtifacts"

rush dist:package --prerelease `
  --package-command 'spfx:package-dev' `
  --copy-command "spfx:copy --target-folder $targetFolder --copied-files $copiedFiles" `
  --quiet
```

Now you can use the .sppkg packages and deploy them to your Dev environment for testing

#### `spfx:package-dev`

Bumps revision version for each **changed** project, and creates a package for deployment.

Navigate to your project. If the version number in `package.json` is **0.0.1**, then the version in `/config/package-solution.json` is set to **0.0.1.0**.
Make some changes in your project and run `rush spfx:package-dev` again. The version should now be set to **0.0.1.1**.
> If you invoke `rush build` or `gulp bundle` without `--ship` parameter, the `setVersion` will not update solution version in `/config/package-solution.json`.

#### `spfx:copy`

Copies your packages, saved under `sharepoint/solution`, to a target location. You may now deploy them to a target environment.
> Saving packages in a target location may be useful if you want to automate deployment with a CI/CD pipeline.

## 2. Provide change files

Once you are ready to created Pull Request, you should create change files for all changed projects.

Rush [publishing workflow](https://rushjs.io/pages/maintainer/publishing/) requires developers to provide change files and it's recommended to create branch policy on `main` branch, that invokes `rush change --verify`.

You may consider using `rush whatchanged` custom command, created by  [rush-conventionalcommits](https://www.npmjs.com/package/generator-rush-conventionalcommits) generator, if you want to see what exactly has changed, and what change type you should use. **Note** this generator configures `commitlint`.

> Remember to commit the newly generated change files!

```sh
rush change

git add .
git commit -m "..."
git push
```

You will find your change fules in `common/changes` folder. If you invoke `rush change` or `rush dist:package --prerelease` now, there will be no changed projects detected.

# Deploy your project to a PRODUCTION environment

## 1. Update changelogs, bump versions

Rush [publishing workflow](https://rushjs.io/pages/maintainer/publishing/) defines that a change manager generates a changelog, increases version and [publishes](https://rushjs.io/pages/maintainer/publishing/#2-publish-packages) the packages using `rush publish`.
When using versioning policies, [two steps](https://rushjs.io/pages/maintainer/publishing/#publishing-process-when-version-policies-are-used) are required: `rush version --bump` and `rush publish --include-all`.
However, if you are using `individualVersion` versioning policy, you may actually want to only package and deploy changed projects.

Another issue is that `rush publish` either publishes packages to a registry, or saves them locally as `.tgz` files. This doesn't fit into SharePoint deployment model.

The `rush dist:package` command provides publishing flow more suited to SPFx projects. It detects changed projects based on each project's version number (package.json) and corresponding project tag in rush.json.

**Important:** `rush dist:package`, when publishing stable versions (is invoked **without** `--prerelease`), updates and commits `rush.json` and `changelog.md` files .

```sh
# as a Release Manager, you are ready to prepare new release
# If you specify --target-branch BRANCH, changes will be committed and merged into the target branch
rush version --bump [--target-branch BRANCH]
# CHANGELOG.json and CHANGELOG.md files are updated based on the change files
# Manually update CHANGELOG.json if necessary
```

> If you need to make changes to the changelog, this is the time.
CHANGELOG.md will be always **updated based on CHANGELOG.json**, so make sure you **only edit CHANGELOG.json**.

## 2. Prepare for deployment

Before deploying new version of your solution, you have to update the version number in `/config/package-solution.json` to match recently increased version in `package.json`.

`dist:package` + `spfx:package`:

```sh
# prepare your projects for deployment to a Productive environment
# package-solution.json version: major.minor.patch.revision+

$copiedFiles = "./sharepoint/solution/*.sppkg,./sharepoint/assets/elements.xml"
$targetFolder="C:\MyArtifacts"

rush dist:package `
  --package-command 'spfx:package' `
  --copy-command "spfx:copy --target-folder $targetFolder --copied-files $copiedFiles" `
  --quiet
```

### rush spfx:package

`spfx:package` copies version from `package.json` to the `/config/package-solution.json`, making sure it has `major.minor.patch.0` format. Revision numbers are bumped for deployments to a development environment only.

### rush spfx:copy

`spfx:copy` copies your packages, saved under `sharepoint/solution`, to a target location. You may now deploy them to a target environment.
