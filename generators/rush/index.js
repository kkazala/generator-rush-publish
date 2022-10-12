var Generator = require('yeoman-generator');
const utils = require('../../lib/utils.js');
const chalk = require('chalk');

module.exports = class extends Generator {

    constructor(args, opts) {
        super(args, opts);
        this.rushVer = opts.options.rushVer;
    }

    initializing() {
        // this.log(chalk.green(` rush v${this.rootGeneratorVersion()}`));
    }

    prompting() {
    }

    writing() {
        this._copyRushConfig();
    }
    install() {
        this.log(chalk.green("Updating auto-installers"));
        this.spawnCommandSync('rush', ['update-autoinstaller', '--name', 'rush-publish']);
        this.spawnCommandSync('rush', ['update']);
    }

    end() {
        utils._ensureRushConfig(this);
    }

    _copyRushConfig() {

        this.log(chalk.green("Rush configuration"));
        this.log("Copying rush autoinstallers ");

        this.fs.copyTpl(
            this.templatePath(`${this.sourceRoot()}/autoinstallers/.`),
            this.destinationPath(`${this.contextRoot}/common/autoinstallers/.`),
            { rushVer: this.rushVer }
        );
        this.log("Copying rush scripts");
        this.fs.copy(
            this.templatePath(`${this.sourceRoot()}/scripts/.`),
            `${this.contextRoot}/common/scripts/.`,
        );
        this.log("Copying global rush commands");
        utils._mergeJsonFiles(
            this.templatePath(`${this.sourceRoot()}/config/rush/command-line.json`),
            `${this.contextRoot}/common/config/rush/command-line.json`,
            utils._mergeCommands
        );
    }
}