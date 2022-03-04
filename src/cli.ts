import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as yargs from "yargs";

import compile from "./compile";
import { CompileOptions, File } from "./types";

export default () => {
    const argv = yargs
        .usage("Usage: $0 [options] files")
        .option("s", {
            alias: "spaceAsTab",
            describe: "use space as tab",
            default: true,
            type: "number"
        })
        .options("t", {
            alias: "tabSize",
            describe: "tab size",
            default: 2,
            type: "boolean"
        })
        .options("o", {
            alias: "out",
            describe: "out put dir",
            type: "string"
        })
        .options("i", {
            alias: "int64AsString",
            describe: "treat type int64 as type string",
            default: false,
            type: "boolean"
        })
        .options("d", {
            alias: "definition",
            describe: "generate definition type",
            default: true,
            type: "boolean"
        })
        .options("c", {
            alias: "camelCase",
            describe: "camel case",
            default: false,
            type: "boolean"
        })
        .options("j", {
            alias: "json",
            describe: "JSON",
            default: false,
            type: "boolean"
        })
        .options("v", {
            alias: "version",
            describe: "current version"
        })
        .help("h")
        .alias("h", "help").argv;

    if (argv.version) {
        const pkg = fs.readFileSync(path.join(__dirname, "../package.json"), {
            encoding: "utf-8"
        });
        console.log("V" + JSON.parse(pkg).version);
        return;
    }

    if (!argv._.length) {
        throw new Error("must specify a file");
    }

    /**
     * If you enter the folder directly, you need to switch to similar ./**\/*.thrift
     * @param {string} folder
     * @return {string} folder
     */
    function getFolderPath(folder: string) {
        const isFolder = !(folder && folder.match(/.thrift$/));
        if (isFolder) {
            if (folder.match(/\/$/)) {
                return folder + "**/*.thrift";
            }
            return folder + "/**/*.thrift";
        }
        return folder;
    }

    let out: string;
    if (argv.o) {
        out = argv.o;
    } else {
        out = "./";
    }
    const parsedOutPath = path.parse(out);
    const outPath = parsedOutPath.ext ? parsedOutPath.dir : out;
    if (!fs.existsSync(outPath)) {
        try {
            fs.mkdirSync(outPath);
        } catch (err) {
            console.warn(err);
        }
    }

    const compiledFiles: File[] = [];
    for (const fileDirOrPath of argv._) {
        const files = glob.sync(getFolderPath(fileDirOrPath));
        console.log("Source:", fileDirOrPath);
        const options: CompileOptions = {
            tabSize: argv.t,
            spaceAsTab: argv.s,
            int64AsString: argv.i,
            definition: argv.d,
            camelCase: argv.c,
            json: argv.j,
            dirPath:
                path.parse(fileDirOrPath).ext === ".thrift"
                    ? path.join(fileDirOrPath, "..")
                    : fileDirOrPath
        };
        compiledFiles.push(
            ...compile(
                files.map(file => ({
                    filename: file,
                    content: fs.readFileSync(file)
                })),
                options
            )
        );
    }
    if (argv.j) {
        const filename = compiledFiles[0].filename;
        const content = JSON.stringify(
            compiledFiles.map(file => JSON.parse(file.content)).flat(),
            null,
            4
        );
        const outfile = path.join(out, filename);
        console.log("Result:", outfile);
        fs.writeFileSync(outfile, content);
    } else {
        compiledFiles.forEach(newFile => {
            const outfile = path.join(out, newFile.filename);
            console.log("Result:", outfile);
            fs.writeFileSync(outfile, newFile.content);
        });
    }
};
