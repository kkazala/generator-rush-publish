const fs = require('fs');
const chalk = require('chalk');
const compareVersions = require('compare-versions');


class Util {
    get rushVersionRequired() {
        return "5.66.2"
    }
    _getRushVersion(filePath) {
        const rushJson = JSON.parse(
            this._stripJSONComments(
                fs.readFileSync(filePath, 'utf-8')
            ));
        return rushJson.rushVersion;
    }

    _assertRushVersion(rushVersion) {
        return (compareVersions(rushVersion, this.rushVersionRequired) >= 0);
    }

    _ensureRushConfig(generator) {
        const filePath = `${generator.contextRoot}/rush.json`

        const rushJson = JSON.parse(
            this._stripJSONComments(
                fs.readFileSync(filePath, 'utf-8')
            ));

        if (rushJson.gitPolicy.versionBumpCommitMessage === undefined) {
            generator.log(chalk.yellow("Please remember to configure gitPolicy.versionBumpCommitMessage in rush.json."))

        }
        if (rushJson.gitPolicy.changeLogUpdateCommitMessage === undefined) {
            generator.log(chalk.yellow("Please remember to configure gitPolicy.changeLogUpdateCommitMessage in rush.json"))
        }
    }
    _readRushConfig = (generator, tagValue) => {

        const rushJson = JSON.parse(
            this._stripJSONComments(
                generator.fs.read(`${generator.contextRoot}/rush.json`)
            ));

        let SPFxProjects = [];
        if (Array.isArray(rushJson.projects) && rushJson.projects.length > 0) {
            if (tagValue != '') {
                rushJson.projects.filter(project => project.tags?.includes(tagValue)).forEach(project => {
                    SPFxProjects.push({
                        name: project.packageName,
                        value: project.projectFolder
                    })
                });
            }
            else {
                rushJson.projects.forEach(project => {
                    SPFxProjects.push({
                        name: project.packageName,
                        value: project.projectFolder
                    })
                });
            }
        }
        return SPFxProjects;
    }
    _countRushConfig = (generator, tagValue) => {
        const rushJson = JSON.parse(
            this._stripJSONComments(
                generator.fs.read(`${generator.contextRoot}/rush.json`)
            ));
        if (tagValue != '') {
            return rushJson.projects.filter(project => project.tags?.includes(tagValue)).length;
        }
        else {
            return rushJson.projects.length;
        }
    }

    _stripJSONComments(data) {
        var commentEval = new RegExp(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm);
        return data.replace(commentEval, '');
    }
    _mergeJsonFiles(sourceFile, targetFile, mergingLogic) {

        this._ensureFileExists(sourceFile);
        this._ensureFileExists(targetFile);

        try {
            const sourceJson = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
            let targetJson = JSON.parse(
                this._stripJSONComments(
                    fs.readFileSync(targetFile, 'utf-8')
                ));

            const newJson = mergingLogic(sourceJson, targetJson)
            fs.writeFileSync(targetFile, JSON.stringify(newJson, null, 2));
        }
        catch (err) {
            throw err;
        }
    }

    _mergeCommands(sourceJson, targetJson) {

        try {
            for (let key in sourceJson.commands) {
                let newCmnd = sourceJson.commands[key].name
                let found = targetJson.commands.filter((cmd) => cmd.name == newCmnd)

                if (found.length == 0) {
                    targetJson.commands.push(sourceJson.commands[key]);
                }
            }

            for (let key in sourceJson.parameters) {
                let newParam = sourceJson.parameters[key].longName
                let found = targetJson.parameters.filter((param) => param.longName == newParam)

                if (found.length == 0) {
                    targetJson.parameters.push(sourceJson.parameters[key]);
                }
                else {
                    let associatedCmds = sourceJson.parameters[key].associatedCommands;
                    let unique = [... new Set(found[0].associatedCommands.concat(associatedCmds))];
                    found[0].associatedCommands = unique;
                }
            }
        }
        catch (err) {
            throw err;
        }
        finally {
            return targetJson;
        }
    }

    _mergeVersionPolicies(sourceJson, targetJson) {

        try {
            for (let key in sourceJson) {
                let newPolicy = sourceJson[key].definitionName
                let found = targetJson.filter((item) => item.definitionName == newPolicy)

                if (found.length == 0) {
                    targetJson.push(sourceJson[key]);
                }
            }
        }
        catch (err) {
            throw err;
        }
        finally {
            return targetJson;
        }
    }

    _mergeScripts(sourceJson, targetJson) {
        for (let script in sourceJson.scripts) {
            targetJson.scripts[script] = sourceJson.scripts[script];
        }
        return targetJson;
    }

    _ensureFileExists(filePath) {
        if (!fs.existsSync(filePath)) {
            const error = 'Error: File names ' + filePath + ' cannot be found';
            throw error;
        }
        else
            return true;
    }
}

module.exports = new Util();