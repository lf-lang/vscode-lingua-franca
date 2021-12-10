'use strict';

import {
    TextDocument,
    DocumentSemanticTokensProvider,
    ProviderResult,
    SemanticTokens,
    SemanticTokensBuilder,
    SemanticTokensLegend,
    Range,
    Position,
    CancellationToken
} from 'vscode';

const tokenTypes = [
    'typeParameter', 'parameter', 'type', 'variable', 'property', 'class'
];
const tokenModifiers = [
    'declaration', 'readonly'
];
const standardShadowPatterns = {
    comments: [['/*', '*/'], ['//', '\n'], ['#', '\n']],
    strings: [['"""', '"""'], ["'''", "'''"], ['"', '"']],
    code: [['{=', '=}']]
};

export const legend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

/**
 * Returns whether `r` really, truly contains `other`, not whether `r`
 * contains `other` according to the seemingly inconsistent
 * implementation of `Range`.
 * @param r an arbitrary Range
 * @param other an arbitrary Position
 * @returns whether `r` contains `other`
 */
function contains(r: Range, other: Range | Position): boolean {
    if (other instanceof Position) return !(
        !r.contains(other) || r.end.isEqual(other)
    );
    return contains(r, other.start) && r.contains(other.end);
}

/**
 * Returns a list of all ranges contained by `range` that correspond to
 * words.
 * @param document - The document from which to extract tokens
 * @param range - The range of the document in which to search
 * @param shadow - The regions of the document to ignore
 */
function getWords(document: TextDocument, range: Range, shadow: Range[]): Range[] {
    function getWords(range?: Range): Range[] {
        const ret: Range[] = [];
        let pos = range.start;
        const getCurrentLineLength = () => document.lineAt(pos.line).text.length;
        let currentLineLength = getCurrentLineLength();
        while (contains(range, pos)) {
            let word = document.getWordRangeAtPosition(pos);
            if (word && contains(range, word)) {
                ret.push(word);
                // Redundancy with pos=next(pos) is OK because words are always
                //  separated by at least one character
                pos = word.end;
            }
            pos = pos.translate(0, 1);
            if (pos.character >= currentLineLength) {
                pos = new Position(pos.line + 1, 0);
                currentLineLength = getCurrentLineLength();
            }
        }
        return ret;
    }
    return [].concat(...setDiff(document, range, shadow).map(getWords));
}
/**
 * Returns a Range containing the entirety of a given TextDocument.
 * @param document - A TextDocument
 * @returns a Range containing the entirety of document
 */
function wholeDocument(document: TextDocument): Range {
    return new Range(
        new Position(0, 0),
        document.positionAt(document.getText().length)
    );
}

/**
 * Returns the ranges in an LF document that are not parsed normally,
 * such as comments, strings, and code blocks.
 * @param document - A Lingua Franca source code file
 * @returns the ranges in an LF document that are not parsed normally,
 *     such as comments, strings, and code blocks
 */
function standardShadow(document: TextDocument): Range[] {
    const ret: Range[] = [];
    for (const [_, rangeList] of Object.entries(getNonLFBlocks(document))) {
        for (const range of rangeList) {
            ret.push(range);
        }
    }
    return ret;
}

/**
 * Returns an object with the list of ranges corresponding to each type
 * of block that is not written in Lingua Franca.
 * @param document - The document from which to extract ranges
 * @returns an object with the list of ranges corresponding to each type
 *     of block that is not LF
 */
function getNonLFBlocks(document: TextDocument): {
    comments: Range[], strings: Range[], code: Range[]
} {
    // TODO implement caching. It is likely that this same function will
    // be called on the same arguments several times consecutively.
    // FIXME: This is not DRY. These patterns are already in the TextMate
    // grammar. In fact, this problem underscores the fact that the entire
    // function is redundant -- a hack used to circumvent the fact that
    // the VS Code API does not permit access to the labels assigned by
    // the TextMate grammar.
    return getMutuallyExclusiveRanges(
        document,
        standardShadowPatterns,
        0,
        document.getText().length
    );
}

/**
 * Returns the programmatic (i.e., not comments or strings) ranges of
 * the given reactor body.
 * @param document an LF document
 * @param reactorBody the body of a reactor
 * @returns the programmatic ranges contained in `reactorBody`
 */
function getProgrammaticContent(
    document: TextDocument, reactorBody: Range
): Range[] {
    const nonLFBlocks = getNonLFBlocks(document);
    var unaffected = nonLFBlocks.comments.concat(nonLFBlocks.strings);
    for (const codeBlock of nonLFBlocks.code) {
        if (contains(reactorBody, codeBlock)) {
            const nestedShadow = getMutuallyExclusiveRanges(
                document,
                // FIXME: Use the appropriate shadow patterns for the
                // current target language.
                standardShadowPatterns,
                document.offsetAt(codeBlock.start) + '{='.length,
                document.offsetAt(codeBlock.end)
            )
            unaffected = unaffected.concat(nestedShadow.comments)
                .concat(nestedShadow.strings);

        }
    }
    return setDiff(document, reactorBody, unaffected);
}

/**
 * Returns the ranges beginning and ending with the given patterns.
 * @param document the document from which the ranges are to be found
 * @param patterns pairs of beginnings and corresponding endings for
 * each type of range
 * @param initialOffset the initial offset from which to search
 * @param finalOffset the offset at which to stop searching
 * @returns the ranges beginning and ending with the given patterns
 */
function getMutuallyExclusiveRanges(
    document: TextDocument,
    patterns: {comments: string[][], strings: string[][], code: string[][]},
    initialOffset: number,
    finalOffset: number
): {comments: Range[], strings: Range[], code: Range[]} {
    const ret = {comments: [], strings: [], code: []};
    const text = document.getText();
    var currentOffset = initialOffset;
    while (true) {
        let firstBlockType: string;
        let firstPair: string[];
        let firstOffset = Infinity;
        for (const [blockType, pairs] of Object.entries(patterns)) {
            for (const pair of pairs) {
                let offset = text.indexOf(pair[0], currentOffset);
                if (offset != -1 && offset < firstOffset) {
                    firstOffset = offset;
                    firstPair = pair;
                    firstBlockType = blockType;
                }
            }
        }
        if (firstOffset >= finalOffset || firstOffset === Infinity) {
            return ret;
        }
        let endOffset = text.indexOf(
            firstPair[1], firstOffset + firstPair[0].length);
        endOffset = endOffset === -1 ? text.length
            : endOffset + firstPair[1].length
        ret[firstBlockType].push(new Range(
            document.positionAt(firstOffset),
            document.positionAt(endOffset)
        ));
        currentOffset = endOffset;
    }
}

/**
 * Returns a representation of the set difference of the Positions
 * contained by `range` and `shadowRanges`, respectively.
 * @param range - A Range that may intersect with some elements of
 *     shadowRanges
 * @param shadowRanges - An array of ranges
 * @returns a list of disjoint ranges whose union contains a Position
 *     iff (`range` contains that position, and no element of
 *     `shadowRanges` contains that position)
 */
function setDiff(
    document: TextDocument, range: Range, shadowRanges: Range[]
): Range[] {
    // This implementation is quadratic in the length of shadowRanges, I
    // believe, and can possibly be improved upon by sorting `shadowRanges`
    // by both start and end. That would permit a binary search...
    const ret: Range[] = [];
    const nonEmptyShadow = shadowRanges.filter((range) => !range.isEmpty);
    let pos = range.start;
    while (contains(range, pos)) {
        do {
            var passed = true;
            for (let shadow of nonEmptyShadow) {
                if (contains(shadow, pos)) {
                    pos = shadow.end;
                    passed = false;
                }
            }
        } while (!passed);
        if (!contains(range, pos)) return ret;
        let newRange = new Range(pos, range.end);
        do {
            passed = true;
            for (let shadow of nonEmptyShadow) {
                if (contains(newRange, shadow.start)) {
                    newRange = newRange.with(...[,], shadow.start);
                    passed = false;
                }
            }
        } while (!passed);
        if (contains(range, newRange) && !newRange.isEmpty) {
            ret.push(newRange);
        }
        pos = newRange.end;
    }
    return ret;
}

/**
 * Returns the ranges that appear strictly later than a match to begin
 * but strictly before a corresponding match to end. For example, if
 * begin is '(' and end is ')', then this function would return a range
 * including the entirety of '(a(b(c)d)e)', except for the first and last
 * character. The nesting depth of a token is never negative.
 * 
 * @param document - The document to be examined for contained ranges
 * @param range - The range within the document in which to search
 * @param begin - The token that causes an increment of nesting depth
 * @param end - The token that causes a decrement of nesting depth. Must
 *     not be equal to begin.
 * @param shadowRanges - The ranges which detected matches to `begin`
 *     and `end` may not intersect
 * @param possibleNesting - Whether nesting depth greater than 1 is
 *     possible
 */
function getContainedRanges(
    document: TextDocument,
    range: Range,
    begin: string,
    end: string,
    shadowRanges: Range[] = [],
    possibleNesting: boolean = true
): Range[] {
    const text = document.getText();
    const endOffset = document.offsetAt(range.end);
    let ret: Range[] = [];
    let depth = 0;
    let current = document.offsetAt(range.start);
    let rangeStart: Position;

    const convertedRanges = shadowRanges.map(r => {
        return {
            start: document.offsetAt(r.start),
            end: document.offsetAt(r.end)
        }
    });
    const isInShadowRange = (idx: number) => convertedRanges.some(
        r => r.start <= idx && idx < r.end  // We could do a binary search...
    );
    function indexOf(token: string, fromIndex: number) {
        let current = text.indexOf(token, fromIndex);
        while (isInShadowRange(current) && current != -1) {
            current = text.indexOf(token, current + token.length);
        }
        if (current == -1 || current >= endOffset) return endOffset;
        return current;
    }

    while (current < endOffset) {
        const nextBegin = indexOf(begin, current);
        const nextEnd = indexOf(end, current);
        if (nextBegin < nextEnd) {
            if (possibleNesting || !depth) depth++;
            current = nextBegin + begin.length;
            if (depth == 1) rangeStart = document.positionAt(current);
        } else {
            if (depth) {
                depth--;
                if (depth == 0) {
                    ret.push(
                        new Range(rangeStart, document.positionAt(nextEnd))
                    );
                }
            }
            current = nextEnd + end.length;
        }
    }
    return ret;
}

/**
 * Returns an array of objects representing the locations of reactors in
 * `document`.
 * @param document - A document in which to search for reactors
 * @param range - The range in which to search for reactors
 * @return an array of objects representing the locations of reactors in
 *     `document`
 */
function getReactors(
    document: TextDocument, range: Range
): {declaration: Range, body: Range}[] {
    const stdShadow = standardShadow(document);
    const shadow = stdShadow.concat(getContainedRanges(
        document, range, '(', ')', stdShadow
    ));
    const ret: {declaration: Range, body: Range}[] = [];
    for (const reactorDeclaration of getContainedRanges(
        document, range, 'reactor', '{', shadow
    )) {
        const reactorBody = getContainedRanges(
            document, new Range(reactorDeclaration.end, range.end), '{', '}',
            shadow
        )[0]; // FIXME: Unnecessary computations are performed here.
        ret.push({declaration: reactorDeclaration, body: reactorBody})
    }
    return ret;
}

/**
 * Associates `tokenType` and `tokenModifiers` with matches to elements
 * of `tokens` that appear in some element of `ranges`.
 * @param document - The document in which to search for tokens
 * @param ranges - The ranges in `document` in which to search for tokens
 * @param tokens - The tokens for which to search
 * @param tokenType - The token type associated with the given tokens
 * @param tokenModifiers - The modifiers associated with the given tokens
 * @param tokensBuilder - The object that records the range-token type
 *     associations generated by this function
 */
function applyTokenType(
    document: TextDocument, ranges: Range[], tokens: string[],
    tokenType: string, tokenModifiers: string[],
    tokensBuilder: SemanticTokensBuilder
) {
    if (!tokens.length) return;
    for (const range of ranges) {
        const rangeOffset = document.offsetAt(range.start);
        const rangeText = document.getText(range);
        const regex = new RegExp('\\b' + tokens.join('\\b|\\b') + '\\b', 'g');
        let groups: string[];
        while ((groups = regex.exec(rangeText)) != null) {
            let token = new Range(
                document.positionAt(
                    rangeOffset + regex.lastIndex - groups[0].length),
                document.positionAt(rangeOffset + regex.lastIndex)
            );
            tokensBuilder.push(token, tokenType, tokenModifiers);
        }
    }
}

/**
 * Pushes semantic labels associated with type parameters to
 * `tokensBuilder`.
 * @param document - The document to be analyzed for type parameters
 * @param tokensBuilder  - The object that accumulates semantic labels
 */
function provideTypeParameters(
    document: TextDocument,
    tokensBuilder: SemanticTokensBuilder
) {
    const stdShadow = standardShadow(document);
    for (const reactor of getReactors(
        document, wholeDocument(document)
    )) {
        // TODO: Highlight the type parameter throughout
        const typeParameters: string[] = [];
        for (const typeParameterGroup of getContainedRanges(
            document, reactor.declaration, '<', '>', stdShadow
        )) {
            const lfRanges = setDiff(document, typeParameterGroup, stdShadow);
            for (const lfRange of lfRanges) {
                for (const word of getWords(document, lfRange, stdShadow)) {
                    tokensBuilder.push(word, 'typeParameter');
                    typeParameters.push(document.getText(word));
                }
            }
        }
        applyTokenType(
            document,
            getProgrammaticContent(document, reactor.body),
            typeParameters,
            'typeParameter', [],
            tokensBuilder
        );
    }
}

/**
 * Pushes semantic labels associated with parameters and their
 * associated types and default values to `tokensBuilder`.
 * @param document - The document to be analyzed for parameters
 * @param tokensBuilder  - The object that accumulates semantic labels
 */
function provideParameters(
    document: TextDocument,
    tokensBuilder: SemanticTokensBuilder
): void {
    const stdShadow = standardShadow(document);
    for (const reactor of getReactors(
        document, wholeDocument(document)
    )) {
        // TODO: Highlight the parameter throughout
        let parameters: string[] = [];
        for (const parameterList of getContainedRanges(
            document, reactor.declaration, '(', ')', stdShadow
        )) {
            const gcr = (left: string, right: string) => getContainedRanges(
                document, parameterList, left, right, stdShadow
            );
            let values = gcr('(', ')').concat(gcr('{', '}')).concat(gcr('[', ']'));
            values = values.concat(getContainedRanges(
                document, parameterList, '=', ',', stdShadow.concat(values), false
            ));
            const typesAndValues = getContainedRanges(
                document, parameterList, ':', ',', stdShadow.concat(values), false
            ).concat(values);
            for (const nonTypeValuePair of setDiff(
                document, parameterList, typesAndValues
            )) {
                const word: Range = getWords(document, nonTypeValuePair, stdShadow)[0];
                if (word) {
                    parameters.push(document.getText(word));
                    tokensBuilder.push(word, 'parameter', ['readonly']);
                }
            }
            for (const typeValuePair of typesAndValues) {
                for (const nonValue of setDiff(
                    document, typeValuePair, values
                )) {
                    for (const word of getWords(document, nonValue, stdShadow)) {
                        // FIXME: Should more safeguards (e.g., checking
                        // if first char is a letter) be put in place? Or
                        // should we favor strong rules over such heuristics?
                        let s: String = document.getText(word);
                        if (s.charAt(0).toUpperCase() === s.charAt(0)) {
                            tokensBuilder.push(word, 'class');
                        }
                        else {
                            tokensBuilder.push(word, 'type');
                        }
                    }
                }
            }
        }
        applyTokenType(
            document,
            getProgrammaticContent(document, reactor.body),
            parameters,
            'parameter', ['readonly'],
            tokensBuilder
        );
    }
}

/**
 * Pushes semantic labels associated with variables to `tokensBuilder`.
 * @param document - The document to be analyzed for variables
 * @param tokensBuilder  - The object that accumulates semantic labels
 */
function provideVariables(
    document: TextDocument,
    tokensBuilder: SemanticTokensBuilder
): void {
    const stdShadow = standardShadow(document);
    for (const reactor of getReactors(document, wholeDocument(document))) {
        // TODO: Highlight the variable throughout
        const lfContent: string = setDiff(document, reactor.body, stdShadow)
            .map(range => document.getText(range))
            .join('');  // FIXME: '' might not be the best placeholder
            // for shadowed regions.
        const variables: string[] = lfContent.match(
            /((?<=(action|timer|state|((mutable\s+input|output)(\[[^\]]*\])?))\s+)(\w+))/g
        );
        const constants: string[] = lfContent.match(
            /(?<=(?<!mutable\s+)input(\[[^\]]*\])?\s+)(\w+)/g
        );
        const program = getProgrammaticContent(document, reactor.body)
        if (variables) applyTokenType(
            document, program, variables, 'variable', [], tokensBuilder
        );
        if (constants) applyTokenType(
            document, program, constants,
            'variable', ['readonly'],
            tokensBuilder
        );
    }
}

/**
 * Pushes semantic labels associated with the assignment of values to
 * reactor parameters to `tokensBuilder`.
 * @param document - The document to be analyzed for parameter
 * assignments
 * @param tokensBuilder - The object that accumulates semantic labels
 */
function provideParameterAssignments(
    document: TextDocument,
    tokensBuilder: SemanticTokensBuilder
): void {
    const stdShadow = standardShadow(document);
    for (const reactor of getReactors(
        document, wholeDocument(document)
    )) {
        for (const argArea of getContainedRanges(
            document, reactor.body, '(', ')', stdShadow
        )) {
            const gcr = (left: string, right: string) => getContainedRanges(
                document, argArea, left, right, stdShadow
            );
            const nestedExpressions: Range[] = gcr('(', ')')
                .concat(gcr('{', '}')).concat(gcr('[', ']'));
            applyTokenType(
                document,
                setDiff(document, argArea, nestedExpressions),
                ['(?<=(^|,)\\s*)\\w+(?=\\s*[=([{])'],
                'parameter', [],
                tokensBuilder
            );
        }
    }
}

/**
 * Returns semantic labels associated with a subset of the tokens in
 * a document.
 * 
 * @param document - The document to be semantically analyzed
 * @returns - Semantic labels associated with some subset of the
 * document's tokens
 */
export const semanticTokensProvider: DocumentSemanticTokensProvider = {
    provideDocumentSemanticTokens(
        document: TextDocument,
        token: CancellationToken
    ): ProviderResult<SemanticTokens> {
        // TODO: respond the the cancellation token, _after_ it is no
        //  longer easier to simply make this script faster instead.
        const tokensBuilder = new SemanticTokensBuilder(legend);
        provideTypeParameters(document, tokensBuilder);
        provideParameters(document, tokensBuilder);
        provideParameterAssignments(document, tokensBuilder);
        provideVariables(document, tokensBuilder);
        return tokensBuilder.build();
    }
}
