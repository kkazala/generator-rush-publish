const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const node_modules = path.join(__dirname, '..', 'autoinstallers/rush-publish/node_modules');
const rushLib = require(path.join(node_modules, '@microsoft/rush-lib'));
const rushCore = require(path.join(node_modules, '@rushstack/node-core-library'));

const DEFAULT_GIT_TAG_SEPARATOR = '_';
const TAG_PREFIX = 'published_v';
const COLORS = {
    Red: '\u001B[31m',
    Purple: '\u001B[35m',
    Green: '\u001B[32m',
    Yellow: '\u001B[33m',
    Gray: '\u001B[30;1m',
    Reset: '\u001B[0m'
};

class RushUtil {

    constructor() {
        this.rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() })
    }
    get gitVersionBumpCommitMessage() {
        return this.rushConfiguration.gitVersionBumpCommitMessage;
    }
    get gitRemoteDefaultRemote() {
        return this.rushConfiguration.repositoryDefaultRemote;
    }
    get gitRemoteDefaultBranch() {
        return `${this.rushConfiguration.repositoryDefaultRemote}/${this.rushConfiguration.repositoryDefaultBranch}`;
    }

    // get all projects managed by rush
    getRushProjects(versionPolicy) {
        // it is necessary to reload the rushConfiguration after project versions are updated:
        // this.rushConfiguration = rushLib.RushConfiguration.loadFromDefaultLocation({ startingFolder: process.cwd() })
        if (versionPolicy === undefined) {
            console.log("Get all projects managed by rush.")
            return this.rushConfiguration.projects.map(project => {
                return {
                    'packageName': project.packageName,
                    'version': project.packageJson.version
                };
            });
        }
        else {
            console.log(`Get all projects managed by rush with ${versionPolicy} versioning policy`)
            return this.rushConfiguration.projects
                .filter(project => project.versionPolicyName !== undefined && project.versionPolicyName === versionPolicy)
                .map(project => {
                    return {
                        'packageName': project.packageName,
                        'version': project.packageJson.version
                    };
                });
        }
    }
    // returns packageName and version of changed releases.
    // the project list is calculated based on differences between project's package.json and a "published_v" tag defined in rush.json
    getChangedProjectReleases() {
        console.log("Get all changed releases (compare versions in package.json and rush.json)")
        const changedProjects = this.rushConfiguration.projects.filter(project => {

            const newVerTag = `${TAG_PREFIX}${project.packageJson.version}`;
            return !project.tags.has(newVerTag)
        }).map(project => {
            return {
                'packageName': project.packageName,
                'version': project.packageJson.version
            }
        });
        return changedProjects;
    }
    // returns a list of changed projects
    // the project list is calculated by rush ProjectChangeAnalyzer
    // Gets a list of projects that have changed in the current state of the repo when compared to the specified branch
    async getChangedProjectsAsync(currentBranch) {
        // rushUtils.getChangedProjectsAsync requires target branch in a origin/branch name format
        currentBranch = this._ensureRemote(currentBranch);
        console.log(`Get all changed projects for branch ${currentBranch}`)

        const projectAnalyzer = new rushLib.ProjectChangeAnalyzer(this.rushConfiguration);
        const terminal = new rushCore.Terminal(new rushCore.ConsoleTerminalProvider({ verboseEnabled: false }));

        const changedProjects = await projectAnalyzer.getChangedProjectsAsync({
            targetBranchName: currentBranch,
            terminal: terminal,
            enableFiltering: false,
            includeExternalDependencies: false
        });

        const projectsInfo = [];
        changedProjects.forEach(project => {
            projectsInfo.push(
                {
                    'packageName': project.packageName,
                    'version': project.packageJson.version
                }
            );
        })
        return projectsInfo;
    }

    packageProjects(command, args) {
        const cmd = `${command} ${args.join(' ')}`;
        Util.executeCommand(`rush --quiet ${cmd}`);
    }
    publishProjects(command, args) {

        const cmd = `${command} ${args.join(' ')}`;
        Util.executeCommand(`rush --quiet ${cmd} `);
    }
    regenerateChangeLogs() {
        Util.executeCommand(`rush --quiet publish --regenerate-changelogs`);
    }
    tagChangedProjects(changedProjects, suffix, targetBranch) {

        changedProjects.forEach((project) => {
            const tagName = this._createTagName(project.packageName, project.version);
            if (!this._hasTag(tagName)) {
                this._addTag(project.version, project.packageName, suffix)
            }
            else {
                console.log(COLORS.Yellow + `tag ${tagName} already exists. Skipping.` + COLORS.Reset);
            }
        });
        const rushJsonPath = this.rushConfiguration.rushJsonFile; //The absolute path to the "rush.json"
        this._recordTagsInRushJson(changedProjects, rushJsonPath);
    }
    saveChangedProjects(targetBranch) {

        if (targetBranch !== undefined) {
            console.log(`* COMMIT changes to ${targetBranch}`)
            const tempBranch = 'version/bump-' + new Date().getTime();
            const rushJsonPath = this.rushConfiguration.rushJsonFile; //The absolute path to the "rush.json"

            //Make changes in temp branch
            this._checkout(tempBranch);
            Util.executeCommand(`git add "${rushJsonPath}"`);

            if (this._hasChanges('rush.json')) {
                Util.executeCommand(`git commit -m "${this.gitVersionBumpCommitMessage}"`); // --no-verify
                Util.executeCommand(`git push origin HEAD:${tempBranch} --follow-tags  --verbose `); // publishGit.push(tempBranch //  --no-verify
                // Now merge to target branch.
                console.log(`* MERGE to ${targetBranch}`)
                this._mergeToBranch(tempBranch, targetBranch);

                //delete temp branch
                console.log(`* DELETE  ${tempBranch}`)
                this._deleteBranch(tempBranch);                     //publishGit.deleteBranch(tempBranch,
                return true;
            }
            else {
                console.log(COLORS.Red + `rush.json has no changes, cannot be commited` + COLORS.Reset);
                return false;
            }
        }
        else {
            console.log("Changes made locally. Remember to commit.");
        }


    }
    _hasChanges(fileName) {
        //ensure rush.json is staged
        //if, during testing:
        // - you set tag in rush.json to new version number
        // - the saveChangedProjectsTags() set tag to the correct version
        // - the resulting rush.json is identical to the version from before your manual change
        // and in effect, it's removed from "changed files" index and cannot be commited
        const stagedFiles = this._getStagedInfo();
        return stagedFiles.includes(fileName);
    }
    _recordTagsInRushJson(changedProjects, rushJsonPath) {
        let publishedVersionUpdated = false;

        const rushJson = JSON.parse(
            Util.readJSONFile(rushJsonPath)
        );
        if (Array.isArray(rushJson.projects) && rushJson.projects.length > 0) {
            rushJson.projects.forEach(project => {
                if (changedProjects.some(elem => elem.packageName == project.packageName)) {
                    const newTag = changedProjects.filter(elem => elem.packageName == project.packageName).map(elem => `${TAG_PREFIX}${elem.version}`);
                    if (!project.tags?.includes(newTag)) {
                        if (project.tags === undefined) {
                            project.tags = []
                        }
                        project.tags = project.tags.filter(t => !t.startsWith(TAG_PREFIX)).concat(newTag); //remove previous TAG_PREFIX_ tags and add a new one
                        publishedVersionUpdated = true;
                    }
                }
            });
        }
        if (publishedVersionUpdated) {
            Util.writeJSONFile(rushJsonPath, JSON.stringify(rushJson, null, 2));
        }
    }
    _createTagName(packageName, version,) {
        const separator = this.rushConfiguration.gitTagSeparator ?? DEFAULT_GIT_TAG_SEPARATOR; // DEFAULT_GIT_TAG_SEPARATOR: '-'
        return packageName + `${separator}v` + version;
    }
    _hasTag(tag) {
        let v = Util.executeCommandReturn(`git tag -l '${tag}'`)
        return v != ""
    }
    _addTag(version, packageName, suffix) {
        const tag = this._createTagName(packageName, version);
        const annotatedTag = suffix ? `${packageName} v${version}-${suffix}` : `${packageName} v${version}`;
        child_process.spawnSync('git', ['tag', '-a', tag, '-m', annotatedTag]);
    }
    _checkout(branchName) {
        Util.executeCommand(`git checkout -b ${branchName}`);
    }

    _mergeToBranch(sourceBranch, targetBranch) {
        Util.executeCommand(`git fetch origin --prune`);                                        //publishGit.fetch();
        Util.executeCommand(`git checkout ${targetBranch}`);                                    //publishGit.checkout(targetBranch);
        Util.executeCommand(`git pull origin ${targetBranch}`);                                                 //publishGit.pull
        Util.executeCommand(`git merge ${sourceBranch} --no-edit`);                             //publishGit.merge(tempBranch
        Util.executeCommand(`git push origin HEAD:${targetBranch} --follow-tags  --verbose `);  //publishGit.merge(tempBranch
    }

    _deleteBranch(branchName) {
        Util.executeCommand(`git branch -d ${branchName}`);
        if (this._getRemoteBranches().includes(branchName)) {
            Util.executeCommand(`git push origin --delete ${branchName}`);
        }
        else {
            console.log(`Branch ${branchName} does not exist in the remote repository, nothing to delete`);
        }
    }

    _getStagedInfo() {
        return Util.executeCommandReturn(`git diff --cached --name-only`).split('\n');
    }
    _getRemoteBranches() {
        return Util.executeCommandReturn(`git branch -a`).split('\n');
    }
    _ensureRemote(branchName) {
        // rushUtils.getChangedProjectsAsync requires target branch in a origin/branch name format
        if (!branchName.startsWith(this.rushConfiguration.repositoryDefaultRemote)) {
            return `${this.rushConfiguration.repositoryDefaultRemote}/${branchName}`;
        }
        else {
            return branchName;
        }
    }
}
class Util {

    get Colors() {
        return COLORS;
    }

    getArg(argName) {
        const yargs = require(path.join(node_modules, 'yargs'));
        return yargs(process.argv).argv[argName];
    }

    static executeCommand(command) {
        //stdio: 'inherit': process will use the parent's stdin, stdout and stderr streams
        console.log(`* EXECUTING ${command}`);
        return child_process.execSync(command, { stdio: 'inherit' });
    }
    static executeCommandReturn(command) {
        //stdio: 'inherit': process will use the parent's stdin, stdout and stderr streams
        console.log(`* EXECUTING ${command}`);
        return child_process.execSync(command).toString().trim();
    }
    static executeCommandAsync(command) {
        //stdio: 'inherit': process will use the parent's stdin, stdout and stderr streams
        console.log(`* EXECUTING ${command}`);
        return child_process.exec(command, { stdio: 'inherit' });
    }
    static readJSONFile(jsonPath) {
        const commentEval = new RegExp(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm);
        const data = fs.readFileSync(jsonPath, 'utf8');
        const json = data.replace(commentEval, '');
        return json;
    }
    static writeJSONFile(jsonPath, json) {
        fs.writeFileSync(jsonPath, json, 'utf8');
    }
}

exports.utils = new Util();
exports.rushUtils = new RushUtil();
