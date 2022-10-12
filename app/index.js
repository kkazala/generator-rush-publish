var Generator = require('yeoman-generator');
const prompting = require('./promptConfig');

const utils = require('../lib/utils.js');
const fs = require('fs');
const chalk = require('chalk');
const subGenerator = require('./subGenerators');

module.exports = class extends Generator {

    constructor(args, opts) {
        super(args, opts);
        this._addHelpInfo()
    }

    initializing() {
        this.log(chalk.green(`rush-publish v${this.rootGeneratorVersion()}`))
        const rushJson = `${this.contextRoot}/rush.json`

        if (!this.fs.exists(rushJson)) {
            this.log(chalk.red('This generator needs to be invoked from rush root directory'));
            process.exit(1)
        }

        this.rushVer = utils._getRushVersion(rushJson);
        if (!utils._assertRushVersion(this.rushVer)) {
            this.log(chalk.red(`This generator requires rush version ${utils.rushVersionRequired} or newer. Please either upgrade rush, or use older version of the generator.`));
            process.exit(1)
        }
        if (!fs.existsSync(`${this.contextRoot}/common/temp/`)) {
            this.log(chalk.blue("Please invoke 'rush install' before running this generator"));
            process.exit(1)
        }
    }

    async prompting() {

        this.answers = await this.prompt(
            prompting.config(this)
        );
        this.options.setup = this.answers.setup;
        this.options.spfxProjects = this.answers.projects;
        this._configGenerators(this.options);
    }

    writing() {
    }
    install() {
    }

    end() {
        this.log(chalk.green(`All set! Thank you for using ${this.rootGeneratorName()}!`));
    }

    _configGenerators(options) {

        if (options.setup?.includes('rush')) {
            this.composeWith(
                subGenerator.rush,
                {
                    options: {
                        rushVer: this.rushVer
                    }
                });
        }

        //configure SPFx projects
        if (options.spfxProjects?.length > 0) {
            this.composeWith(
                subGenerator.spfx,
                {
                    options: {
                        spfx: options.spfxProjects
                    }
                });
        }
    }

    _addHelpInfo() {
        this.option("spfx-only", { description: 'Only update selected SPFx projects, rush global commands have been already configured', default: false });
    }

}