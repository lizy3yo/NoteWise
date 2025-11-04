export default function HelpPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Help & Support
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Find answers to common questions and get support here.
                    </p>
                </div>

                {/* FAQ Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Frequently Asked Questions
                        </h2>
                        
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I create flashcards?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    You can create flashcards by going to the Flashcards section and choosing either "Create by Hand" for manual creation or "Upload File" to import from existing documents.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    How do I change the theme?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    You can change between light, dark, and system themes in your Profile settings under the Preferences tab, or in the Settings page.
                                </p>
                            </div>

                            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                    Can I organize my flashcards by subject?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Yes! When creating flashcards, you can assign them to different subjects. Your Library will automatically organize them into folders by subject.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                            Need More Help?
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Can't find what you're looking for? Contact our support team.
                        </p>
                        <div className="flex gap-4">
                            <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
                                Contact Support
                            </button>
                            <button className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                Send Feedback
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}