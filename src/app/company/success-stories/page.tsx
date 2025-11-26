"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SuccessStories() {
  const router = useRouter();

  const stories = [
    {
      name: "Sarah Chen",
      role: "Computer Science Student",
      university: "MIT",
      image: "👩‍💻",
      story: "NoteWise helped me improve my GPA from 3.2 to 3.9 in just one semester. The AI-generated summaries saved me hours of study time, and the flashcards made memorizing complex algorithms so much easier.",
      achievement: "Improved GPA by 0.7 points",
      color: "from-blue-500 to-cyan-500",
    },
    {
      name: "Marcus Johnson",
      role: "Medical Student",
      university: "Johns Hopkins",
      image: "👨‍⚕️",
      story: "Studying medicine requires memorizing vast amounts of information. NoteWise's flashcard system and spaced repetition helped me ace my anatomy exams. I couldn't have done it without this tool!",
      achievement: "Scored 95% on final exams",
      color: "from-red-500 to-pink-500",
    },
    {
      name: "Emily Rodriguez",
      role: "Business Major",
      university: "Stanford",
      image: "👩‍💼",
      story: "As someone juggling multiple courses and internships, NoteWise was a game-changer. The ability to quickly generate summaries from my lecture notes meant I could study efficiently even with a packed schedule.",
      achievement: "Maintained 4.0 GPA while working",
      color: "from-purple-500 to-indigo-500",
    },
    {
      name: "David Kim",
      role: "Engineering Student",
      university: "Georgia Tech",
      image: "👨‍🔧",
      story: "The AI summaries helped me understand complex engineering concepts faster. I went from struggling with thermodynamics to becoming a tutor for other students. NoteWise literally changed my academic career.",
      achievement: "Became a peer tutor",
      color: "from-orange-500 to-yellow-500",
    },
    {
      name: "Aisha Patel",
      role: "Psychology Major",
      university: "UCLA",
      image: "👩‍🎓",
      story: "I used to spend hours creating study materials. Now, NoteWise does it in minutes. The time I save goes into actually understanding the material, not just organizing it. My exam scores have never been better!",
      achievement: "Reduced study time by 50%",
      color: "from-green-500 to-emerald-500",
    },
    {
      name: "James Wilson",
      role: "Law Student",
      university: "Harvard",
      image: "👨‍⚖️",
      story: "Law school is intense, but NoteWise made it manageable. The ability to quickly summarize case studies and create flashcards for legal terms was invaluable. I'm now in the top 10% of my class.",
      achievement: "Top 10% of class ranking",
      color: "from-teal-500 to-cyan-500",
    },
  ];

  const stats = [
    { number: "10,000+", label: "Students Helped" },
    { number: "95%", label: "Improved Grades" },
    { number: "50%", label: "Time Saved" },
    { number: "4.8/5", label: "Average Rating" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-shrink-0" onClick={() => router.push("/")}>
              <Image src="/notewise.png" alt="NoteWise Logo" width={32} height={32} className="sm:w-10 sm:h-10" />
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                NoteWise
              </h1>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-3 py-2 sm:px-6 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0"
            >
              Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Success Stories
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Real students, real results. See how NoteWise is helping students achieve their academic goals
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl text-center border border-gray-100 dark:border-gray-700 shadow-lg"
            >
              <div className="text-4xl font-bold text-teal-600 dark:text-teal-400 mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600 dark:text-gray-300">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Success Stories Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {stories.map((story, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all"
            >
              <div className={`bg-gradient-to-r ${story.color} p-6`}>
                <div className="flex items-center gap-4">
                  <div className="text-6xl">{story.image}</div>
                  <div className="text-white">
                    <h3 className="text-2xl font-bold">{story.name}</h3>
                    <p className="text-white/90">{story.role}</p>
                    <p className="text-white/80 text-sm">{story.university}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-5 h-5 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4 italic">
                    "{story.story}"
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {story.achievement}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white dark:bg-gray-800 rounded-3xl p-12 border border-gray-100 dark:border-gray-700">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Write Your Success Story?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of students who are already achieving their academic goals with NoteWise
          </p>
          <button
            onClick={() => router.push("/auth/signup")}
            className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg"
          >
            Start Your Journey
          </button>
        </div>
      </main>
    </div>
  );
}
