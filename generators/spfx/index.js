var Generator = require('yeoman-generator');
const utils = require('../../lib/utils.js');
const chalk = require('chalk');

module.exports = class extends Generator {

    constructor(args, opts) {
        super(args, opts);
        this.spfx = opts.options.spfx;
    }

    initializing() {
        // this.log(chalk.green(`SPFx v${this.rootGeneratorVersion()}`))
    }

    prompting() {
    }

    writing() {
        this._copyRushSPFxConfig();
        this._copyGulpTasks();

        if (this.spfx.length > 0) {
            this._configSpfx(this.spfx)
            this._copyRushProject(this.spfx)
        }
    }
    install() {
    }

    end() {
    }

    _copyRushSPFxConfig() {

        this.log(chalk.green("Copying bulk rush commands"));
        this.log(`${this.sourceRoot()}/config/rush/command-line.json`)
        utils._mergeJsonFiles(
            this.templatePath(`${this.sourceRoot()}/config/rush/command-line.json`),
            `${this.contextRoot}/common/config/rush/command-line.json`,
            utils._mergeCommands
        );

        this.log(chalk.green("Adding rush version policy for SPFx"));
        utils._mergeJsonFiles(
            this.templatePath(`${this.sourceRoot()}/config/rush/version-policies.json`),
            `${this.contextRoot}/common/config/rush/version-policies.json`,
            utils._mergeVersionPolicies
        );
    }

    _copyGulpTasks() {
        this.log(chalk.green("Copying gulp scripts"));
        this.fs.copy(
            this.templatePath(`${this.sourceRoot()}/gulpTasks/.`),
            `${this.contextRoot}/gulpTasks/`
        );
    }
    _configSpfx(projects) {
        this.log(chalk.green("Configuring SPFx projects"));

        if (projects !== undefined) {
            projects.forEach(element => {
                utils._mergeJsonFiles(
                    this.templatePath(`${this.sourceRoot()}/configSpfx/package.json`),
                    `${this.contextRoot}/${element}/package.json`,
                    utils._mergeScripts
                );
                this.fs.copy(
                    this.templatePath(`${this.sourceRoot()}/configSpfx/gulpfile.js`),
                    `${this.contextRoot}/${element}/gulpfile.js`
                );

            });
        }
    }
    _copyRushProject(projects) {
        this.log(chalk.green("Copying rush-project.json files"));

        if (projects !== undefined) {
            projects.forEach(element => {
                this.fs.copy(
                    this.templatePath(`${this.sourceRoot()}/configSpfx/rush-project.json`),
                    `${this.contextRoot}/${element}/config/rush-project.json`
                );
            });
        }
    }
}