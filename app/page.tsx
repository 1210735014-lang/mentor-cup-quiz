"use client";

import { useEffect, useMemo, useState } from "react";
import { questions, type Question, type QuestionType } from "./questions";

type Screen = "home" | "quiz" | "result" | "history";
type TypeFilter = "全部题型" | QuestionType;
type TopicFilter = "全部题目" | "下皱襞术式" | "腋窝内窥镜";
type AnswerValue = number[] | string;

type AnswerRecord = {
  questionId: string;
  question: string;
  type: QuestionType;
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
};

type Attempt = {
  id: string;
  createdAt: string;
  type: TypeFilter;
  topic: TopicFilter;
  score: number;
  total: number;
  answers: AnswerRecord[];
};

const STORAGE_KEY = "mentor-cup-quiz-history-v1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const SOURCE_URL = process.env.NEXT_PUBLIC_SOURCE_URL || `${BASE_PATH}/mentor-cup-quiz-source.zip`;
const assetUrl = (path: string) => `${BASE_PATH}${path}`;
const typeOptions: TypeFilter[] = ["全部题型", "判断题", "单选题", "多选题", "填空题"];
const amountOptions = [10, 20, 0];

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[\s，,。；;：:（）()＿_—\-]/g, "");
}

function correctLabel(question: Question) {
  if (question.type === "填空题") return String(question.answers[0]);
  return question.answers
    .map((answer) => `${String.fromCharCode(65 + Number(answer))}. ${question.options[Number(answer)]}`)
    .join("、");
}

function userLabel(question: Question, value: AnswerValue) {
  if (typeof value === "string") return value || "未作答";
  if (!value.length) return "未作答";
  return value
    .map((answer) => `${String.fromCharCode(65 + answer)}. ${question.options[answer]}`)
    .join("、");
}

function isCorrect(question: Question, value: AnswerValue) {
  if (question.type === "填空题") {
    const input = normalized(String(value));
    const expected = String(question.answers[0]);
    const accepted = expected.split(/或|\//).map(normalized).filter(Boolean);
    return input.length > 0 && accepted.some((answer) => input === answer);
  }
  const selected = [...(value as number[])].sort();
  const answers = question.answers.map(Number).sort();
  return selected.length === answers.length && selected.every((item, index) => item === answers[index]);
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("全部题型");
  const topicFilter: TopicFilter = "全部题目";
  const [amount, setAmount] = useState(10);
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerValue>([]);
  const [checked, setChecked] = useState(false);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      setHistory([]);
    }
  }, []);

  const available = useMemo(
    () =>
      questions.filter(
        (question) =>
          (typeFilter === "全部题型" || question.type === typeFilter) &&
          (topicFilter === "全部题目" || question.topics.includes(topicFilter)),
      ),
    [typeFilter, topicFilter],
  );

  const current = quiz[index];
  const correct = current ? isCorrect(current, answer) : false;

  function startQuiz() {
    if (!available.length) return;
    const selected = shuffle(available).slice(0, amount === 0 ? available.length : Math.min(amount, available.length));
    setQuiz(selected);
    setIndex(0);
    setAnswer(selected[0]?.type === "填空题" ? "" : []);
    setChecked(false);
    setRecords([]);
    setScreen("quiz");
    window.scrollTo(0, 0);
  }

  function commitAnswer() {
    if (!current || checked) return;
    if ((typeof answer === "string" && !answer.trim()) || (Array.isArray(answer) && !answer.length)) return;
    const record: AnswerRecord = {
      questionId: current.id,
      question: current.question,
      type: current.type,
      userAnswer: userLabel(current, answer),
      correctAnswer: correctLabel(current),
      correct,
    };
    setRecords((items) => [...items, record]);
    setChecked(true);
  }

  function pickOption(optionIndex: number) {
    if (!current || checked) return;
    if (current.type === "多选题") {
      setAnswer((value) => {
        const selected = Array.isArray(value) ? value : [];
        return selected.includes(optionIndex)
          ? selected.filter((item) => item !== optionIndex)
          : [...selected, optionIndex].sort();
      });
      return;
    }
    setAnswer([optionIndex]);
    setTimeout(() => {
      const pickedCorrect = isCorrect(current, [optionIndex]);
      const record: AnswerRecord = {
        questionId: current.id,
        question: current.question,
        type: current.type,
        userAnswer: userLabel(current, [optionIndex]),
        correctAnswer: correctLabel(current),
        correct: pickedCorrect,
      };
      setRecords((items) => [...items, record]);
      setChecked(true);
    }, 80);
  }

  function nextQuestion() {
    if (index + 1 < quiz.length) {
      const next = quiz[index + 1];
      setIndex((value) => value + 1);
      setAnswer(next.type === "填空题" ? "" : []);
      setChecked(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const attempt: Attempt = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      type: typeFilter,
      topic: topicFilter,
      score: records.filter((item) => item.correct).length,
      total: quiz.length,
      answers: records,
    };
    const nextHistory = [attempt, ...history];
    setHistory(nextHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
    setScreen("result");
    window.scrollTo(0, 0);
  }

  function resetHome() {
    setScreen("home");
    setQuiz([]);
    setRecords([]);
    window.scrollTo(0, 0);
  }

  if (screen === "quiz" && current) {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <main className="app-shell quiz-shell">
        <header className="quiz-header">
          <button className="icon-button" onClick={resetHome} aria-label="退出本次练习">×</button>
          <div className="quiz-progress-copy"><strong>{index + 1}</strong><span> / {quiz.length}</span></div>
          <span className="type-badge">{current.type}</span>
        </header>
        <div className="progress-track"><span style={{ width: `${((index + 1) / quiz.length) * 100}%` }} /></div>

        <section className="question-card">
          <div className="question-meta"><span>{current.chapter.replace("章节", "")}</span><span>第 {index + 1} 题</span></div>
          <h1>{current.question}</h1>
          {current.type === "多选题" && <p className="hint">可选择多个答案，完成后点击确认</p>}

          {current.type === "填空题" ? (
            <div className="fill-wrap">
              <label htmlFor="fill-answer">请填写答案</label>
              <textarea
                id="fill-answer"
                value={typeof answer === "string" ? answer : ""}
                onChange={(event) => setAnswer(event.target.value)}
                disabled={checked}
                placeholder="在这里输入你的答案"
                rows={3}
              />
            </div>
          ) : (
            <div className="options" role="group" aria-label="答案选项">
              {current.options.map((option, optionIndex) => {
                const isSelected = selected.includes(optionIndex);
                const isAnswer = current.answers.map(Number).includes(optionIndex);
                const classNames = ["option"];
                if (isSelected) classNames.push("selected");
                if (checked && isAnswer) classNames.push("answer-correct");
                if (checked && isSelected && !isAnswer) classNames.push("answer-wrong");
                return (
                  <button key={optionIndex} className={classNames.join(" ")} onClick={() => pickOption(optionIndex)} disabled={checked}>
                    <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                    <span>{option}</span>
                    {current.type === "多选题" && <span className="check-box" aria-hidden="true">{isSelected ? "✓" : ""}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {!checked && (current.type === "多选题" || current.type === "填空题") && (
            <button className="primary-button" onClick={commitAnswer} disabled={typeof answer === "string" ? !answer.trim() : !answer.length}>确认答案</button>
          )}

          {checked && (
            <div className={`feedback ${correct ? "correct" : "wrong"}`} aria-live="polite">
              <div className="feedback-title"><span>{correct ? "✓" : "×"}</span>{correct ? "回答正确" : "回答错误"}</div>
              <div className="answer-panel"><small>正确答案</small><strong>{correctLabel(current)}</strong></div>
              <button className="primary-button" onClick={nextQuestion}>{index + 1 === quiz.length ? "查看本次成绩" : "下一题"}<span>→</span></button>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (screen === "result") {
    const score = records.filter((item) => item.correct).length;
    const percent = Math.round((score / Math.max(records.length, 1)) * 100);
    return (
      <main className="app-shell result-shell">
        <section className="result-card">
          <img className="mentor-logo result-logo" src={assetUrl("/mentor-logo.png")} alt="Mentor" />
          <div className="score-ring" style={{ "--score": `${percent * 3.6}deg` } as React.CSSProperties}>
            <div><strong>{percent}</strong><span>分</span></div>
          </div>
          <h1>{percent >= 80 ? "完成得很出色" : percent >= 60 ? "继续巩固，稳步提升" : "再练一次，会更熟练"}</h1>
          <p>本次答对 <strong>{score}</strong> 题，共 {records.length} 题</p>
          <div className="result-stats"><span><b>{typeFilter}</b>题目类型</span><span><b>{topicFilter}</b>练习专题</span></div>
          <button className="primary-button" onClick={startQuiz}>按当前设置再练一次</button>
          <button className="secondary-button" onClick={resetHome}>返回题库首页</button>
        </section>
      </main>
    );
  }

  if (screen === "history") {
    return (
      <main className="app-shell history-shell">
        <header className="subpage-header"><button className="icon-button back" onClick={resetHome}>←</button><h1>做题记录</h1><span>{history.length} 次</span></header>
        {history.length === 0 ? (
          <div className="empty-state"><div>◎</div><h2>还没有做题记录</h2><p>完成一次练习后，成绩和每题答案会保存在这里。</p><button className="primary-button" onClick={resetHome}>开始第一次练习</button></div>
        ) : (
          <div className="history-list">
            {history.map((attempt) => (
              <article className="history-item" key={attempt.id}>
                <button className="history-summary" onClick={() => setExpandedHistory(expandedHistory === attempt.id ? null : attempt.id)}>
                  <div className="history-score"><strong>{Math.round((attempt.score / attempt.total) * 100)}</strong><span>分</span></div>
                  <div><strong>{attempt.type} · {attempt.topic}</strong><span>{new Date(attempt.createdAt).toLocaleString("zh-CN", { hour12: false })}</span><small>答对 {attempt.score} / {attempt.total} 题</small></div>
                  <span className="chevron">{expandedHistory === attempt.id ? "⌃" : "⌄"}</span>
                </button>
                {expandedHistory === attempt.id && (
                  <div className="history-detail">
                    {attempt.answers.map((item, itemIndex) => (
                      <div className="history-answer" key={`${item.questionId}-${itemIndex}`}>
                        <span className={item.correct ? "mini-correct" : "mini-wrong"}>{item.correct ? "✓" : "×"}</span>
                        <div><strong>{itemIndex + 1}. {item.question}</strong><p>你的答案：{item.userAnswer}</p>{!item.correct && <p>正确答案：{item.correctAnswer}</p>}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="app-shell home-shell">
      <section className="hero">
        <div className="hero-top"><img className="mentor-logo" src={assetUrl("/mentor-logo.png")} alt="Mentor" /><button className="history-button" onClick={() => setScreen("history")}><span>↺</span>做题记录</button></div>
        <p className="eyebrow">MENTOR CUP · 第十届</p>
        <h1>第十届曼托杯隆胸咨询与测量大赛题库</h1>
        <p className="hero-note">从题型和专题中自由组合，开始一次专注练习</p>
        <div className="library-counts"><span><strong>219</strong>道精选题目</span><i /><span><strong>4</strong>种题型</span></div>
      </section>

      <section className="setup-card">
        <div className="setup-section"><div className="section-title"><span>01</span><div><h2>选择题型</h2><p>选择一种题型，或混合练习全部题型</p></div></div>
          <div className="choice-grid type-grid">{typeOptions.map((type) => <button key={type} className={typeFilter === type ? "active" : ""} onClick={() => setTypeFilter(type)}>{type}</button>)}</div>
        </div>
        <div className="setup-section"><div className="section-title"><span>03</span><div><h2>本次题量</h2><p>题目将从符合条件的题库中随机抽取</p></div></div>
          <div className="choice-grid amount-grid">{amountOptions.map((value) => <button key={value} className={amount === value ? "active" : ""} onClick={() => setAmount(value)}>{value === 0 ? `全部 ${available.length} 题` : `${Math.min(value, available.length)} 题`}</button>)}</div>
        </div>
        <div className="ready-line"><span>当前可练习</span><strong>{available.length} 道题</strong></div>
        <button className="primary-button start-button" onClick={startQuiz} disabled={!available.length}>开始练习 <span>→</span></button>
        {!available.length && <p className="no-questions">当前组合暂无题目，请更换题型或专题。</p>}
        <p className="local-note">做题记录会自动保存在此设备中</p>
      </section>
      <footer>
        <span>MENTOR · 学习资料仅供大赛备考使用</span>
        <a href={SOURCE_URL}>{process.env.NEXT_PUBLIC_SOURCE_URL ? "MIT 开源 · 查看 GitHub 源码" : "MIT 开源 · 下载网站源码"}</a>
      </footer>
    </main>
  );
}
