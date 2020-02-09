import React, { useEffect, useRef } from 'react';
import raw from 'raw.macro';
import { IoIosPlayCircle } from 'react-icons/io';
import * as yaksok from 'yaksok';

import * as styles from './App.module.css';

const yaksokPrelude = raw('./processing.yaksok');

function App() {
    const editorRef = useRef();
    const iframeRef = useRef();
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
            <button
                className={styles.playButton}
                onClick={onPlayButtonClick}>
                <IoIosPlayCircle/>
            </button>
        </div>
        <div id="editor" className={styles.editor}>
            {initialCode}
        </div>
        <iframe
            ref={iframeRef}
            className={styles.result}
            sandbox="allow-scripts allow-pointer-lock allow-same-origin allow-popups allow-forms allow-modals"
        />
    </>;
}

export default App;

const initialCode = `
경로들: []
그리는_중: 거짓
다음: 0
현재: ()
과거: ()

약속 입자 만들기 (정보)
    결과: {
        위치: 정보.위치,
        속도: 정보.속도,
        생명: 255,
    }

약속 (입자) 입자 갱신하기
    입자.위치: (입자.위치)와 입자.속도 벡터의 합
    입자.속도: 입자.속도 벡터 곱하기 0.95
    입자.생명: 입자.생명 - 1

약속 (입자) 입자와 (다음) 입자 그리기
    만약 입자.생명 <= 1 이면
        약속 그만
    선 설정 { 색상: 'rgba(0, 0, 0, ' + (입자.생명 / 255) + ')' }
    채우기 설정 { 색상: 'rgba(0, 0, 0, ' + (입자.생명 / 2 / 255) + ')' }
    타원 그리기 { 위치: 입자.위치, 가로: 8, 세로: 8 }
    만약 다음 != () 이면
        직선 그리기 { 시작: 입자.위치, 끝: 다음.위치 }

약속 (경로) 경로 갱신하기
    반복 경로 의 지금 마다
        지금 입자 갱신하기

약속 (경로) 경로 그리기
    반복 1~(경로.길이) 의 숫자 마다
        지금: 경로[숫자]
        다음: 경로[숫자 + 1]
        지금 입자와 다음 입자 그리기

약속 준비하기
    바깥 현재
    바깥 과거
    도화지 크기는 { 가로: 720, 세로: 400 }
    현재: { 위쪽: 0, 왼쪽: 0 }
    과거: { 위쪽: 0, 왼쪽: 0 }

약속 그리기
    바깥 경로들
    바깥 그리는_중
    바깥 다음
    바깥 현재
    바깥 과거
    배경색은 '#ccc'
    선 설정 { 색상: 'none' }
    채우기 설정 { 색상: '#000' }
    글쓰기 {
        내용: '마우스를 드래그 해보세요',
        위치: { 위쪽: 20, 왼쪽: 20 },
        크기: 16,
    }
    글쓰기 {
        내용: '원전: https://editor.p5js.org/p5/sketches/Hello_P5:_drawing',
        위치: { 위쪽: 40, 왼쪽: 20 },
        크기: 16,
    }
    만약 (지나간 시간) > 다음 그리고 그리는_중 이면
        현재: { 위쪽: 마우스.위쪽, 왼쪽: 마우스.왼쪽 }
        속도: 현재와 과거 벡터의 차
        새_입자: 입자 만들기 {
            위치: 현재,
            속도: 속도 벡터 곱하기 0.05,
        }
        경로들[경로들.길이]에 새_입자 추가하기
        다음: (지나간 시간) + (0.1 보다 작은 아무 수)
        과거: { 위쪽: 현재.위쪽, 왼쪽: 현재.왼쪽 }
    반복 경로들 의 지금 마다
        지금 경로 갱신하기
        지금 경로 그리기

약속 마우스를 누르면
    바깥 경로들
    바깥 그리는_중
    바깥 다음
    바깥 과거
    다음: 0
    그리는_중: 참
    과거.위쪽: 마우스.위쪽
    과거.왼쪽: 마우스.왼쪽
    경로들[경로들.길이 + 1]: []

약속 마우스를 놓으면
    바깥 그리는_중
    그리는_중: 거짓
`.trimStart();

function stub(code) {
    return (
        yaksokPrelude +
        stubFnCode +
        code + '\n' +
        '__stub (결속 준비하기) "setup"\n' +
        '__stub (결속 그리기) "draw"\n' +
        '__stub (결속 마우스를 누르면) "mousePressed"\n' +
        '__stub (결속 마우스를 놓으면) "mouseReleased"\n' +
        ''
    );
}

const stubFnCode = `
번역(자바스크립트) __stub (cb) (key)
***
    window[key] = () => {
        window.마우스 = { 위쪽: window.mouseY, 왼쪽: window.mouseX };
        cb();
    };
***
`;

async function getIframeSrcDoc(yaksokCode) {
    const compiler = new yaksok.compiler.JsTargetCompiler();
    const jsCode = await compiler.compile(stub(yaksokCode));
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
