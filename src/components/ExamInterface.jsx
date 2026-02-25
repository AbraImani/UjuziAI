import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, ChevronRight, CheckCircle, XCircle, Shield, Loader2 } from 'lucide-react';
import { useExam } from '../hooks/useFirestore';
import { EXAM_CONFIG } from '../config/modules';
import toast from 'react-hot-toast';

// ============================================
// Question component for MCQ
// ============================================
function MCQQuestion({ question, onAnswer, timeLeft }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (optionIndex) => {
    setSelected(optionIndex);
    onAnswer(optionIndex);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">{question.text}</h3>
        {question.codeSnippet && (
          <pre className="bg-surface-800 rounded-lg p-4 text-sm font-mono text-surface-300 overflow-x-auto mb-4">
            {question.codeSnippet}
          </pre>
        )}
      </div>

      <div className="space-y-3">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
              selected === index
                ? 'border-primary-500 bg-primary-500/10 text-white'
                : 'border-surface-700 bg-surface-800/50 text-surface-300 hover:border-surface-500 hover:bg-surface-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  selected === index
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-700 text-surface-400'
                }`}
              >
                {String.fromCharCode(65 + index)}
              </div>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Question component for Open-ended
// ============================================
function OpenQuestion({ question, onAnswer, timeLeft }) {
  const [answer, setAnswer] = useState('');

  const handleChange = (e) => {
    setAnswer(e.target.value);
    onAnswer(e.target.value);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">{question.text}</h3>
        {question.context && (
          <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-surface-400">{question.context}</p>
          </div>
        )}
      </div>

      <textarea
        value={answer}
        onChange={handleChange}
        placeholder="Write your answer here. Be specific, detailed, and demonstrate your understanding of the concepts..."
        rows={10}
        className="input-field resize-none font-normal"
      />
      <p className="text-xs text-surface-500 mt-2">{answer.length} characters</p>
    </div>
  );
}

// ============================================
// Timer Component
// ============================================
function Timer({ seconds, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isLow = timeLeft <= 10;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-lg ${
        isLow
          ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
          : 'bg-surface-800 text-surface-200 border border-surface-700'
      }`}
    >
      <Clock className="w-5 h-5" />
      {minutes > 0 ? `${minutes}:${secs.toString().padStart(2, '0')}` : `${secs}s`}
    </div>
  );
}

// ============================================
// Main Exam Interface
// ============================================
export default function ExamInterface({ moduleId, examId, questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [completing, setCompleting] = useState(false);
  const { submitAnswer, completeExam } = useExam();
  const navigate = useNavigate();

  const currentQuestion = questions[currentIndex];
  const isMCQ = currentQuestion?.type === 'mcq';
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const timeForQuestion = isMCQ ? EXAM_CONFIG.MCQ_TIME_SECONDS : EXAM_CONFIG.OPEN_TIME_SECONDS;

  const handleAnswer = (answer) => {
    setCurrentAnswer(answer);
  };

  const goNext = useCallback(async () => {
    // Save answer
    try {
      await submitAnswer(examId, currentIndex, currentAnswer, currentQuestion.type);
    } catch (err) {
      console.error('Error saving answer:', err);
    }

    const newAnswers = [...answers];
    newAnswers[currentIndex] = currentAnswer;
    setAnswers(newAnswers);
    setCurrentAnswer(null);

    if (isLastQuestion) {
      // Complete exam
      setCompleting(true);
      try {
        await completeExam(examId, moduleId);
        toast.success('Exam completed! Results are being processed.');
        onComplete?.();
      } catch (err) {
        toast.error('Error completing exam');
      } finally {
        setCompleting(false);
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentAnswer, currentIndex, isLastQuestion, answers, examId, moduleId, submitAnswer, completeExam, currentQuestion, onComplete]);

  const handleTimerExpire = useCallback(() => {
    toast('Time\'s up! Moving to next question.');
    goNext();
  }, [goNext]);

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Anti-cheat warning */}
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Warning Detected</h3>
            <p className="text-surface-400 mb-6">
              Our system detected suspicious activity. This is your first warning.
              A second detection will result in an automatic zero.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="btn-primary"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-surface-400 mb-1">
            <Shield className="w-4 h-4" />
            Proctored Exam
          </div>
          <h2 className="text-xl font-bold text-white">
            Question {currentIndex + 1} of {totalQuestions}
          </h2>
          <p className="text-sm text-surface-400">
            {isMCQ ? 'Multiple Choice' : 'Open-ended'} • {isMCQ ? 'Select the best answer' : 'Write your detailed response'}
          </p>
        </div>

        <Timer
          key={currentIndex}
          seconds={timeForQuestion}
          onExpire={handleTimerExpire}
        />
      </div>

      {/* Progress */}
      <div className="flex gap-1 mb-8">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              index < currentIndex
                ? 'bg-primary-500'
                : index === currentIndex
                ? 'bg-primary-400 animate-pulse'
                : 'bg-surface-700'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="glass-card p-8 mb-6">
        {isMCQ ? (
          <MCQQuestion
            key={currentIndex}
            question={currentQuestion}
            onAnswer={handleAnswer}
            timeLeft={timeForQuestion}
          />
        ) : (
          <OpenQuestion
            key={currentIndex}
            question={currentQuestion}
            onAnswer={handleAnswer}
            timeLeft={timeForQuestion}
          />
        )}
      </div>

      {/* Next button */}
      <div className="flex justify-end">
        <button
          onClick={goNext}
          disabled={currentAnswer === null || completing}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {completing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : isLastQuestion ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Submit Exam
            </>
          ) : (
            <>
              Next Question
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>

      {/* Notice */}
      <div className="mt-6 flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-surface-400">
          <p className="font-medium text-amber-400 mb-1">Exam Rules</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>No back navigation allowed</li>
            <li>Answers auto-submit when timer expires</li>
            <li>AI-generated responses will be flagged</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
