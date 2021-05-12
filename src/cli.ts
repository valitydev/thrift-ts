import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as yargs from "yargs";

import compile from "./compile";
import { CompileOptions } from "./types";

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
        .options("p", {
            alias: "prettify",
            describe: "Prettify",
            default: false,
            type: "boolean"
        })
        .options("pk", {
            alias: "pack",
            describe: "One file",
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

    function getBasePath(files: any[]) {
        let i = 0;
        if (files.length <= 1) return "";
        while (i < files[0].length) {
            let char = "";
            const equal = files.every((file: any[], index: number) => {
                if (index === 0) {
                    char = file[i];
                    return true;
                } else if (file[i] === char) {
                    return true;
                }
                return false;
            });
            if (!equal) {
                break;
            }
            i++;
        }

        return files[0].slice(0, i);
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

    let basePath: string | null = null;
    if (argv._.length > 1) {
        basePath = getBasePath(argv._);
    }

    argv._.forEach(p => {
        let out: string;
        if (argv.o) {
            out = argv.o;
        } else {
            out = "./";
        }
        // if you enter the folder path directly, you need to do the conversion
        p = getFolderPath(p);
        glob(p, (err, files) => {
            if (err) throw err;
            if (!basePath) {
                basePath = getBasePath(files);
            }
            console.log("basePath:", basePath);
            const options: CompileOptions = {
                tabSize: argv.t,
                spaceAsTab: argv.s,
                int64AsString: argv.i,
                definition: argv.d,
                camelCase: argv.c,
                json: argv.j,
                pack: argv.pk,
                prettify: argv.p
            };
            const compiledFiles = compile(
                files.map(file => ({
                    filename: file,
                    content: fs.readFileSync(file)
                })),
                options
            );
            const parsedOutPath = path.parse(out);
            const outPath = parsedOutPath.ext ? parsedOutPath.dir : out;
            if (!fs.existsSync(outPath)) {
                fs.mkdirSync(outPath);
            }
            compiledFiles.forEach(newFile => {
                const outfile = path.join(out, newFile.filename);
                console.log("outfile:", outfile);
                fs.writeFileSync(outfile, newFile.content);
            });
        });
    });
};
