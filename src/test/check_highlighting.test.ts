import { expect } from 'chai';
import * as oniguruma from "vscode-oniguruma"
import * as vsctm from "vscode-textmate"
import fs from "fs"
import path from "path"
import glob from 'glob';
import { green, red } from 'colorette';
import dependency_status, { DependencyStatus } from './dependency_status';

const root = path.join(__dirname, "..", ".." , "..")
const timeout = 12000

const wasmBin = fs.readFileSync(path.join(root, path.join(
    "node_modules", "vscode-oniguruma", "release", "onig.wasm"
  ))).buffer;
const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
    return {
        createOnigScanner(patterns: any) { return new oniguruma.OnigScanner(patterns); },
        createOnigString(s: string) { return new oniguruma.OnigString(s); }
    };
});

const registry = new vsctm.Registry({
    onigLib: vscodeOnigurumaLib,
    loadGrammar: async (_: string) => {
        const grammarFile = path.join(
          root, "syntaxes", "lflang.tmLanguage.json"
        )
        const data: any = fs.readFileSync(grammarFile)
        return vsctm.parseRawGrammar(data.toString(), grammarFile)
    }
});

/**
 * Annotate the given code using HTML.
 * @param code A block of code.
 * @param grammar The grammar rules with which to annotate the code.
 * @param lang The language of the code block.
 * @returns The HTML representation of the annotated code block.
 */
function annotateCode(code: string, grammar: vsctm.IGrammar): string {
  let prevState: vsctm.StateStack | null = null
  let ret: string = ""
  for (const line of code.split(/\r?\n|\r/)) {
    let result: vsctm.ITokenizeLineResult = grammar.tokenizeLine(line, prevState)
    prevState = result.ruleStack
    if (result.stoppedEarly) {
      console.error("Tokenization stopped early due to timeout.")
      continue
    }
    let annotatedLine = ""
    let lengthAppended = 0
    for (const token of result.tokens) {
      annotatedLine += line.substring(lengthAppended, token.startIndex)
      annotatedLine += `<span class="${token.scopes.join(" ").replace(/\./g, "-")}">\n${
        line.substring(token.startIndex, token.endIndex)
      }\n</span>\n`
      lengthAppended = token.endIndex
    }
    annotatedLine += line.substring(lengthAppended, line.length)
    ret += annotatedLine + "\n"
  }
  return ret
}

const normalizeEol = (s: string) => s.replace(/\r?\n|\r/g, "\n")

suite('test syntax highlighting', () => {
    test('all', async function() {
        if (dependency_status() != DependencyStatus.Present) return;
        this.timeout(timeout);
        const grammar = await registry.loadGrammar("source.lf")
        let files = glob.sync(`lingua-franca/test/**/**.lf`, { cwd: root, ignore: "**/*-gen/**" })
        for (const file of files.map(it => path.resolve(root, it))) {
            const code = fs.readFileSync(file).toString()
            const annotated = annotateCode(code, grammar!)
            const relPath = path.relative(path.join(root, "lingua-franca", "test"), file)
            const testPath = path.resolve(root, "test", "known-good", relPath.replace(".lf", ".html"))
            if (fs.existsSync(testPath)) {
                const knownGood = fs.readFileSync(testPath).toString()
                try {
                    expect(normalizeEol(annotated)).to.eql(normalizeEol(knownGood));
                } catch (e) {
                    console.log(`${relPath} ${red('✗')}`)
                    throw e;
                }
                console.log(`${relPath} ${green('✓')}`)
            } else {
                console.log(`Found LF integration test at "${file} without a corresponding annotated". Creating corresponding annotated file at ${testPath}.`)
                fs.mkdirSync(path.dirname(testPath), { recursive: true })
                fs.writeFileSync(testPath, annotated)
            }
        }
    })
})
