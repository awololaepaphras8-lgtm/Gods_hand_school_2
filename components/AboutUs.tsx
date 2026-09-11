import React, { useState } from 'react';

interface AboutUsProps {
  onApply: () => void;
  onCheckFees?: () => void;
  onBack?: () => void;
}

export const AboutUs: React.FC<AboutUsProps> = ({ onApply, onCheckFees, onBack }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "Which is the top and best private primary and secondary school with affordable fees in Ibadan?",
      a: "God's Hand International Model School is widely celebrated as the top and best private primary and secondary school with affordable fees in Ibadan. Located in the Wire and Cable, Apata axis, the school provides quality education from Creche, Nursery, and Primary to Junior and Senior Secondary classes at transparent, budget-friendly rates."
    },
    {
      q: "Why is God's Hand Model School rated the best private school with affordable fees in Ibadan?",
      a: "We combine high educational standards with truly affordable tuition. Our students benefit from certified teachers, modern science laboratories, computer ICT facilities, small class sizes, and flexible termly installment payments that ensure every family can afford quality private education."
    },
    {
      q: "Where is the school located at Wire and Cable, Ibadan?",
      a: "The school is centrally located at Oluwatedo Ire-Akari, Orisunmibare Area, Owode, along the Wire and Cable axis, Apata, Ibadan, Oyo State. It is easily accessible from Abeokuta Expressway, Kuola, Omi-Adio, Bembo, and Dugbe."
    },
    {
      q: "What classes and programs are available at God's Hand Model School?",
      a: "We offer complete private school programs spanning Early Childhood (Creche, KG 1-2 & Nursery 1-2), Basic Primary (Primary 1-5), Junior Secondary (JSS 1-3), and Senior Secondary (SSS 1-3 Science, Arts, and Commercial departments)."
    },
    {
      q: "How can parents check tuition fees or register for admission?",
      a: "Parents can check our transparent class-by-class fee schedule directly using our online School Fees Checker or submit an online admission application through our digital portal."
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Top Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-black text-blue-900 bg-white hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <span>←</span>
            <span>Back to School Home</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-yellow-100 text-blue-900 border border-yellow-300 rounded-full text-xs font-black uppercase tracking-wider">
            <span>★ Top & Best Private School • Affordable Fees in Ibadan</span>
          </div>
        </div>

        {/* Hero Header on About Page */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-200 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2.5 bg-yellow-400"></div>
          <div className="max-w-3xl">
            <span className="text-xs font-black text-blue-900 bg-blue-100 px-3.5 py-1 rounded-full uppercase tracking-widest inline-block mb-4">
              About Our School • Quality & Affordability
            </span>
            <h1 className="text-3xl sm:text-5xl font-serif font-black text-blue-900 leading-tight mb-4">
              Top & Best Private <br />
              <span className="text-yellow-600 underline decoration-yellow-400 decoration-wavy decoration-2">
                Primary & Secondary School
              </span> <br />
              and Affordable Fees in Ibadan
            </h1>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800 mb-6">
              God's Hand International Model School • Wire & Cable, Apata, Ibadan, Oyo State
            </p>
            <p className="text-slate-700 text-base sm:text-lg leading-relaxed font-medium mb-8">
              At <strong>God's Hand International Model School</strong>, we are proud to be recognized as the <strong>top and best private primary and secondary school with affordable fees in Ibadan</strong>. Situated along the Wire and Cable, Apata axis, we deliver premier basic and secondary education, modern science and ICT computer laboratories, dedicated certified teachers, and Christian moral discipline at transparent, family-friendly tuition fees.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={onApply}
                className="px-8 py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <span>Apply for Admission</span>
                <span>→</span>
              </button>
              {onCheckFees && (
                <button
                  type="button"
                  onClick={onCheckFees}
                  className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95"
                >
                  💳 Check Affordable Fees Schedule
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Quality & Affordability Key Highlights */}
        <section className="bg-gradient-to-r from-blue-900 to-blue-950 text-white rounded-3xl p-8 sm:p-10 shadow-xl border-2 border-blue-800 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-serif font-black text-yellow-400">Top Rated</p>
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider">Private Primary & Secondary</p>
            <p className="text-[11px] text-blue-200/70 font-medium">From Creche & Nursery to SSS 3</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-serif font-black text-yellow-400">Affordable</p>
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider">Tuition & School Fees</p>
            <p className="text-[11px] text-blue-200/70 font-medium">Transparent with zero hidden charges</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-serif font-black text-yellow-400">Flexible</p>
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider">Termly Payment Plans</p>
            <p className="text-[11px] text-blue-200/70 font-medium">Convenient installment options for parents</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-serif font-black text-yellow-400">1:15</p>
            <p className="text-xs sm:text-sm font-black uppercase tracking-wider">Pupil to Teacher Ratio</p>
            <p className="text-[11px] text-blue-200/70 font-medium">Individualized care and mentoring</p>
          </div>
        </section>

        {/* Pillars of School Excellence & Affordability */}
        <section className="space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-black text-yellow-600 bg-yellow-100 px-3.5 py-1 rounded-full uppercase tracking-widest">
              Why Parents Choose God's Hand Model School
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif font-black text-blue-900 mt-3 mb-3">
              The Top & Best Private Primary and Secondary School with Affordable Fees in Ibadan
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              At God's Hand International Model School, our mission is to make first-class private education accessible to all families. We blend modern classroom instruction, science exploration, computer literacy, and strong Christian values at transparent, affordable tuition rates.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-blue-900 text-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                💳
              </div>
              <h3 className="text-xl font-serif font-black text-blue-900">
                Affordable & Transparent School Fees
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                We provide the most competitive tuition fees in Ibadan with transparent termly schedules, flexible installment plans, and zero hidden levies, making top private education genuinely affordable.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-blue-900 text-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                🔬
              </div>
              <h3 className="text-xl font-serif font-black text-blue-900">
                Modern Science & Computer Laboratories
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our campus features well-equipped Physics, Chemistry, Biology, and ICT computer laboratories where students and pupils gain practical STEM skills and digital literacy from an early age.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-blue-900 text-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                👨‍🏫
              </div>
              <h3 className="text-xl font-serif font-black text-blue-900">
                Experienced & Caring Subject Teachers
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Our educators are certified, seasoned specialists who mentor every learner with patience and devotion, fostering strong study habits and lifelong curiosity.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-blue-900 text-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                🏫
              </div>
              <h3 className="text-xl font-serif font-black text-blue-900">
                Complete Primary to Secondary Education
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                From early childhood foundations in Creche and Kindergarten to advanced Senior Secondary classes, we guide your child seamlessly through every educational milestone.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-blue-900 text-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                📖
              </div>
              <h3 className="text-xl font-serif font-black text-blue-900">
                Christian Ethics & Moral Discipline
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                True education builds strong character. Guided by our motto <em>"Have Faith In God"</em>, we nurture integrity, respect, diligence, and upright leadership in every student.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-sm space-y-3">
              <div className="w-12 h-12 bg-blue-900 text-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-black shadow-md">
                📍
              </div>
              <h3 className="text-xl font-serif font-black text-blue-900">
                Prime Location at Wire & Cable, Apata
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Centrally situated at Owode / Wire and Cable, Apata, Ibadan. Easily accessible from Abeokuta Expressway, Kuola, Omi-Adio, Dugbe, and Bembo with secure, gated premises.
              </p>
            </div>
          </div>
        </section>

        {/* Academic Program Progression */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-200 shadow-lg space-y-8">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-xs font-black text-blue-900 bg-blue-100 px-3.5 py-1 rounded-full uppercase tracking-widest">
              Curriculum & Classes
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-blue-900 mt-3 mb-2">
              Comprehensive Private Education from Creche to SSS 3
            </h2>
            <p className="text-slate-600 text-sm">
              Providing enriching Nigerian-British curricula designed to nurture academic competence, digital literacy, and moral character at every level.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-2xl">🌱</span>
              <h4 className="font-serif font-black text-lg text-blue-900">Early Childhood</h4>
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Creche & KG 1 - Nursery 2</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Montessori-inspired phonics, numeracy foundations, sensory development, and social confidence in a warm, loving environment.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-2xl">📘</span>
              <h4 className="font-serif font-black text-lg text-blue-900">Basic Primary</h4>
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Primary 1 - 5</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Critical thinking, Mathematics, English grammar, Quantitative/Verbal reasoning, Science, and computer foundations.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-2xl">🔬</span>
              <h4 className="font-serif font-black text-lg text-blue-900">Junior Secondary</h4>
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider">JSS 1 - 3</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Comprehensive basic science, introductory technology, ICT computer skills, business studies, and foundational development.
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-2xl">🎓</span>
              <h4 className="font-serif font-black text-lg text-blue-900">Senior Secondary</h4>
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider">SSS 1 - 3</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Specialized Science, Commercial, and Arts departments with dedicated laboratories and intensive university-entry preparations.
              </p>
            </div>
          </div>
        </section>

        {/* School Location Authority */}
        <section className="bg-gradient-to-br from-white to-blue-50/50 p-8 sm:p-12 rounded-3xl border-2 border-blue-900/20 shadow-xl grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs font-black text-blue-900 bg-yellow-300 px-3 py-1 rounded-full uppercase tracking-wider">
              Prime School Location
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-black text-blue-900">
              Easily Accessible at Wire & Cable, Apata, Ibadan
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Families from <strong>Wire and Cable, Owode, Orisunmibare, Kuola, Omi-Adio, Bembo, Dugbe, and Ibadan Southwest</strong> choose God's Hand Model School for its peaceful learning environment, proximity to transport networks, and affordable fees.
            </p>
            <div className="space-y-2 text-xs font-bold text-slate-700">
              <p className="flex items-center gap-2">
                <span className="text-blue-900">📍</span>
                <span><strong>Address:</strong> Oluwatedo Ire-Akari, Orisunmibare Area, Owode, Wire and Cable Axis, Apata, Ibadan, Oyo State</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-blue-900">📞</span>
                <span><strong>Hotline:</strong> 08056507252 | 08130300837</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-blue-900">✉️</span>
                <span><strong>Email:</strong> godshandschool70@gmail.com</span>
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-blue-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl space-y-4">
            <div className="overflow-hidden rounded-xl border-2 border-yellow-400/40 shadow-inner">
              <img 
                src="/school_premises.jpg" 
                alt="God's Hand International Model School Campus at Wire & Cable, Apata, Ibadan" 
                referrerPolicy="no-referrer"
                className="w-full h-48 object-cover hover:scale-105 transition-transform"
              />
            </div>
            <h4 className="text-lg font-serif font-black text-yellow-400">
              Visit Our Campus in Ibadan
            </h4>
            <p className="text-xs text-blue-100/80 leading-relaxed font-medium">
              We warmly invite prospective parents to tour our campus, inspect our classrooms and computer labs, and discover our affordable fee plans.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onApply}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md text-center"
              >
                Apply for Admission
              </button>
              {onCheckFees && (
                <button
                  type="button"
                  onClick={onCheckFees}
                  className="w-full py-3 bg-blue-800 hover:bg-blue-700 text-white border border-blue-600 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md text-center"
                >
                  Check Fees
                </button>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-slate-200 shadow-md space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-black text-yellow-600 bg-yellow-100 px-3.5 py-1 rounded-full uppercase tracking-widest">
              Parent Questions & Answers
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black text-blue-900 mt-3 mb-2">
              Frequently Asked Questions About Our Private School & Affordable Fees in Ibadan
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Everything you need to know about enrollments, classes, and affordable tuition at God's Hand International Model School, Ibadan.
            </p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index}
                  className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white transition-all shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex justify-between items-center gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-serif font-black text-sm sm:text-base text-blue-900">
                      {faq.q}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-900 font-black flex items-center justify-center text-sm shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
