export default function HelpPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Help & Support
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        Find answers to common questions and get support here.
                    </p>
                </div>

                {/* FAQ Section */}
                <div className="space-y-4 sm:space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
                            Frequently Asked Questions
                        </h2>
                        
                        <div className="space-y-4 sm:space-y-6">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I create flashcards?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Go to the Library page and click "+ Create Set" to create flashcards manually. You can add questions, answers, and optional images to each card.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I generate AI summaries?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Click on "Generate" in the sidebar or go to Study Mode. Upload your document (PDF, Word, or text file) and our AI will generate a comprehensive summary with key concepts highlighted.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I use the AI chatbot?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Click the chat icon in the bottom-right corner of any page. You can ask questions, upload documents for analysis, or get study help. Your chat sessions can be saved for later reference.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I organize my study materials?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Use folders to organize your flashcards and summaries. In the Library, you can create folders, move items between folders, and mark important items as favorites for quick access.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How does spaced repetition work?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    When you study flashcards, our algorithm tracks your performance and schedules reviews at optimal intervals to maximize retention. Cards you struggle with appear more frequently.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I change the theme?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Click on your profile picture in the top-right corner and toggle the "Dark mode" switch to change between light and dark themes.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    What are achievements and streaks?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Achievements are badges you earn by completing study milestones. Study streaks track consecutive days of studying. Check your Achievements page to see your progress and unlock new badges!
                                </p>
                            </div>

                            <div className="pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I share my flashcards?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    In the Library, click the menu (three dots) on any flashcard set or folder. You can set it to Public (anyone can view), Link-based (only people with the link), or Private (only you).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                            Need More Help?
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                            Can't find what you're looking for? Contact our support team at <a href="mailto:not3wis3@gmail.com" className="text-teal-600 dark:text-teal-400 hover:underline font-medium">not3wis3@gmail.com</a>
                        </p>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong className="text-gray-900 dark:text-white">Pro Tip:</strong> You can also use the AI chatbot (bottom-right corner) to get instant answers to your questions!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}