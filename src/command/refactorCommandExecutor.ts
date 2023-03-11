import * as fs from 'fs';
import * as path from 'path'
import * as vscode from 'vscode';
import glob = require('glob');
import { MultiRegExp2 } from './ma';


export interface Model {
    NamespaceName: string;
    File: string;
}

export default class RefactorCommandExecutor {
    private _command: string;
    regex = new RegExp('\\bnamespace(?:\\s+)?((?:(?:\\/\\*(?:[^*]|(?:\\*+[^*\\/]))*\\*+\\/)|(?:(?<!\\:|\\\\\\|\\\')\\/\\/.*))|(?:\\s+))(?:\\s+)?(@?[a-z_A-Z]\\w+(?:\\.@?[a-z_A-Z]\\w+)*)\\b', 'gm');
    constructor(command: string) {
        this._command = command;
    }

    public getCommand(): string {
        return `csharpextensions.${this._command}`;
    }

    public FindNameSpace(csprojPath: string, csprojName: string, rootPath: string) {

    }

    public async execute(selectedPath: string): Promise<void> {

        const lst = fs.lstatSync(selectedPath);
        const isDir = lst.isDirectory();
        const isFile = lst.isFile();
        let ProjectName = "";
        let CSProjPath = "";
        let files: Model[] = [];
        const rootPath = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(selectedPath));
        if (isFile) {
            //
            var fileDir = path.dirname(selectedPath)
            var isBesideTheCsProj = findProjects2(fileDir);
            var namespace: string = '';
            if (isBesideTheCsProj) {
                CSProjPath = isBesideTheCsProj;
                ProjectName = CSProjPath.replace(".csproj", "");
                namespace = ProjectName;
            } else {
                var find = false;
                var dddd = fileDir;
                var d22 = path.dirname(fileDir)
                var l1 = path.dirname(rootPath?.uri.path!).split(path.sep).filter(ix => ix).length;
                var mx = path.dirname(d22).split(path.sep).filter(ix => ix).length - l1;
                for (let index = 0; index <= mx; index++) {
                    namespace += "." + path.basename(dddd)
                    var isBesideTheCsProj2 = findProjects2(d22);
                    if (isBesideTheCsProj2) {
                        CSProjPath = isBesideTheCsProj2;
                        ProjectName = path.basename(CSProjPath).replace(".csproj", "");
                        find = true;
                        namespace = ProjectName + namespace;
                        break;
                    }
                    d22 = path.dirname(d22)
                    dddd = path.dirname(dddd)
                }
                if (!find) {
                    throw (`project not found for ${selectedPath} file`);
                }
            }

            files.push({
                File: selectedPath,
                NamespaceName: namespace,
            })


        } else if (isDir) {
            var find = false;
            var www = findProjects(selectedPath)
            for (let j = 0; j < www.length; j++) {
                const element = www[j];
                var d333 = path.dirname(element);
                var filesList = findCSharpFiles(d333);
                if (filesList && filesList.length) {

                    filesList.forEach(ex => {
                        var dxxx = path.dirname(ex);
                        var np = dxxx.substring(d333.length).split(path.sep).filter(x => x).join('.');
                        var CCrojectName = path.basename(element).replace(".csproj", "");
                        var nn = CCrojectName + (!np ? '' : '.' + np);
                        files.push({
                            File: ex,
                            NamespaceName: nn,
                        })
                    });
                    find = true;
                }
            }
            if (!find) {
                var d22 = path.dirname(selectedPath)
                var mx = path.dirname(d22).split(path.sep).filter(ix => ix).length - path.dirname(rootPath?.uri.path!).split(path.sep).filter(ix => ix).length;
                for (let index = 0; index <= mx; index++) {
                    var isBesideTheCsProj2 = findProjects2(d22);
                    if (isBesideTheCsProj2) {
                        CSProjPath = isBesideTheCsProj2;
                        ProjectName = CSProjPath.replace(".csproj", "");
                        var filesList = findCSharpFiles(selectedPath);
                        if (filesList && filesList.length) {
                            filesList.forEach(ex => {
                                var dxxx = path.dirname(ex);
                                var np = dxxx.substring(d333.length).split(path.sep).filter(x => x).join('.');
                                // var CCrojectName = path.basename(element).replace(".csproj", "");
                                var nn = ProjectName + '.' + np;
                                files.push({
                                    File: ex,
                                    NamespaceName: nn,
                                })
                            });
                            find = true;
                        }
                        break;
                    }
                    d22 = path.dirname(d22)
                }
                if (!find) {
                    throw (`project not found for ${selectedPath} file`);
                }
            }
            // }

        }

        console.log(CSProjPath, ProjectName, rootPath, files);
        update(files)
    }


}

function update(array: Model[]) {
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        var contnet = readFileContent(element.File);
        var xx = new MultiRegExp2()
        var ww = xx.execForGroup(contnet, 2)
        var start = contnet.substring(0, ww?.start!)
        var end = contnet.substring(ww?.end!)
        var final = start + element.NamespaceName + end;
        //{match: 'command.abcv', start: 108, end: 120}
        // var newContent = writeToFile
        writeToFile(element.File, final);
        console.log(final);

    }
}

/**
 * Reads content of a file
 * @param filePath  The file path
 * @returns The file content
 */
export function readFileContent(filePath: string): string {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent;
}
/**
 * Writes the new content to a file
 * @param filePath The file path
 * @param content The new content
 */
export function writeToFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content);
}

function findProjects(fsPath: string): string[] {
    let result: string[] = [];


    let files = glob.sync(`${fsPath}/**/*.+(csproj)`, {
        ignore: ['**/node_modules/**', '**/.git/**']
    });

    files.forEach(file => {
        if (result.indexOf(file) === -1) {
            result.push(file);
        }
    });


    return result;
}

function findCSharpFiles(fsPath: string): string[] {
    let result: string[] = [];


    let files = glob.sync(`${fsPath}/**/*.+(cs)`, {
        ignore: ['**/node_modules/**', '**/.git/**']
    });

    files.forEach(file => {
        if (result.indexOf(file) === -1) {
            result.push(file);
        }
    });


    return result;
}

function findProjects2(cpath: string): string {

    let csproj = glob.sync(`${cpath}/*.+(csproj)`);

    return csproj && csproj[0];
}