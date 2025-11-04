"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type MultipleChoiceQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
  topic: string;
  points: number;
};

type WrittenQuestion = {
  question: string;
  expectedAnswer: string;
  rubric: string[];
  difficulty: string;
  topic: string;
  points: number;
};

type PracticeTest = {
  _id?: string;
  title: string;
  description: string;
  subject: string;
  difficulty: string;
  timeLimit: number;
  totalPoints: number;
  multipleChoiceQuestions: MultipleChoiceQuestion[];
  writtenQuestions: WrittenQuestion[];
  topics: string[];
  learningObjectives: string[];
  instructions: string;
};

type Answer = {
  questionIndex: number;
  questionType: 'multiple-choice' | 'written';
  selectedAnswer?: number;
  writtenAnswer?: string;
  timeSpent: number;
};

export default function TakeTestPage() {
  const router = useRouter();
  const [practiceTest, setPracticeTest] = useState<PracticeTest | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load test from session storage
    const testData = sessionStorage.getItem('current_practice_test');
    if (!testData) {
      alert('No practice test found. Please start a test from the practice tests page.');
      router.push('/student_page/practice_tests');
      return;
    }

    try {
      const test = JSON.parse(testData) as PracticeTest;
      
      // Validate that test has required question arrays
      if (!test.multipleChoiceQuestions) {
        test.multipleChoiceQuestions = [];
      }
      if (!test.writtenQuestions) {
        test.writtenQuestions = [];
      }

      // Ensure all questions have required properties
      test.multipleChoiceQuestions = test.multipleChoiceQuestions.map(q => ({
        ...q,
        points: q.points || 0,
        options: q.options || [],
        difficulty: q.difficulty || 'medium',
        topic: q.topic || ''
      }));

      test.writtenQuestions = test.writtenQuestions.map(q => ({
        ...q,
        points: q.points || 0,
        difficulty: q.difficulty || 'medium',
        topic: q.topic || '',
        rubric: q.rubric || []
      }));

      // Check if test has any questions
      const totalQuestionsCount = test.multipleChoiceQuestions.length + test.writtenQuestions.length;
      if (totalQuestionsCount === 0) {
        alert('This practice test has no questions. Please generate a test first.');
        router.push('/student_page/practice_tests');
        return;
      }
      
      setPracticeTest(test);
      setTimeRemaining(test.timeLimit * 60); // convert to seconds

      // Get userId
      const uid = localStorage.getItem('userId') || `temp-user-${Date.now()}`;
      setUserId(uid);

      // Initialize answers array
      const initialAnswers: Answer[] = [];
      
      test.multipleChoiceQuestions.forEach((_, idx) => {
        initialAnswers.push({
          questionIndex: idx,
          questionType: 'multiple-choice',
          timeSpent: 0
        });
      });
      
      test.writtenQuestions.forEach((_, idx) => {
        initialAnswers.push({
          questionIndex: test.multipleChoiceQuestions.length + idx,
          questionType: 'written',
          timeSpent: 0
        });
      });
      
      setAnswers(initialAnswers);
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load practice test:', error);
      alert('Failed to load practice test. Please try again.');
      router.push('/student_page/practice_tests');
    }
  }, [router]);

  // Timer countdown
  useEffect(() => {
    if (!practiceTest || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [practiceTest, timeRemaining]);

  const handleAutoSubmit = () => {
    alert('Time is up! Your test will be submitted automatically.');
    handleSubmit();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentQuestion = () => {
    if (!practiceTest) return null;
    
    const mcCount = practiceTest.multipleChoiceQuestions.length;
    
    if (currentQuestionIndex < mcCount) {
      return {
        type: 'multiple-choice' as const,
        question: practiceTest.multipleChoiceQuestions[currentQuestionIndex],
        number: currentQuestionIndex + 1
      };
    } else {
      const writtenIndex = currentQuestionIndex - mcCount;
      return {
        type: 'written' as const,
        question: practiceTest.writtenQuestions[writtenIndex],
        number: currentQuestionIndex + 1
      };
    }
  };

  const updateTimeSpent = () => {
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    setAnswers(prev => {
      const updated = [...prev];
      if (updated[currentQuestionIndex]) {
        updated[currentQuestionIndex].timeSpent += timeSpent;
      }
      return updated;
    });
    setQuestionStartTime(Date.now());
  };

  const handleMultipleChoiceAnswer = (optionIndex: number) => {
    updateTimeSpent();
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentQuestionIndex] = {
        ...updated[currentQuestionIndex],
        selectedAnswer: optionIndex
      };
      return updated;
    });
  };

  const handleWrittenAnswer = (text: string) => {
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentQuestionIndex] = {
        ...updated[currentQuestionIndex],
        writtenAnswer: text
      };
      return updated;
    });
  };

  const handleNext = () => {
    if (!practiceTest) return;
    updateTimeSpent();
    const totalQuestions = practiceTest.multipleChoiceQuestions.length + practiceTest.writtenQuestions.length;
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    updateTimeSpent();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    updateTimeSpent();
    setCurrentQuestionIndex(index);
  };

  const getAnsweredCount = () => {
    return answers.filter(a => 
      (a.questionType === 'multiple-choice' && a.selectedAnswer !== undefined) ||
      (a.questionType === 'written' && a.writtenAnswer && a.writtenAnswer.trim().length > 0)
    ).length;
  };

  const handleSubmit = async () => {
    if (!practiceTest || !userId) return;
    
    updateTimeSpent();
    setIsSubmitting(true);

    try {
      const totalTimeSpent = (practiceTest.timeLimit * 60) - timeRemaining;

      const response = await fetch('/api/student_page/practice-test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          practiceTestId: practiceTest._id || 'temp',
          practiceTest,
          answers,
          timeSpent: totalTimeSpent
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit');
      }

      // Store submission ID and navigate to results
      sessionStorage.setItem('last_submission_id', data.submission._id);
      sessionStorage.removeItem('current_practice_test');
      router.push('/student_page/practice_tests/results');

    } catch (error: any) {
      alert(error.message || 'Failed to submit test');
      setIsSubmitting(false);
    }
  };

  if (!practiceTest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  const currentQ = getCurrentQuestion();
  const totalQuestions = practiceTest.multipleChoiceQuestions.length + practiceTest.writtenQuestions.length;
  const answeredCount = getAnsweredCount();
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Timer */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 mb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{practiceTest.title}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Question {currentQuestionIndex + 1} of {totalQuestions} • {answeredCount} answered
            </p>
          </div>
          <div className={`text-right ${timeRemaining < 300 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}>
            <div className="text-sm font-medium">Time Remaining</div>
            <div className="text-3xl font-bold">{formatTime(timeRemaining)}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigation Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 sticky top-32">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Questions</h3>
            <div className="grid grid-cols-5 lg:grid-cols-4 gap-2">
              {answers.map((answer, idx) => {
                const isAnswered = 
                  (answer.questionType === 'multiple-choice' && answer.selectedAnswer !== undefined) ||
                  (answer.questionType === 'written' && answer.writtenAnswer && answer.writtenAnswer.trim().length > 0);
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`
                      w-full aspect-square rounded-lg font-semibold text-sm transition-all
                      ${idx === currentQuestionIndex 
                        ? 'bg-green-500 text-white ring-4 ring-green-200 dark:ring-green-900' 
                        : isAnswered 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }
                      hover:scale-105
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 shadow-lg"
            >
              Submit Test
            </button>
          </div>
        </div>

        {/* Question Content */}
        <div className="lg:col-span-3">
          {currentQ && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
              {/* Question Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Question {currentQ.number}
                    </span>
                    {currentQ.type === 'multiple-choice' ? (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                        Multiple Choice • {currentQ.question.points || 0} pts
                      </span>
                    ) : (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-medium">
                        Written Response • {currentQ.question.points || 0} pts
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {currentQ.question.question}
                  </h2>
                </div>
              </div>

              {/* Answer Area */}
              <div className="mt-8">
                {currentQ.type === 'multiple-choice' ? (
                  <div className="space-y-3">
                    {currentQ.question.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleMultipleChoiceAnswer(idx)}
                        className={`
                          w-full text-left p-4 rounded-xl border-2 transition-all
                          ${answers[currentQuestionIndex]?.selectedAnswer === idx
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center
                            ${answers[currentQuestionIndex]?.selectedAnswer === idx
                              ? 'border-green-500 bg-green-500'
                              : 'border-slate-300 dark:border-slate-600'
                            }
                          `}>
                            {answers[currentQuestionIndex]?.selectedAnswer === idx && (
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-slate-900 dark:text-slate-100">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Your Answer
                    </label>
                    <textarea
                      value={answers[currentQuestionIndex]?.writtenAnswer || ''}
                      onChange={(e) => handleWrittenAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      className="w-full h-64 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none focus:border-green-500 focus:outline-none"
                    />
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      {answers[currentQuestionIndex]?.writtenAnswer?.length || 0} characters
                    </p>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                
                {!isLastQuestion ? (
                  <button
                    onClick={handleNext}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:from-green-600 hover:to-green-700 shadow-lg"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitConfirm(true)}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 shadow-lg"
                  >
                    Submit Test
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Submit Test?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You've answered {answeredCount} out of {totalQuestions} questions.
              {answeredCount < totalQuestions && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400 font-medium">
                  Warning: You have {totalQuestions - answeredCount} unanswered question(s).
                </span>
              )}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
