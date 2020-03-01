import React, { useState, useEffect, useRef } from 'react';
import raw from 'raw.macro';
import { IoIosPlayCircle } from 'react-icons/io';
import * as yaksok from 'yaksok';

import * as styles from './App.module.css';

const yaksokPrelude = raw('./processing.yaksok');
const codes = {
    drawing: raw('./examples/drawing.yaksok'),
    multiple_lights: raw('./examples/multiple_lights.yaksok'),
};

function App() {
    const editorRef = useRef();
    const iframeRef = useRef();
    const [selectedExample, setSelectedExample] = useState('drawing');
    useEffect(() => {
        const editor = editorRef.current = ace.edit('editor');
        editor.renderer.setScrollMargin(10, window.innerHeight);
        editor.setOptions({
            selectionStyle: 'text',
            useSoftTabs: true,
            highlightActiveLine: false,
            showPrintMargin: false,
            theme: 'ace/theme/monokai',
        });
        const YaksokMode = ace.require('ace/mode/yaksok').Mode;
        editor.getSession().setMode(new YaksokMode());
    }, []);
    useEffect(() => {
        const editor = editorRef.current;
        editor.setValue(codes[selectedExample]);
        editor.execCommand('gotostart');
    }, [selectedExample]);
    const onPlayButtonClick = () => {
        const editor = editorRef.current;
        const yaksokCode = editor.getValue();
        getIframeSrcDoc(yaksokCode).then(({ jsCode, srcDoc }) => {
            console.log(jsCode);
            iframeRef.current.srcdoc = srcDoc;
        });
    };
    return <>
        <div className={styles.header}>
            <select
                className={styles.selectExample}
                value={selectedExample}
                onChange={e => setSelectedExample(e.target.value)}>
                <option value="drawing">그리기</option>
                <option value="multiple_lights">삼차원 조명</option>
            </select>
            <button
                className={styles.playButton}
                onClick={onPlayButtonClick}>
                <IoIosPlayCircle/>
            </button>
        </div>
        <div id="editor" className={styles.editor}/>
        <iframe
            ref={iframeRef}
            className={styles.result}
            sandbox="allow-scripts allow-pointer-lock allow-same-origin allow-popups allow-forms allow-modals"
        />
    </>;
}

export default App;

const callParser = new yaksok.parser.Parser(['START_CALL']);
const callAsts = {
    setup: getCallAst('준비하기'),
    draw: getCallAst('그리기'),
    mousePressed: getCallAst('마우스를 누르면'),
    mouseReleased: getCallAst('마우스를 놓으면'),
};

function getCallAst(code) {
    const node = callParser.parse(code);
    if (node instanceof yaksok.ast.Name) {
        const callExpressions = new yaksok.ast.Expressions();
        callExpressions.push(node);
        return new yaksok.ast.Call(callExpressions);
    }
    return node;
}

class P5JsTranslator extends yaksok.translator.JsTranslator {
    async epilogue() {
        for (const call in callAsts) {
            const callAst = callAsts[call];
            try {
                await this.compiler.analyzer.visit(callAst);
                this.write(`window.${call} = (...args) => {
                    window.마우스 = { 위쪽: window.mouseY, 왼쪽: window.mouseX };
                    window.프레임번호 = frameCount;
                    ${this.getFunctionExprFromCall(callAst)}(...args);
                };`);
            } catch {}
        }
    }
}

async function getIframeSrcDoc(yaksokCode) {
    const compiler = new yaksok.compiler.JsTargetCompiler();
    compiler.translator = new P5JsTranslator();
    const jsCode = await compiler.compile(yaksokPrelude + yaksokCode);
    const srcDoc = `
<!DOCTYPE HTML>
<html>
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.10.2/p5.js" crossorigin=""></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.10.2/addons/p5.sound.min.js" crossorigin=""></script>
    <meta charset="utf-8">
    <style>
        html, body {
            margin: 0;
            padding: 0;
        }
        canvas {
            display: block;
        }
    </style>
</head>
<body>
    <script>
        ${jsCode}
    </script>
</body>
</html>
`;
    return {
        jsCode,
        srcDoc,
    };
}
