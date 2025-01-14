import BaseCompiler from "./BaseCompiler";
import path = require("path");
import { File, CompileOptions } from "./types";
import { Includes, Service } from "./thrift-parser";

export default class ServiceCompiler extends BaseCompiler {
    constructor(
        public basename: string,
        public name: string,
        public service: Service,
        public includes: Includes,
        options: CompileOptions,
        private filePath: string
    ) {
        super(options);
    }

    getFileName(): string {
        return `${this.filePath}-${path.basename(this.name, ".thrift")}`;
    }

    flush(): File {
        if (this.includes) {
            this.writeInclude(this.includes);
        }
        this.writeCallbackTypeDeclare();
        this.writeCommonType();
        this.wExport(() =>
            this.wService(this.service, this.basename, this.name)
        );

        return {
            filename: `${this.getFileName()}${this.definition ? ".d" : ""}.ts`,
            content: this.buffer.join("")
        };
    }
}
