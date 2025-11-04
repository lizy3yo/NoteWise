export default function AchievementsPage() {
    const achievements = [
        {
            id: 1,
            title: "First Steps",
            description: "Created your first flashcard set",
            icon: "🎯",
            earned: true,
            earnedDate: "2024-11-01"
        },
        {
            id: 2,
            title: "Study Streak",
            description: "Studied for 7 days in a row",
            icon: "🔥",
            earned: true,
            earnedDate: "2024-11-05"
        },
        {
            id: 3,
            title: "Knowledge Master",
            description: "Created 10 flashcard sets",
            icon: "🏆",
            earned: false,
            progress: 3,
            total: 10
        },
        {
            id: 4,
            title: "Perfect Score",
            description: "Got 100% on a practice test",
            icon: "⭐",
            earned: false,
            progress: 0,
            total: 1
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Achievements
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Track your learning milestones and celebrate your progress.
                    </p>
                </div>

                {/* Achievements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {achievements.map((achievement) => (
                        <div
                            key={achievement.id}
                            className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6 transition-all ${
                                achievement.earned
                                    ? 'border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20'
                                    : 'border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`text-4xl ${achievement.earned ? 'grayscale-0' : 'grayscale opacity-50'}`}>
                                    {achievement.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`text-lg font-semibold mb-2 ${
                                        achievement.earned 
                                            ? 'text-teal-900 dark:text-teal-100' 
                                            : 'text-gray-900 dark:text-white'
                                    }`}>
                                        {achievement.title}
                                    </h3>
                                    <p className={`text-sm mb-3 ${
                                        achievement.earned 
                                            ? 'text-teal-700 dark:text-teal-300' 
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {achievement.description}
                                    </p>
                                    
                                    {achievement.earned ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-teal-600 dark:text-teal-400">
                                                ✓ Earned
                                            </span>
                                            <span className="text-xs text-teal-500 dark:text-teal-400">
                                                {new Date(achievement.earnedDate!).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                <span>Progress</span>
                                                <span>{achievement.progress}/{achievement.total}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div 
                                                    className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${(achievement.progress! / achievement.total!) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stats Summary */}
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Your Progress
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                                {achievements.filter(a => a.earned).length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Achievements Earned
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {achievements.length}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Total Available
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                {Math.round((achievements.filter(a => a.earned).length / achievements.length) * 100)}%
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Completion Rate
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}