"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function OurTeam() {
  const router = useRouter();

  const teamMembers = [
    {
      name: "Aljhun Abanes",
      role: "Product Owner",
      icon: "👨‍💼",
      color: "from-blue-500 to-cyan-500",
      quote:
        "I believe great products are built with empathy — for users and teammates alike.",
    },
    {
      name: "Earl Ordovez",
      role: "Scrum Master",
      icon: "👨‍💻",
      image: "/team/Earl_Ordovez.png",
      color: "from-purple-500 to-pink-500",
      quote: "I focus on enabling the team to deliver value predictably and sustainably.",
    },
    {
      name: "Kharl De Jesus",
      role: "Developer",
      icon: "👨‍🔧",
      image: "/team/kharl_white_bg.png",
      color: "from-green-500 to-emerald-500",
      quote: "I enjoy turning complex problems into simple, maintainable solutions.",
    },
    {
      name: "Marina Camaso",
      role: "QA",
      icon: "👩‍🔬",
      image: "/team/Marina_Camaso.jpg",
      color: "from-orange-500 to-red-500",
      quote: "My goal is to make sure every student gets a smooth, trustworthy experience.",
    },
  ];

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/")}>
              <Image src="/notewise.png" alt="NoteWise Logo" width={40} height={40} />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                NoteWise
              </h1>
            </div>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
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
            Meet Our Team
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            The talented individuals behind NoteWise, dedicated to transforming the way students learn
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-transform hover:-translate-y-2"
            >
              <div className={`bg-gradient-to-br ${member.color} overflow-hidden`}> 
                {member.image ? (
                  <div className="relative w-full h-44 md:h-56 lg:h-64">
                    <Image
                      src={member.image}
                      alt={`${member.name} photo`}
                      fill
                      className="object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-44 md:h-56 lg:h-64 text-6xl">
                    {member.icon}
                  </div>
                )}
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{member.name}</h3>
                <p className="text-teal-600 dark:text-teal-400 font-semibold mb-3">{member.role}</p>
                <blockquote className="text-sm text-gray-600 dark:text-gray-300 italic">“{member.quote}”</blockquote>
              </div>
            </div>
          ))}
        </div>

        {/* Team Description */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-12 text-white text-center">
          <h3 className="text-3xl font-bold mb-6">Building the Future of Learning</h3>
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Our diverse team combines expertise in product management, agile development, software engineering, 
            and quality assurance to deliver an exceptional learning experience for students worldwide.
          </p>
        </div>
      </main>
    </div>
  );
}