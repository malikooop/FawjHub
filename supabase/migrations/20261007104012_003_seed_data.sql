/*
# FawjHub - Seed Data

Inserts 4 example subjects with sample resources for each.
Uses fixed UUIDs so re-running is idempotent.
*/

-- ============================================
-- SUBJECTS (using fixed UUIDs)
-- ============================================
INSERT INTO subjects (id, name, slug, description, code, semester, color, icon, sort_order)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Algorithms', 'algorithms', 'Fundamental algorithms: sorting, searching, graph algorithms, complexity analysis, and algorithm design techniques.', 'INF301', 1, '#2563eb', 'Binary', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Computer Architecture', 'computer-architecture', 'Digital logic, processor design, memory hierarchy, pipelining, and instruction set architectures.', 'INF302', 1, '#0891b2', 'Cpu', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Statistics', 'statistics', 'Descriptive and inferential statistics, probability distributions, hypothesis testing, and regression analysis.', 'MATH301', 1, '#059669', 'BarChart3', 3),
  ('a0000000-0000-0000-0000-000000000004', 'Object-Oriented Programming', 'oop', 'OOP principles, classes and objects, inheritance, polymorphism, encapsulation, and design patterns in Java.', 'INF303', 2, '#d97706', 'Code', 4),
  ('a0000000-0000-0000-0000-000000000005', 'Operating Systems', 'operating-systems', 'Process management, memory management, file systems, concurrency, and deadlocks.', 'INF304', 2, '#dc2626', 'Monitor', 5),
  ('a0000000-0000-0000-0000-000000000006', 'Databases', 'databases', 'Relational model, SQL, normalization, transactions, indexing, and database design.', 'INF305', 2, '#7c3aed', 'Database', 6),
  ('a0000000-0000-0000-0000-000000000007', 'Mathematics', 'mathematics', 'Linear algebra, discrete mathematics, calculus, and differential equations for computer science.', 'MATH302', 1, '#db2777', 'FunctionSquare', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RESOURCES FOR ALGORITHMS
-- ============================================
INSERT INTO resources (id, title, description, subject_id, resource_type, semester, academic_year, teacher, file_name, file_size, published, is_important, download_count)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Introduction to Algorithm Complexity', 'Chapter 1: Asymptotic notation, Big-O, Big-Omega, Big-Theta. Analysis of time and space complexity.', 'a0000000-0000-0000-0000-000000000001', 'cours', 1, '2024-2025', 'Dr. Benali', 'algo_ch1_complexity.pdf', 2400000, true, true, 142),
  ('b0000000-0000-0000-0000-000000000002', 'Sorting Algorithms', 'Chapter 2: Bubble sort, insertion sort, merge sort, quicksort. Complexity comparison and implementation.', 'a0000000-0000-0000-0000-000000000001', 'cours', 1, '2024-2025', 'Dr. Benali', 'algo_ch2_sorting.pdf', 3100000, true, false, 98),
  ('b0000000-0000-0000-0000-000000000003', 'TD 1: Complexity Analysis Exercises', 'Exercise set on analyzing algorithm complexity. Includes loop analysis and recurrence relations.', 'a0000000-0000-0000-0000-000000000001', 'td', 1, '2024-2025', 'Dr. Benali', 'algo_td1.pdf', 850000, true, false, 67),
  ('b0000000-0000-0000-0000-000000000004', 'TD 1: Solutions', 'Complete solutions for TD 1 with detailed step-by-step explanations.', 'a0000000-0000-0000-0000-000000000001', 'correction', 1, '2024-2025', 'Dr. Benali', 'algo_td1_correction.pdf', 1200000, true, true, 189),
  ('b0000000-0000-0000-0000-000000000005', 'TP 1: Implementing Sorting Algorithms', 'Lab assignment: implement and benchmark bubble sort, merge sort, and quicksort in C.', 'a0000000-0000-0000-0000-000000000001', 'tp', 1, '2024-2025', 'Dr. Benali', 'algo_tp1.pdf', 950000, true, false, 54),
  ('b0000000-0000-0000-0000-000000000006', 'Algorithms Summary - All Chapters', 'Condensed summary covering all course chapters. Useful for exam revision.', 'a0000000-0000-0000-0000-000000000001', 'summary', 1, '2024-2025', 'Dr. Benali', 'algo_summary.pdf', 1800000, true, true, 234),
  ('b0000000-0000-0000-0000-000000000007', 'Final Exam - Algorithms 2024', 'Final examination from the 2023-2024 academic year. Duration: 2 hours.', 'a0000000-0000-0000-0000-000000000001', 'exam', 1, '2023-2024', 'Dr. Benali', 'algo_exam_2024.pdf', 650000, true, true, 312),
  ('b0000000-0000-0000-0000-000000000008', 'Final Exam Solutions 2024', 'Complete corrections for the 2024 final exam.', 'a0000000-0000-0000-0000-000000000001', 'correction', 1, '2023-2024', 'Dr. Benali', 'algo_exam_2024_correction.pdf', 1100000, true, true, 287)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RESOURCES FOR COMPUTER ARCHITECTURE
-- ============================================
INSERT INTO resources (id, title, description, subject_id, resource_type, semester, academic_year, teacher, file_name, file_size, published, is_important, download_count)
VALUES
  ('b0000000-0000-0000-0000-000000000009', 'Digital Logic and Gates', 'Chapter 1: Boolean algebra, logic gates, truth tables, and combinational circuit design.', 'a0000000-0000-0000-0000-000000000002', 'cours', 1, '2024-2025', 'Prof. Cherif', 'arch_ch1_logic.pdf', 2900000, true, true, 112),
  ('b0000000-0000-0000-0000-000000000010', 'Processor Design and Pipelining', 'Chapter 3: CPU architecture, instruction cycle, pipeline hazards and forwarding.', 'a0000000-0000-0000-0000-000000000002', 'cours', 1, '2024-2025', 'Prof. Cherif', 'arch_ch3_cpu.pdf', 3500000, true, false, 76),
  ('b0000000-0000-0000-0000-000000000011', 'TD 2: Boolean Algebra Exercises', 'Exercises on simplifying Boolean expressions and designing combinational circuits.', 'a0000000-0000-0000-0000-000000000002', 'td', 1, '2024-2025', 'Prof. Cherif', 'arch_td2.pdf', 720000, true, false, 45),
  ('b0000000-0000-0000-0000-000000000012', 'TD 2: Solutions', 'Detailed solutions for TD 2 with circuit diagrams.', 'a0000000-0000-0000-0000-000000000002', 'correction', 1, '2024-2025', 'Prof. Cherif', 'arch_td2_correction.pdf', 1400000, true, false, 102),
  ('b0000000-0000-0000-0000-000000000013', 'Architecture Summary', 'Comprehensive summary of all architecture topics for exam preparation.', 'a0000000-0000-0000-0000-000000000002', 'summary', 1, '2024-2025', 'Prof. Cherif', 'arch_summary.pdf', 1600000, true, true, 198),
  ('b0000000-0000-0000-0000-000000000014', 'Midterm Exam 2024', 'Midterm examination covering chapters 1-3.', 'a0000000-0000-0000-0000-000000000002', 'exam', 1, '2023-2024', 'Prof. Cherif', 'arch_midterm_2024.pdf', 580000, true, false, 156)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RESOURCES FOR STATISTICS
-- ============================================
INSERT INTO resources (id, title, description, subject_id, resource_type, semester, academic_year, teacher, file_name, file_size, published, is_important, download_count)
VALUES
  ('b0000000-0000-0000-0000-000000000015', 'Descriptive Statistics', 'Chapter 1: Measures of central tendency, dispersion, and data visualization techniques.', 'a0000000-0000-0000-0000-000000000003', 'cours', 1, '2024-2025', 'Dr. Mansouri', 'stat_ch1_descriptive.pdf', 2600000, true, true, 87),
  ('b0000000-0000-0000-0000-000000000016', 'Probability Distributions', 'Chapter 2: Binomial, Poisson, normal, and exponential distributions with applications.', 'a0000000-0000-0000-0000-000000000003', 'cours', 1, '2024-2025', 'Dr. Mansouri', 'stat_ch2_probability.pdf', 3300000, true, false, 71),
  ('b0000000-0000-0000-0000-000000000017', 'TD 3: Hypothesis Testing', 'Exercises on z-tests, t-tests, and p-value interpretation.', 'a0000000-0000-0000-0000-000000000003', 'td', 1, '2024-2025', 'Dr. Mansouri', 'stat_td3.pdf', 680000, true, false, 56),
  ('b0000000-0000-0000-0000-000000000018', 'TD 3: Solutions', 'Complete solutions for TD 3 with R code examples.', 'a0000000-0000-0000-0000-000000000003', 'correction', 1, '2024-2025', 'Dr. Mansouri', 'stat_td3_correction.pdf', 1300000, true, true, 143),
  ('b0000000-0000-0000-0000-000000000019', 'Statistics Formula Sheet', 'All essential formulas on one page for quick reference during exams.', 'a0000000-0000-0000-0000-000000000003', 'summary', 1, '2024-2025', 'Dr. Mansouri', 'stat_formulas.pdf', 450000, true, true, 267),
  ('b0000000-0000-0000-0000-000000000020', 'Final Exam - Statistics 2024', 'Final exam with probability and hypothesis testing problems.', 'a0000000-0000-0000-0000-000000000003', 'exam', 1, '2023-2024', 'Dr. Mansouri', 'stat_exam_2024.pdf', 620000, true, true, 201),
  ('b0000000-0000-0000-0000-000000000021', 'Final Exam Solutions 2024', 'Full corrections for the statistics final exam.', 'a0000000-0000-0000-0000-000000000003', 'correction', 1, '2023-2024', 'Dr. Mansouri', 'stat_exam_2024_correction.pdf', 1050000, true, false, 178)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RESOURCES FOR OOP
-- ============================================
INSERT INTO resources (id, title, description, subject_id, resource_type, semester, academic_year, teacher, file_name, file_size, published, is_important, download_count)
VALUES
  ('b0000000-0000-0000-0000-000000000022', 'OOP Fundamentals: Classes and Objects', 'Chapter 1: Classes, objects, constructors, encapsulation, and access modifiers in Java.', 'a0000000-0000-0000-0000-000000000004', 'cours', 2, '2024-2025', 'Dr. Khelifi', 'oop_ch1_classes.pdf', 2800000, true, true, 124),
  ('b0000000-0000-0000-0000-000000000023', 'Inheritance and Polymorphism', 'Chapter 2: Inheritance hierarchy, method overriding, abstract classes, and interfaces.', 'a0000000-0000-0000-0000-000000000004', 'cours', 2, '2024-2025', 'Dr. Khelifi', 'oop_ch2_inheritance.pdf', 3200000, true, false, 89),
  ('b0000000-0000-0000-0000-000000000024', 'TD 1: Class Design Exercises', 'Design classes for a library management system. Practice encapsulation and inheritance.', 'a0000000-0000-0000-0000-000000000004', 'td', 2, '2024-2025', 'Dr. Khelifi', 'oop_td1.pdf', 780000, true, false, 62),
  ('b0000000-0000-0000-0000-000000000025', 'TD 1: Solutions', 'Complete Java implementations for the library system exercises.', 'a0000000-0000-0000-0000-000000000004', 'correction', 2, '2024-2025', 'Dr. Khelifi', 'oop_td1_correction.pdf', 1500000, true, true, 167),
  ('b0000000-0000-0000-0000-000000000026', 'TP 2: Building a Shape Hierarchy', 'Lab: implement an abstract Shape class with Circle, Rectangle, and Triangle subclasses.', 'a0000000-0000-0000-0000-000000000004', 'tp', 2, '2024-2025', 'Dr. Khelifi', 'oop_tp2.pdf', 890000, true, false, 48),
  ('b0000000-0000-0000-0000-000000000027', 'OOP Design Patterns Summary', 'Summary of key design patterns: Singleton, Factory, Observer, and Strategy.', 'a0000000-0000-0000-0000-000000000004', 'summary', 2, '2024-2025', 'Dr. Khelifi', 'oop_patterns.pdf', 1200000, true, true, 205),
  ('b0000000-0000-0000-0000-000000000028', 'Final Exam - OOP 2024', 'Final exam covering all OOP concepts with Java code questions.', 'a0000000-0000-0000-0000-000000000004', 'exam', 2, '2023-2024', 'Dr. Khelifi', 'oop_exam_2024.pdf', 710000, true, true, 243),
  ('b0000000-0000-0000-0000-000000000029', 'Final Exam Solutions 2024', 'Full Java code solutions for the OOP final exam.', 'a0000000-0000-0000-0000-000000000004', 'correction', 2, '2023-2024', 'Dr. Khelifi', 'oop_exam_2024_correction.pdf', 1700000, true, true, 221)
ON CONFLICT (id) DO NOTHING;
