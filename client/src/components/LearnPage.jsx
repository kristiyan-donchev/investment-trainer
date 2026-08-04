import { useMemo, useState } from 'react';
import { LEARN_TOPICS } from '../lib/lessons.js';
import { GLOSSARY_TERMS } from '../lib/glossary.js';
import { useLessonProgress } from '../hooks/useLessonProgress.js';
import LessonQuiz from './LessonQuiz.jsx';

const GLOSSARY_LESSON_ID = 'glossary-reference';

export default function LearnPage() {
  const { isComplete, markComplete } = useLessonProgress();
  const [activeLessonId, setActiveLessonId] = useState(LEARN_TOPICS[0].lessons[0].id);

  const totalLessons = useMemo(
    () => LEARN_TOPICS.reduce((sum, topic) => sum + topic.lessons.length, 0) + 1, // +1 for glossary
    []
  );
  const completedCount = useMemo(() => {
    let count = isComplete(GLOSSARY_LESSON_ID) ? 1 : 0;
    for (const topic of LEARN_TOPICS) {
      for (const lesson of topic.lessons) {
        if (isComplete(lesson.id)) count += 1;
      }
    }
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);
  const progressPercent = Math.round((completedCount / totalLessons) * 100);

  const activeLesson =
    activeLessonId === GLOSSARY_LESSON_ID
      ? null
      : LEARN_TOPICS.flatMap((t) => t.lessons).find((l) => l.id === activeLessonId);

  return (
    <>
      <section className="panel learn-progress-panel">
        <div className="learn-progress-header">
          <h2>Your progress</h2>
          <span className="learn-progress-count">
            {completedCount} / {totalLessons} lessons complete
          </span>
        </div>
        <div className="learn-progress-bar">
          <div className="learn-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <div className="learn-layout">
        <nav className="learn-nav">
          {LEARN_TOPICS.map((topic) => (
            <div className="learn-topic-group" key={topic.id}>
              <div className="learn-topic-title">
                <span aria-hidden="true">{topic.icon}</span> {topic.title}
              </div>
              <div className="learn-lesson-list">
                {topic.lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    className={lesson.id === activeLessonId ? 'learn-lesson-item active' : 'learn-lesson-item'}
                    onClick={() => setActiveLessonId(lesson.id)}
                  >
                    <span className="learn-lesson-check" aria-hidden="true">
                      {isComplete(lesson.id) ? '✓' : ''}
                    </span>
                    {lesson.title}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="learn-topic-group">
            <div className="learn-topic-title">
              <span aria-hidden="true">📖</span> Reference
            </div>
            <div className="learn-lesson-list">
              <button
                type="button"
                className={activeLessonId === GLOSSARY_LESSON_ID ? 'learn-lesson-item active' : 'learn-lesson-item'}
                onClick={() => setActiveLessonId(GLOSSARY_LESSON_ID)}
              >
                <span className="learn-lesson-check" aria-hidden="true">
                  {isComplete(GLOSSARY_LESSON_ID) ? '✓' : ''}
                </span>
                Glossary
              </button>
            </div>
          </div>
        </nav>

        <section className="panel learn-content">
          {activeLessonId === GLOSSARY_LESSON_ID && (
            <>
              <h2>Glossary</h2>
              <p className="learn-lesson-summary">Quick definitions for common investing vocabulary used throughout the app.</p>
              <dl className="glossary">
                {GLOSSARY_TERMS.map((t) => (
                  <div key={t.term} className="glossary-item">
                    <dt>{t.term}</dt>
                    <dd>{t.text}</dd>
                  </div>
                ))}
              </dl>
              {isComplete(GLOSSARY_LESSON_ID) ? (
                <p className="quiz-complete">✓ Reviewed</p>
              ) : (
                <button type="button" className="secondary-button" onClick={() => markComplete(GLOSSARY_LESSON_ID)}>
                  Mark as reviewed
                </button>
              )}
            </>
          )}

          {activeLesson && (
            <>
              <h2>{activeLesson.title}</h2>
              <p className="learn-lesson-summary">{activeLesson.summary}</p>

              {activeLesson.sections.map((section) => (
                <div className="learn-section" key={section.heading}>
                  <h3>{section.heading}</h3>
                  {section.body && <p>{section.body}</p>}
                  {section.list && (
                    <ul>
                      {section.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              <LessonQuiz
                key={activeLesson.id}
                questions={activeLesson.quiz}
                onAllCorrect={() => markComplete(activeLesson.id)}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}
