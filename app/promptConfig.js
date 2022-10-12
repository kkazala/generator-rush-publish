const promptConfig = () => {

    const _getMainOptions = (generator) => {
        return [
            {
                type: 'checkbox',
                message: 'Choose configurations',
                name: 'setup',
                choices: [
                    {
                        name: 'rush global commands',
                        value: 'rush'
                    },
                    {
                        name: 'spfx bulk commands',
                        value: 'spfx'
                    },
                ],
                when: generator.options.spfxOnly === undefined || generator.options.spfxOnly === false
            }
        ];
    }
    const _getConfigOptions = (generator) => {

        let configOptions = _getMainOptions(generator);

        //add subgenerators prompts
        const spfxPrompt = require('../generators/spfx/promptConfig');
        configOptions = configOptions.concat(spfxPrompt(generator));

        return configOptions;
    }

    return {
        config: _getConfigOptions,
    }

};

module.exports = promptConfig();