import * as path from "path";
import * as prettier from "prettier";

import thriftPraser from "./thrift-parser";
import BaseCompiler from "./BaseCompiler";
import ServiceCompiler from "./ServiceCompiler";
import { File, CompileOptions } from "./types";

class Compile extends BaseCompiler {
    serviceCompilers: ServiceCompiler[] = [];

    constructor(
        file: {
            filename: string;
            content: string | Buffer;
        },
        options?: CompileOptions
    ) {
        super(options);

        this.filename = file.filename;
        this.ast = thriftPraser(file.content);
        if (this.ast.service) {
            const services = this.ast.service;
            const basename = path.basename(this.filename, ".thrift");
            const include = Object.assign({}, this.ast.include, {
                [basename]: {
                    path: basename
                }
            });

            this.serviceCompilers = Object.keys(services).map(k => {
                return new ServiceCompiler(
                    basename,
                    String(k),
                    services[k],
                    include,
                    options
                );
            });
        }
    }

    getFileName(): string {
        return path.basename(this.filename, ".thrift");
    }

    flushJSON(prettify: boolean = false): File[] {
        const content = JSON.stringify(this.ast);
        return [
            {
                filename: `${this.getFileName()}.json`,
                content: prettify
                    ? prettier.format(content, {
                          parser: "json"
                      })
                    : content
            }
        ];
    }

    flush(): File[] {
        this.writeCommonType();
        if (this.ast.include) {
            this.writeInclude(this.ast.include);
        }
        if (this.ast.const) {
            this.writeConst(this.ast.const);
        }
        if (this.ast.typedef) {
            this.writeTypeof(this.ast.typedef);
        }
        if (this.ast.enum) {
            this.writeEnum(this.ast.enum);
        }
        if (this.ast.struct) {
            this.writeStructs(this.ast.struct);
        }
        if (this.ast.union) {
            this.writeUnions(this.ast.union);
        }
        if (this.ast.exception) {
            this.writeExceptions(this.ast.exception);
        }

        const files: File[] = [];

        if (this.serviceCompilers.length) {
            this.serviceCompilers.forEach(s => {
                files.push(s.flush());
            });
        }

        const filename = `${this.getFileName()}${
            this.definition ? "_types.d.ts" : ".ts"
        }`;

        const content = prettier.format(
            "// tslint:disable\n" + this.buffer.join(""),
            { parser: "typescript" }
        );

        files.push({ filename, content });

        return files;
    }
}

export const compile = (
    sourceFile: {
        filename: string;
        content: string | Buffer;
    },
    options: CompileOptions
): File[] => {
    const compiler = new Compile(sourceFile, options);
    if (options.json) {
        return compiler.flushJSON();
    }
    return compiler.flush();
};

export default (
    sourceFiles: Array<{
        filename: string;
        content: string | Buffer;
    }>,
    options: CompileOptions
): File[] => {
    const compiledFiles = sourceFiles
        .map(sourceFile =>
            compile(sourceFile, options).map(file => ({
                file,
                filePath: path.relative(options.dirPath, sourceFile.filename)
            }))
        )
        .flat();
    if (options.json) {
        const packFile = {
            filename: "",
            content: JSON.stringify(
                compiledFiles.map(({ file, filePath }) => ({
                    path: filePath,
                    name: path.basename(file.filename, ".json"),
                    ast: JSON.parse(file.content)
                }))
            )
        };
        return [packFile];
    }
    return compiledFiles.map(({ file }) => file);
};
