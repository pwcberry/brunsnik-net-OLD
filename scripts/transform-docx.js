const fs = require("fs");
const pathLib = require("path");
const unzip = require("unzipper");
const Sax = require("sax");

function normalizeFileName(fileName) {
    return fileName.replace(/\W+/g, "-").toLowerCase();
}

function writeFileHeader(outputStream) {
    outputStream.write(
        `---
title: [[0]]
date: 2019-01-01
template: poetry/poem.pug
collection: poetry
firstLine: [[1]]
excerpt: "<p>[[1]]</p>
<p>[[2]]</p>
<p>[[3]]</p>
<p>[[4]]</p>
"
---
`);
}

function convertDocument(inputStream, outputStream) {
    const saxStream = Sax.createStream(true);
    const format = {
        paragraph: false,
        heading: false,
        text: false,
        addSpace: false,
        run: []
    };

    saxStream.on("opentag", node => {
        switch (node.name) {
            case "w:pStyle":
                if ((node.attributes["w:val"] === "Heading1") || (node.attributes["w:val"] === "Title")) {
                    outputStream.write("# ");
                    format.heading = true;
                }
                break;
            case "w:p":
                format.paragraph = true;
                break;
            case "w:i":
                format.run.push("i");
                outputStream.write("_");
                break;
            case "w:b":
                format.run.push("b");
                outputStream.write("**");
                break;
            case "w:r":
                format.run = [];
                break;
            default:
                break;
        }
    });
    saxStream.on("closetag", nodeName => {
        switch (nodeName) {
            case "w:p":
                if (format.text) {
                    if (format.heading) {
                        outputStream.write("\n\n");
                    } else {
                        outputStream.write("  \n");
                    }
                    format.text = false;
                    format.heading = false;
                    format.paragraph = false;
                } else {
                    outputStream.write("\n");
                }
                break;
            case "w:r":
                while (format.run.length) {
                    const node = format.run.pop();
                    if (node === "b") {
                        outputStream.write("**");
                    } else if (node === "i") {
                        outputStream.write("_");
                    }
                }
                if (format.addSpace) {
                    outputStream.write(" ");
                    format.addSpace = false;
                }
                break;
            default:
                break;
        }
    });
    saxStream.on("text", text => {
        if (text.length > 0) {
            format.text = true;
            const match = /\S(\s+)$/.exec(text);
            let textToWrite = text;
            if (match && match[1]) {
                format.addSpace = true;
                textToWrite = text.replace(/\s+$/, "");
            }
            outputStream.write(textToWrite);
        }
    });
    saxStream.on("error", error => {
        console.error(error);
        this._parser.error = null;
        this._parser.resume();
    });
    saxStream.on("close", () => {
        console.log("SAX stream closed");
    });
    inputStream.pipe(saxStream);
}

function transformToMarkdown(inputPath, outputPath) {
    const filename = pathLib.basename(inputPath, ".docx");
    const stream = fs.createReadStream(inputPath);
    const zip = unzip.Parse();
    const outputFilePath = pathLib.join(__dirname, `${outputPath}`, `${normalizeFileName(filename)}.md`);
    const output = fs.createWriteStream(outputFilePath);

    output.on("close", () => {
        let fileContents = fs.readFileSync(outputFilePath, {encoding: "utf8"});
        const lines = [];
        let passedFrontMatter = false;
        let lineCounter = -1;

        fileContents.split("\n").forEach(line => {
            if (line === "---") {
                if (lineCounter === 0) {
                    passedFrontMatter = true;
                } else {
                    lineCounter = 0;
                }
            } else if (passedFrontMatter) {
                if (lineCounter === 0 && line.substr(0, 1) === "#") {
                    lines.push(line.substr(2));
                    lineCounter += 1;
                } else if (line.trim().length > 0 && (lineCounter <= 4)) {
                    lines.push(line.trim());
                    lineCounter += 1;
                }
            }
        });

        lines.forEach((line, index) => {
            fileContents = fileContents.replace(`[[${index}]]`, line);
            if (index === 1) {
                // Duplicate replacement
                fileContents = fileContents.replace(`[[${index}]]`, line);
            }
        });

        fs.writeFileSync(outputFilePath, fileContents);
    });

    writeFileHeader(output);

    zip.on("entry", entry => {
        if (entry.path === "word/document.xml") {
            convertDocument(entry, output);
        } else {
            entry.autodrain();
        }
    });

    zip.on("close", () => {
        output.close();
    });

    zip.on("error", error => {
        console.error(error);
    });

    stream.pipe(zip);
}

// const inputDir = pathLib.join(__dirname, "../src/docx");
const inputDir = "C:\\Users\\berry\\OneDrive\\Documents\\Writing\\Poetry";
const outputDir = "../src/poetry";
const files = fs.readdirSync(inputDir);

files.forEach(fileName => {
    if (/\.docx$/.test(fileName)) {
        const filePath = pathLib.join(inputDir, fileName);
        console.log("Processing: ", fileName);
        transformToMarkdown(filePath, outputDir);
    }
});
