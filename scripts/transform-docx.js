const fs = require('fs');
const pathLib = require('path');
const unzip = require('unzipper');
const Sax = require('sax');

function convertDocument(inputStream, outputStream) {
    const saxStream = Sax.createStream(true);
    const format = {
        paragraph: false,
        heading: false,
        text: false,
        run: []
    };

    saxStream.on('opentag', node => {
        console.log(`<${node.name}>`);
        switch(node.name) {
            case 'w:pStyle':
                if (node.attributes['w:val'] === 'Heading1') {
                    outputStream.write('#');
                    format.heading = true;
                }
                break;
            case 'w:p':
                format.paragraph = true;
                break;
            case 'w:i':
                format.run.push('i');
                outputStream.write('_');
                break;
            case 'w:b':
                format.run.push('b');
                outputStream.write('**');
                break;
            case 'w:r':
                format.run = [];
                break;
            default:
                break;
        }
    });
    saxStream.on('closetag', nodeName => {
        console.log(`</${nodeName}>`);
        switch(nodeName) {
            case 'w:p':
                if (format.text) {
                    outputStream.write('\n\n');
                    format.text = false;
                    format.heading = false;
                    format.paragraph = false;
                }
                break;
            case 'w:r':
                while (format.run.length) {
                    const node = format.run.pop();
                    if (node === 'b') {
                        outputStream.write('**');
                    } else if (node === 'i') {
                        outputStream.write('_');
                    }
                }
                break;
            default:
                break;
        }
    });
    saxStream.on('text', text => {
        console.log(`"${text}"`);
        if (text.length > 0) {
            format.text = true;
            outputStream.write(text);
        }
    });
    saxStream.on('error', error => {
        console.error(error);
        this._parser.error = null;
        this._parser.resume();
    });
    saxStream.on('close', () => {
        console.log('SAX stream closed');
    });
    inputStream.pipe(saxStream);
}

function extractXml(inputPath) {
    const stream = fs.createReadStream(inputPath);
    const zip = unzip.Parse();
    const output = fs.createWriteStream(pathLib.join(__dirname, '../src/poetry/sample.md'));

    zip.on('entry', entry => {
       if (entry.path === 'word/document.xml') {
           convertDocument(entry, output);
       } else {
           entry.autodrain();
       }
    });

    zip.on('close', () => {
        console.log('DOCX file closed.');
        output.close();
    });

    zip.on('error', error => {
        console.error(error);
    });

    stream.pipe(zip);
}

extractXml(pathLib.join(__dirname, '../tests/Sample.docx'));
