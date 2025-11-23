"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

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
    _id: string;
    title: string;
    description: string;
    subject: string;
    difficulty: string;
    timeLimit: number;
    totalPoints: number;
    topics: string[];
    multipleChoiceQuestions: MultipleChoiceQuestion[];
    writtenQuestions: WrittenQuestion[];
    learningObjectives?: string[];
    instructions?: string;
};

export default function PracticeTestViewPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const [practiceTest, setPracticeTest] = useState<PracticeTest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            const fetchPracticeTest = async () => {
                try {
                    const response = await fetch(`/api/student_page/practice-test/${id}`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch practice test');
                    }
                    const data = await response.json();
                    setPracticeTest(data.data);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPracticeTest();
        }
    }, [id]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen">Error: {error}</div>;
    }

    if (!practiceTest) {
        return <div className="flex justify-center items-center h-screen">Practice test not found.</div>;
    }

    const handleStartTest = () => {
        // Store the full practice test data in session storage
        sessionStorage.setItem('current_practice_test', JSON.stringify(practiceTest));
        // Navigate to the take test page
        router.push(`/student_page/practice_tests/${practiceTest._id}/take`);
    };

    const totalQuestions = (practiceTest.multipleChoiceQuestions?.length || 0) + (practiceTest.writtenQuestions?.length || 0);

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg overflow-hidden">
                <div className="p-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">{practiceTest.title}</h1>
                    <p className="text-lg text-gray-600 dark:text-slate-400 mb-4">{practiceTest.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-slate-300">Subject:</p>
                            <p className="text-gray-800 dark:text-slate-200">{practiceTest.subject}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-slate-300">Difficulty:</p>
                            <p className="text-gray-800 dark:text-slate-200">{practiceTest.difficulty}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-slate-300">Time Limit:</p>
                            <p className="text-gray-800 dark:text-slate-200">{practiceTest.timeLimit} minutes</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-slate-300">Total Points:</p>
                            <p className="text-gray-800 dark:text-slate-200">{practiceTest.totalPoints}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-slate-300">Questions:</p>
                            <p className="text-gray-800 dark:text-slate-200">{totalQuestions} questions</p>
                        </div>
                    </div>

                    <div>
                        <p className="font-semibold text-gray-700 dark:text-slate-300">Topics:</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {practiceTest.topics.map((topic, index) => (
                                <span key={index} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-sm font-medium mr-2 px-2.5 py-0.5 rounded">
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
                    <button 
                        onClick={handleStartTest}
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                    >
                        Take Test
                    </button>
                </div>
            </div>
        </div>
    );
}
