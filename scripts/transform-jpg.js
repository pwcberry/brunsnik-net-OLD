const fs = require("fs");
const pathLib = require("path");
const sqip = require("sqip");

const sourcePath = pathLib.join(__dirname, "../src/assets/jpg");
const sourceFiles = fs.readdirSync(sourcePath).filter(filename => /[a-z]\.jpg$/.test(filename));
const outputPathCss = pathLib.join(__dirname, "../src/style/backgrounds");

sourceFiles.forEach(filename => {
    console.log("Processing: ", filename);

    const result = sqip({
        filename: pathLib.join(sourcePath, filename),
        numberOfPrimitives: 32,
        mode: 0,
        blur: 16
    });

    const outputFilename = pathLib.basename(filename, ".jpg");

    const base64Version = `
@mixin svg-${outputFilename.replace(/_/g, "-")} {
    body {
        background-image: url("data:image/svg+xml;base64,${result.svg_base64encoded}");
    }
}`.trim();

    console.log(`2> Writing to: ${pathLib.join(outputPathCss, `_${outputFilename}.scss`)}`);
    fs.writeFileSync(pathLib.join(outputPathCss, `_${outputFilename}.scss`), base64Version, {encoding: "utf8"});
});
