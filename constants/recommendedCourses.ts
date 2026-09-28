import { GradeLevel } from '../types';

export interface RecommendedCourseTemplate {
  name: string;
  category: 'Early Childhood' | 'Nursery' | 'Primary / Basic' | 'Junior Secondary' | 'Senior Secondary (Science)' | 'Senior Secondary (Commercial)' | 'Senior Secondary (Arts)';
  description: string;
  applicableGrades: GradeLevel[];
  icon: string;
}

export const RECOMMENDED_COURSES_CATALOG: RecommendedCourseTemplate[] = [
  // 1. Early Childhood / Creche / Pre-Nursery
  {
    name: 'Letter Work & Phonics Sounds',
    category: 'Early Childhood',
    description: 'Foundational alphabet sound recognition, phonics and speech building.',
    applicableGrades: ['Crèche', 'Pre-Nursery 1', 'Pre-Nursery 2', 'Prenursery 1', 'Prenursery 2'],
    icon: '🔤'
  },
  {
    name: 'Number Work & Counting',
    category: 'Early Childhood',
    description: 'Introductory numeral recognition, object counting and shapes.',
    applicableGrades: ['Crèche', 'Pre-Nursery 1', 'Pre-Nursery 2', 'Prenursery 1', 'Prenursery 2'],
    icon: '🔢'
  },
  {
    name: 'Rhymes, Songs & Story Time',
    category: 'Early Childhood',
    description: 'Nursery rhymes, moral tales, auditory retention and musical expression.',
    applicableGrades: ['Crèche', 'Pre-Nursery 1', 'Pre-Nursery 2', 'Nursery 1', 'Nursery 2'],
    icon: '🎵'
  },
  {
    name: 'Health Habits & Hygiene',
    category: 'Early Childhood',
    description: 'Handwashing, table manners, cleanliness and bodily care.',
    applicableGrades: ['Crèche', 'Pre-Nursery 1', 'Pre-Nursery 2', 'Nursery 1', 'Nursery 2'],
    icon: '🧼'
  },
  {
    name: 'Social Habits & Christian Morals',
    category: 'Early Childhood',
    description: 'Respect for elders, sharing, kindness, and morning prayers to God.',
    applicableGrades: ['Crèche', 'Pre-Nursery 1', 'Pre-Nursery 2', 'Nursery 1', 'Nursery 2'],
    icon: '🙏'
  },
  {
    name: 'Sensory Exploration & Motor Skills',
    category: 'Early Childhood',
    description: 'Color identification, scribbling, block play, and tactile coordination.',
    applicableGrades: ['Crèche', 'Pre-Nursery 1', 'Pre-Nursery 2'],
    icon: '🎨'
  },

  // 2. Nursery School
  {
    name: 'English Language & Pre-Reading',
    category: 'Nursery',
    description: 'Sight words, three-letter blending, basic sentence formation and vocabulary.',
    applicableGrades: ['Nursery 1', 'Nursery 2'],
    icon: '📖'
  },
  {
    name: 'Elementary Mathematics',
    category: 'Nursery',
    description: 'Addition, subtraction, ordinal numbers, time concepts and spatial awareness.',
    applicableGrades: ['Nursery 1', 'Nursery 2'],
    icon: '➕'
  },
  {
    name: 'Basic Science & Nature Study',
    category: 'Nursery',
    description: 'Animals, plants, weather, water, human body parts and our environment.',
    applicableGrades: ['Nursery 1', 'Nursery 2'],
    icon: '🌱'
  },
  {
    name: 'Handwriting & Calligraphy',
    category: 'Nursery',
    description: 'Pencil grip, letter tracing, spacing and cursive foundations.',
    applicableGrades: ['Nursery 1', 'Nursery 2'],
    icon: '✍️'
  },
  {
    name: 'Creative Arts & Coloring',
    category: 'Nursery',
    description: 'Crayon coloring, paper craft, modeling clay and artistic expression.',
    applicableGrades: ['Nursery 1', 'Nursery 2'],
    icon: '🖍️'
  },

  // 3. Primary / Basic School (Basic 1 to Basic 5)
  {
    name: 'Mathematics',
    category: 'Primary / Basic',
    description: 'Arithmetic operations, fractions, decimals, geometry, measurement, statistics and algebra.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '📐'
  },
  {
    name: 'English Language',
    category: 'Primary / Basic',
    description: 'Grammar, reading comprehension, essay writing, phonics, spelling and speech work.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '📚'
  },
  {
    name: 'Basic Science & Technology',
    category: 'Primary / Basic',
    description: 'Living & non-living things, simple machines, energy, materials and laboratory safety.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🔬'
  },
  {
    name: 'Social Studies',
    category: 'Primary / Basic',
    description: 'Family life, culture, community leadership, Nigerian geography and global awareness.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🌍'
  },
  {
    name: 'Civic Education',
    category: 'Primary / Basic',
    description: 'National symbols, rights and responsibilities, democracy, honesty and patriotism.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🇳🇬'
  },
  {
    name: 'Christian Religious Studies (CRS)',
    category: 'Primary / Basic',
    description: 'Biblical moral values, faith in God, life of Christ, obedience and Christian heritage.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '✝️'
  },
  {
    name: 'Agricultural Science',
    category: 'Primary / Basic',
    description: 'Crop production, soil types, farm tools, animal husbandry and food preservation.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🌾'
  },
  {
    name: 'Computer Studies / ICT',
    category: 'Primary / Basic',
    description: 'Computer hardware, software, typing skills, digital citizenship and basic coding.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '💻'
  },
  {
    name: 'Yoruba Language & Culture',
    category: 'Primary / Basic',
    description: 'Kika, kiko, ewi, asa ati ise Yoruba, owe ati itan ibile.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🗣️'
  },
  {
    name: 'French Language',
    category: 'Primary / Basic',
    description: 'Basic French greetings, numbers, family members, vocabulary and conversation.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🇫🇷'
  },
  {
    name: 'Quantitative Reasoning',
    category: 'Primary / Basic',
    description: 'Mathematical puzzles, number patterns, sequences and problem solving.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🧩'
  },
  {
    name: 'Verbal Reasoning',
    category: 'Primary / Basic',
    description: 'Word analogies, antonyms, synonyms, code words and lexical logic.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '💡'
  },
  {
    name: 'Vocational & Technical Aptitude',
    category: 'Primary / Basic',
    description: 'Practical handicraft, simple woodworks, tools identification and domestic skills.',
    applicableGrades: ['Basic 3', 'Basic 4', 'Basic 5', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🔨'
  },
  {
    name: 'Cultural & Creative Arts (CCA)',
    category: 'Primary / Basic',
    description: 'Visual arts, local crafts, traditional music, drama and cultural dance.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🎭'
  },
  {
    name: 'Physical & Health Education (PHE)',
    category: 'Primary / Basic',
    description: 'Athletics, ball games, gymnastics, first aid, nutrition and bodily fitness.',
    applicableGrades: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '⚽'
  },
  {
    name: 'Home Economics',
    category: 'Primary / Basic',
    description: 'Food preparation, kitchen hygiene, sewing, garment care and home management.',
    applicableGrades: ['Basic 3', 'Basic 4', 'Basic 5', 'Primary 3', 'Primary 4', 'Primary 5'],
    icon: '🍳'
  },

  // 4. Junior Secondary School (JSS 1 - JSS 3)
  {
    name: 'Mathematics',
    category: 'Junior Secondary',
    description: 'Algebra, plane geometry, trigonometry, statistics, commercial arithmetic and equations.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '📐'
  },
  {
    name: 'English Studies & Literature',
    category: 'Junior Secondary',
    description: 'Advanced syntax, continuous writing, oral English, prose, poetry and drama analysis.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '📖'
  },
  {
    name: 'Basic Science',
    category: 'Junior Secondary',
    description: 'Ecology, chemical reactions, physical forces, energy conservation and reproduction.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🔬'
  },
  {
    name: 'Basic Technology',
    category: 'Junior Secondary',
    description: 'Technical drawing, wood/metal processing, building construction and electrical systems.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '⚙️'
  },
  {
    name: 'Social Studies',
    category: 'Junior Secondary',
    description: 'Contemporary social issues, national integration, family planning and peace studies.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🌍'
  },
  {
    name: 'Civic Education',
    category: 'Junior Secondary',
    description: 'The Nigerian Constitution, rule of law, human rights, voting and civic duties.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🇳🇬'
  },
  {
    name: 'Christian Religious Studies (CRS)',
    category: 'Junior Secondary',
    description: 'Old & New Testament studies, the early church, moral integrity and Christian living.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '✝️'
  },
  {
    name: 'Agricultural Science',
    category: 'Junior Secondary',
    description: 'Agronomy, livestock management, farm mechanization, pests and agricultural economics.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🌾'
  },
  {
    name: 'Business Studies',
    category: 'Junior Secondary',
    description: 'Commerce, bookkeeping, office practice, keyboarding, marketing and consumer rights.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '💼'
  },
  {
    name: 'Information & Communication Technology (ICT)',
    category: 'Junior Secondary',
    description: 'Computer networking, database fundamentals, web navigation, office productivity suites.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '💻'
  },
  {
    name: 'French Language',
    category: 'Junior Secondary',
    description: 'Intermediate grammar, reading comprehension, dialogue composition and oral proficiency.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🇫🇷'
  },
  {
    name: 'Yoruba Language',
    category: 'Junior Secondary',
    description: 'Giramari, akaye, aroko, litireso alohun ati litireso apileko Yoruba.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🗣️'
  },
  {
    name: 'Home Economics',
    category: 'Junior Secondary',
    description: 'Nutrition, clothing & textiles, child development, consumer education and household crafts.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🧵'
  },
  {
    name: 'Physical & Health Education',
    category: 'Junior Secondary',
    description: 'Rules of sports, community health, physiology, hygiene, recreation and fitness testing.',
    applicableGrades: ['JSS 1', 'JSS 2', 'JSS 3'],
    icon: '🏃'
  },

  // 5. Senior Secondary School (SS 1 - SS 3) - Science
  {
    name: 'General Mathematics',
    category: 'Senior Secondary (Science)',
    description: 'WAEC/NECO syllabus: functions, logarithms, calculus, probability, circle theorems.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)', 'SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '📐'
  },
  {
    name: 'English Language',
    category: 'Senior Secondary (Science)',
    description: 'WAEC/NECO syllabus: Lexis and structure, oral English, essay writing and summary.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)', 'SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '📚'
  },
  {
    name: 'Physics',
    category: 'Senior Secondary (Science)',
    description: 'Mechanics, heat, optics, waves, electricity, magnetism, electronics and atomic physics.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)'],
    icon: '⚡'
  },
  {
    name: 'Chemistry',
    category: 'Senior Secondary (Science)',
    description: 'Periodic table, stoichiometry, organic chemistry, electrolysis, equilibria and practical lab.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)'],
    icon: '🧪'
  },
  {
    name: 'Biology',
    category: 'Senior Secondary (Science)',
    description: 'Cell biology, genetics, evolution, ecology, plant/animal physiology and microscopic analysis.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)'],
    icon: '🧬'
  },
  {
    name: 'Further Mathematics',
    category: 'Senior Secondary (Science)',
    description: 'Advanced calculus, matrices, vectors, statics, dynamics and complex numbers.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)'],
    icon: '♾️'
  },
  {
    name: 'Agricultural Science',
    category: 'Senior Secondary (Science)',
    description: 'Crop pathology, animal nutrition, soil chemistry, farm surveying and agro-processing.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)'],
    icon: '🌾'
  },
  {
    name: 'Technical Drawing',
    category: 'Senior Secondary (Science)',
    description: 'Orthographic projection, isometric views, architectural drafting and computer-aided design.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)'],
    icon: '📏'
  },
  {
    name: 'Civic Education',
    category: 'Senior Secondary (Science)',
    description: 'Compulsory senior secondary curriculum: Human rights, national values and governance.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)', 'SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🇳🇬'
  },
  {
    name: 'Computer Studies / Data Processing',
    category: 'Senior Secondary (Science)',
    description: 'Data management, programming fundamentals, algorithms, system analysis and web tools.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)', 'SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '💻'
  },
  {
    name: 'Economics',
    category: 'Senior Secondary (Science)',
    description: 'Micro & macroeconomics, market structures, public finance, international trade.',
    applicableGrades: ['SS 1 (Science)', 'SS 2 (Science)', 'SS 3 (Science)', 'SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '📊'
  },

  // 6. Senior Secondary - Commercial
  {
    name: 'Financial Accounting',
    category: 'Senior Secondary (Commercial)',
    description: 'Ledgers, trial balance, final accounts, partnerships, company accounts and ratio analysis.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🪙'
  },
  {
    name: 'Commerce',
    category: 'Senior Secondary (Commercial)',
    description: 'Trade, channels of distribution, banking, insurance, transportation and business law.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🚢'
  },
  {
    name: 'Book Keeping',
    category: 'Senior Secondary (Commercial)',
    description: 'Double entry principles, cash books, petty cash, bank reconciliations and invoices.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '📒'
  },
  {
    name: 'Office Practice',
    category: 'Senior Secondary (Commercial)',
    description: 'Office procedures, records management, business correspondence and communication.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🗄️'
  },
  {
    name: 'Marketing',
    category: 'Senior Secondary (Commercial)',
    description: 'Market research, promotion, pricing strategies, branding, e-commerce and retail selling.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🎯'
  },

  // 7. Senior Secondary - Arts / Humanities
  {
    name: 'Literature in English',
    category: 'Senior Secondary (Arts)',
    description: 'African & non-African prose, Shakespearean drama, African poetry and literary criticism.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🎭'
  },
  {
    name: 'Government',
    category: 'Senior Secondary (Arts)',
    description: 'Political theory, arms of government, Nigerian political history and foreign policy.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🏛️'
  },
  {
    name: 'Christian Religious Studies (CRS)',
    category: 'Senior Secondary (Arts)',
    description: 'Advanced thematic biblical analysis, epistles of Paul, social justice and church leadership.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '✝️'
  },
  {
    name: 'History',
    category: 'Senior Secondary (Arts)',
    description: 'Pre-colonial kingdoms of Nigeria, transatlantic trade, colonialism and post-independence.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '📜'
  },
  {
    name: 'Visual Arts',
    category: 'Senior Secondary (Arts)',
    description: 'Drawing, painting, sculpting, textile design, graphics and art appreciation.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🎨'
  },
  {
    name: 'Yoruba Literature & Culture',
    category: 'Senior Secondary (Arts)',
    description: 'Aroko tojinle, kiko ewi, itan awon oba alaye, litireso apileko ati alohun.',
    applicableGrades: ['SS 1 (Commerce and Arts)', 'SS 2 (Commerce and Arts)', 'SS 3 (Commerce and Arts)'],
    icon: '🗣️'
  }
];
