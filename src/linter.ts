import * as cp from 'child_process';
import * as path from 'path';

interface LinterErrorRange {
  start: number;
  end: number;
}

export interface LinterError {
  line: number;
  reason: string;
  range: LinterErrorRange;
}

interface LinterHandler {
  (errors: LinterError[]): void;
}

export interface LinterOptions {
  didOpen: boolean;
  languageId: string;
}

export default class Linter {
  private exec(command: string) {
    return new Promise(function(resolve, reject) {
      cp.exec(command, (err: Error, stdout: string, stderr: string) => {
        if (!err) {
          resolve();
          return;
        }
        reject(stderr);
      });
    });
  }

  private buildLinterError(error: string): LinterError | null {
    const tokenIndex = error.indexOf(' ');

    if (tokenIndex === -1) {
      return null;
    }

    let linePart = error.slice(0, tokenIndex).match(/:(.*):/);

    if (!linePart) {
      return null;
    }

    const [line, rangeStart] = linePart[0].slice(1, -1).split(':');
    const reason = error.slice(tokenIndex).trim();
    const diagnostic = reason.match(/\'(\w+)\'/);

    if (!diagnostic) {
      return null;
    }

    const diagnosticWord = diagnostic[0].replace(/\'/g, '');
    return {
      line: parseInt(line, 10),
      range: {
        start: parseInt(rangeStart, 10),
        end: parseInt(rangeStart) + diagnosticWord.length
      },
      reason
    };
  }

  private parseErrors(filePath: string, errorStr: string): LinterError[] {
    let errors = errorStr.split('\n').slice(0, -2) || [];
    return errors.reduce((acc: any, error: any) => {
      const parsedError = this.buildLinterError(error);
      return !parsedError ? acc : acc.concat(parsedError);
    }, []);
  }

  public lint(
    fileName: string,
    options: LinterOptions,
    handler: LinterHandler | null = null
  ): void {
    const opts: LinterOptions = Object.assign({}, {
      didOpen: false,
      languageId: 'proto'
    }, options);

    const isProtoFile = options.languageId.includes('proto');

    if (opts.didOpen && !isProtoFile) {
        return;
    }

    if (!opts.didOpen && !isProtoFile) {
        return;
    }

    const dirname = path.dirname(fileName);
    const filename = path.basename(fileName);
    const cmd = `protoc --proto_path=${dirname} ${filename} --lint_out=.`;

    // @TODO detect when command does not exist
    const result = this.exec(cmd);

    if (handler) {
      result
        .then(() => handler([]))
        .catch((error) => handler(this.parseErrors(fileName, error)));
    }
  }
}
