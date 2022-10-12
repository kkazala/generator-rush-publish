const utils = require('../../lib/utils.js');
const chalk = require('chalk');

const _getSPFxProjects = (generator) => {

    return [
        {
            type: "input",
            name: "tag",
            message: "Provide a tag, to narrow the SPFx project selection down (otherwise leave empty):",
            when: answers => answers.setup && answers.setup.includes('spfx') || generator.options.spfxOnly === true
        },
        {
            type: 'checkbox',
            message: 'Which projects do you want to configure?',
            name: 'projects',
            choices: answers => utils._readRushConfig(generator, answers.tag ?? ''),
            when: answers => {
                const projectFound = utils._countRushConfig(generator, answers.tag ?? '');
                if (projectFound == 0) {
                    generator.log(chalk.red('No project found with the tag ' + answers.tag));
                }
                return (answers.setup && answers.setup.includes('spfx') || generator.options.spfxOnly === true)
                    && projectFound > 0
            }
        }];
}

module.exports = _getSPFxProjects;