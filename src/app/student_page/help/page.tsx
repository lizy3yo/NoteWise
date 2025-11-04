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
                                    You can create flashcards by going to the Flashcards section and choosing either "Create by Hand" for manual creation or "Upload File" to import from existing documents.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I change the theme?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    You can change between light, dark, and system themes in your Profile settings under the Preferences tab, or in the Settings page.
                                </p>
                            </div>

                            <div className="pb-4">
                                <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    Can I organize my flashcards by subject?
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                    Yes! When creating flashcards, you can assign them to different subjects. Your Library will automatically organize them into folders by subject.
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
                            Can't find what you're looking for? Contact our support team.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button className="w-full sm:w-auto bg-teal-600 text-white px-4 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium">
                                Contact Support
                            </button>
                            <button className="w-full sm:w-auto bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                                Send Feedback
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}