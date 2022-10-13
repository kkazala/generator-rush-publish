const { utils, rushUtils } = require('./rush-package-utils');

class PublishChangedParams {
    getParams() {
        this.packageCommand = utils.getArg("packageCommand");
        this.copyCommand = utils.getArg("copyCommand");
        this.packageAll = utils.getArg("includeAll");
        this.prerelease = utils.getArg("prerelease");
        this.verbose = utils.getArg("verbose");
        this.suffix = utils.getArg("suffix");
        this.targetBranch = utils.getArg("targetBranch")
        this.versionPolicy = utils.getArg("versionPolicy") //only with include-all
    }

    validateOptionalParams() {
        if (this.versionPolicy !== undefined && this.packageAll === undefined) {
            console.log(utils.Colors.Yellow + 'Ignoring --version-Policy parameter; it is applied only if used with --include-all.' + utils.Colors.Reset)
        }
    }
}
/**
 * detect projects to publish
 * if packageAll: return all
 * if (packageAll && versionPolicy): return all using versionPolicy
 * if prerelease: ProjectChangeAnalyzer.getChangedProjectsAsync()
 * if (!packageAll && !prerelease): getChangedProjectReleases from package.json and rush.json tags
 * @param {*} packageAll: return all
 * @param {*} prerelease: ProjectChangeAnalyzer.getChangedProjectsAsync
 * @param {*} targetBranch: (optional) used with prerelease, e.g main, features/featureA
 * @param {*} versionPolicy: (optional) used with packageAll
 * @returns
 */
async function getRushProjects(packageAll, prerelease, targetBranch, versionPolicy) {
    // rushUtils.getChangedProjectsAsync requires target branch in a origin/branch name format
    return (packageAll)
        ? rushUtils.getRushProjects(versionPolicy)
        : (prerelease)
            ? await rushUtils.getChangedProjectsAsync(targetBranch || rushUtils.gitRemoteDefaultBranch)
            : rushUtils.getChangedProjectReleases();
}
/**
 * Ensure projects detected
 * otherwise exit
 */
function assertProjects(projects, packageAll) {
    if (projects.length == 0) {
        console.log(utils.Colors.Red + `No projects detected.` + utils.Colors.Reset)
        process.exit(0);
    }
    console.log(utils.Colors.Green + ((packageAll) ? `Publishing all projects: ${projects.length} ` : `Publishing changed projects: ${projects.length} `) + utils.Colors.Reset);
}

function getArgs(parameters, projects) {
    let args = [];
    if (!parameters.packageAll) {
        args = args.concat(projects.map(elem => `-o ${elem.packageName}`))
    }
    if (parameters.verbose === true) {
        args.push('-v');
    }
    return args;
}

async function PublishChanged() {

    const params = new PublishChangedParams();
    params.getParams();
    params.validateOptionalParams();

    //target branch in origin/branchName format
    const rushProjects = await getRushProjects(params.packageAll, params.prerelease, params.targetBranch, params.versionPolicy);
    // if no changed projects, exit(0)
    assertProjects(rushProjects, params.packageAll);

    const args = getArgs(params, rushProjects);

    if (params.prerelease === true) {
        console.log(utils.Colors.Green + `Publishing prerelease version` + utils.Colors.Reset)
        //for example spfx:package-dev
        rushUtils.packageProjects(params.packageCommand, args);
        if (params.copyCommand !== undefined) {
            //for example spfx:copy
            rushUtils.publishProjects(params.copyCommand, args);
        }
    }
    else {
        console.log(utils.Colors.Green + `Publishing stable version` + utils.Colors.Reset)
        rushUtils.regenerateChangeLogs();

        // if !params.targetBranch, changes are made locally and will NOT be commited
        //spfx:package
        rushUtils.packageProjects(params.packageCommand, args);
        //target branch in 'branchName' format
        rushUtils.tagChangedProjects(rushProjects, params.suffix, params.targetBranch);
        rushUtils.saveChangedProjects(targetBranch);

        if (params.copyCommand !== undefined) {
            //spfx:copy
            rushUtils.publishProjects(params.copyCommand, args);
        }
    }
}

PublishChanged();


