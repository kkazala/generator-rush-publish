const fs = require('fs');

const getJson = function (file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
};
const saveFile = function (filePath, fileContents) {
    fs.writeFile(filePath, JSON.stringify(fileContents, null, 2), (err) => {
        if (err)
            console.error(err);
    });
};

const versionSync = function () {
    const pkgSource = getJson('./package.json');
    const pkgTarget = getJson('./config/package-solution.json');
    const newVer = `${pkgSource.version.split("-")[0]}.0`; //in case suffix applied for some reason

    console.log(`Setting version from ${pkgTarget.solution.version} to ${newVer}`);
    pkgTarget.solution.version = newVer;

    saveFile('./config/package-solution.json', pkgTarget);
};
const versionRevision = function () {
    const pkgSource = getJson('./package.json');
    const pkgTarget = getJson('./config/package-solution.json');

    //get ver from package.json
    const stableVer = `${pkgSource.version.split("-")[0]}`; //in case suffix applied for some reason

    //get ver from package-solution.json
    const oldVer = String(pkgTarget.solution.version).split('.');
    const oldVer_semVer = `${oldVer[0]}.${oldVer[1]}.${oldVer[2]}`;

    // if the same major.minor.patch, only increase revision
    if (stableVer == oldVer_semVer) {
        const revNumber = isNaN(oldVer[3]) ? 1 : parseInt(oldVer[3]) + 1;
        const newVer = `${oldVer_semVer}.${revNumber}`
        console.log(`Increasing version from ${pkgTarget.solution.version} to ${newVer}`);
        pkgTarget.solution.version = newVer;
    }
    else {
        const newVer = `${stableVer}.1`;
        console.log(`Resetting version from ${pkgTarget.solution.version} to ${newVer}`);
        pkgTarget.solution.version = newVer;
    }

    saveFile('./config/package-solution.json', pkgTarget);
};

exports.setVersion = function setVersion(gulp, buildOptions, done) {

    const ship = buildOptions.args["ship"];
    const prerelease = buildOptions.args["prerelease"];

    try {
        if (prerelease === true) {
            console.log('CI for prerelease version, do not update versions in package-solution.json');
        }
        else {
            // spfx:package
            if (ship === true) {
                versionSync();
            }
            // manually gulp serve || gulp bundle
            if (ship === undefined) {
                versionRevision();
            }
        }

        return gulp.src('./config/package-solution.json')
            .pipe(gulp.dest('./config'))
    }
    catch (err) {
        done(new Error(err));
    }
}