/**
 * Seeds the AI-Based Study Coach System with the academic structure of the
 * School of Computing, Informatics and Media Studies at Mount Kigali
 * University, plus demo accounts and sample lecture notes.
 *
 * Run with:  npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunk(text: string, size = 900, overlap = 150): string[] {
  const clean = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    if (end < clean.length) {
      const window = clean.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
      );
      if (breakAt > size * 0.45) end = start + breakAt + 1;
    }

    const piece = clean.slice(start, end).trim();
    if (piece.length > 40) chunks.push(piece);

    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Sample lecture notes
// ---------------------------------------------------------------------------

const NOTES_NORMALISATION = `
Normalisation is the process of organising the attributes and relations of a relational database so that data redundancy is reduced and data integrity is protected. A database that has not been normalised usually stores the same fact in several places, which creates three problems: insertion anomalies, update anomalies and deletion anomalies.

A functional dependency is a relationship between two sets of attributes. We say that attribute B is functionally dependent on attribute A if, for every value of A, there is exactly one value of B. We write this as A -> B. For example, in a student table, StudentID -> FullName means that each student number is associated with exactly one name. Functional dependencies are the foundation of every normal form, so a designer must first identify the candidate keys of each relation.

First Normal Form (1NF) requires that every attribute holds a single atomic value. A table that stores several telephone numbers in one cell, separated by commas, is not in 1NF because the cell contains a repeating group. To convert it, the repeating values are moved into a separate table with one row per value, linked back to the parent row by a foreign key.

Second Normal Form (2NF) requires that the relation is already in 1NF and that every non-key attribute depends on the whole primary key, not on part of it. This rule only matters when the primary key is composite. Consider an enrolment table with the composite key (StudentID, CourseID) that also stores CourseTitle. CourseTitle depends only on CourseID, so it is a partial dependency. The fix is to move CourseTitle into a Course table.

Third Normal Form (3NF) requires that the relation is in 2NF and that no non-key attribute depends on another non-key attribute. This is called a transitive dependency. In a table with (StudentID, ProgrammeCode, ProgrammeName), ProgrammeName depends on ProgrammeCode, and ProgrammeCode depends on StudentID. ProgrammeName is therefore transitively dependent on the key. The fix is to keep ProgrammeCode in the student table and store ProgrammeName in a Programme table.

Boyce-Codd Normal Form (BCNF) is a stricter version of 3NF. A relation is in BCNF when, for every non-trivial functional dependency X -> Y, X is a superkey. BCNF matters when a table has more than one candidate key and one of them determines part of another.

Normalisation is not always desirable in every situation. Denormalisation deliberately reintroduces redundancy to reduce the number of joins required by read-heavy reports. A common example is storing a calculated total on an order table. The trade-off is that the application must now keep the duplicated value consistent.

A worked example. A university library records loans in one table: LoanID, StudentID, StudentName, BookISBN, BookTitle, AuthorName, LoanDate. StudentName depends on StudentID, and BookTitle and AuthorName depend on BookISBN, so the table violates 3NF in two places. The normalised design uses four tables: Student, Book, Author and Loan. The Loan table then stores only LoanID, StudentID, BookISBN and LoanDate.

Common examination mistakes. Students often claim that a table is in 2NF without checking whether the primary key is composite; 2NF only becomes relevant when the key has more than one attribute. Another frequent error is assuming that normalisation always improves performance. In practice, each normal form removes redundancy but adds joins, and the correct choice depends on how the data is used.
`;

const NOTES_RELATIONAL_SQL = `
The relational model represents data as a set of relations. A relation is a table with a fixed set of named columns (attributes) and any number of rows (tuples). Each row in a relation must be unique, and the order of rows and columns carries no meaning. This differs from a spreadsheet, where position is often used to convey structure.

Keys. A superkey is any set of attributes that uniquely identifies a row. A candidate key is a minimal superkey, meaning no attribute can be removed without losing uniqueness. The primary key is the candidate key chosen by the designer, and it may never contain a null value. A foreign key is an attribute in one relation that refers to the primary key of another relation; it enforces referential integrity.

Integrity constraints. Entity integrity states that a primary key cannot be null. Referential integrity states that a foreign key value must either match an existing primary key value or be entirely null. Domain integrity restricts each attribute to the values allowed by its data type and any check constraint. Together these constraints allow the database engine, rather than the application, to guarantee consistency.

The SELECT statement. The basic form is SELECT columns FROM table WHERE condition. Logical processing order is important for examination questions: the database evaluates FROM, then WHERE, then GROUP BY, then HAVING, then SELECT, and finally ORDER BY. Because SELECT is evaluated after WHERE, a column alias defined in the SELECT list cannot normally be used inside a WHERE clause.

Joins. An inner join returns only rows that satisfy the join condition in both tables. A left outer join returns every row from the left table, filling the right-hand columns with nulls where no match exists. A full outer join returns unmatched rows from both sides. A cross join produces the Cartesian product and is rarely useful on its own. A self join joins a table to itself and is used for hierarchies, such as finding every employee and their manager.

Aggregation. COUNT, SUM, AVG, MIN and MAX collapse many rows into one value. Any column that appears in the SELECT list without an aggregate function must also appear in the GROUP BY clause, otherwise the query is ambiguous. HAVING filters groups after aggregation, while WHERE filters individual rows before aggregation.

Null semantics. Null represents an unknown value, not zero and not an empty string. Comparisons with null using = or <> produce unknown rather than true, so IS NULL and IS NOT NULL must be used instead. Aggregate functions ignore nulls, which is why AVG divides by the count of non-null values rather than the total row count. This behaviour surprises many students in practical exercises.

Views and indexes. A view is a stored query that behaves like a table; it can simplify complex joins and restrict which columns a user is allowed to see. An index is a separate structure that speeds up lookups on a column at the cost of extra storage and slower inserts and updates. Indexing every column is therefore a mistake, not a best practice.
`;

const NOTES_DATA_STRUCTURES = `
An abstract data type (ADT) is a description of a collection of values together with the operations that may be performed on them, defined without reference to any implementation. A stack and a queue are two of the most important ADTs because they describe the two natural ways of ordering work: last in, first out, and first in, first out.

A stack is a last-in-first-out structure. The two fundamental operations are push, which adds an element to the top, and pop, which removes and returns the top element. A peek operation returns the top element without removing it. All three operations run in constant time, O(1), when the stack is implemented with an array and a top index. A pop on an empty stack causes an underflow, and a push on a full fixed-size array causes an overflow, so both conditions must be checked.

Stacks appear whenever a problem requires reversing order or remembering where to return to. The call stack of a programming language stores the return address and local variables of each active function call, which is why infinite recursion produces a stack overflow. Expression evaluation uses two stacks to convert infix notation to postfix and then to evaluate it. Undo facilities in editors, bracket matching in compilers and depth-first search all rely on a stack.

A queue is a first-in-first-out structure. Enqueue adds an element at the rear and dequeue removes an element from the front. In a naive array implementation, dequeue requires shifting every remaining element, which costs O(n). A circular queue solves this by treating the array as a ring: the rear index wraps around to zero when it reaches the end. A queue implemented this way keeps both operations at O(1). Queues model any situation where fairness matters, including printer spoolers, task scheduling in an operating system, and breadth-first search.

A linked list stores each element in a node that also holds a reference to the next node. Insertion and deletion at a known position are O(1) because no elements need to be shifted, but reaching that position requires O(n) traversal. A singly linked list allows movement in one direction only; a doubly linked list stores both next and previous references, which makes deletion of a known node easier but uses more memory. A linked list has no fixed capacity, unlike an array, but each node carries pointer overhead and the elements are scattered in memory, which is slower for modern processors than a contiguous array.

Comparison. Accessing an element by index is O(1) for an array and O(n) for a linked list. Inserting at the front is O(n) for an array because everything must shift, but O(1) for a linked list. Choosing between the two is therefore a question of which operations dominate the workload, not of which structure is generally better.

A deque, or double-ended queue, allows insertion and removal at both ends and can be used to implement both a stack and a queue. A priority queue returns the element with the highest priority rather than the oldest, and is normally implemented with a binary heap so that insertion and removal both cost O(log n).
`;

const NOTES_OSI = `
The OSI reference model divides network communication into seven layers, each with a clearly defined responsibility. The purpose of layering is separation of concerns: a change in one layer should not require changes in another, as long as the interface between them is preserved.

Layer 1, the physical layer, transmits raw bits over a medium. It defines voltage levels, cable specifications, pin layouts and data rates. Hubs and repeaters operate at this layer.

Layer 2, the data link layer, turns the raw transmission facility into a reliable link between two directly connected nodes. It frames bits into frames, adds physical addressing in the form of MAC addresses, and detects errors using a checksum. Ethernet switches operate here. The layer is often divided into the logical link control sublayer and the media access control sublayer.

Layer 3, the network layer, is responsible for logical addressing and routing between networks. IP addresses belong to this layer, and routers use routing tables to decide the next hop for each packet. The network layer does not guarantee delivery; reliability, when required, is handled by higher layers.

Layer 4, the transport layer, provides end-to-end communication between processes rather than hosts. It uses port numbers to identify the correct application, segments data, and may provide reliability. TCP offers connection-oriented, reliable, ordered delivery with flow control and congestion control. UDP offers a connectionless, unreliable datagram service with much lower overhead, which suits streaming and DNS queries.

Layer 5, the session layer, establishes, manages and terminates sessions between applications. It provides dialogue control, such as deciding whose turn it is to transmit, and checkpointing so that a long transfer can resume after a failure.

Layer 6, the presentation layer, is concerned with the syntax of the data rather than its meaning. It handles character encoding, data compression and encryption. Converting between ASCII and Unicode, or compressing an image before transmission, are presentation-layer tasks.

Layer 7, the application layer, is the layer closest to the user. It provides the network services that applications actually use, including HTTP for the web, SMTP for mail, FTP for file transfer and DNS for name resolution. Note that the application layer in OSI is not the same as a user application program.

Encapsulation. As data moves down the stack, each layer adds its own header. The transport layer creates a segment, the network layer wraps it in a packet with source and destination IP addresses, and the data link layer wraps that in a frame with MAC addresses. The receiving host reverses the process, and each layer removes and interprets only its own header. This is why the same payload can travel over Ethernet, Wi-Fi and fibre without change.

Comparison with TCP/IP. The TCP/IP model uses four layers: network access, internet, transport and application. The OSI session and presentation layers are absorbed into the TCP/IP application layer. OSI remains valuable as a teaching and troubleshooting tool because it forces the engineer to ask which layer is failing: a cable problem is layer 1, a wrong IP address is layer 3, and a blocked port is layer 4.
`;

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function main() {
  console.log("Clearing existing data…");

  await prisma.quizAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.studyActivity.deleteMany();
  await prisma.studyPlan.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.systemEvent.deleteMany();
  await prisma.documentChunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.programme.deleteMany();

  console.log("Creating programmes…");

  const bbict = await prisma.programme.create({
    data: {
      code: "BBICT",
      name: "Bachelor of Business Information and Communication Technology",
      description:
        "A programme combining business processes with information and communication technology.",
      durationYears: 3,
    },
  });

  const cs = await prisma.programme.create({
    data: {
      code: "BSC-CS",
      name: "Bachelor of Science in Computer Science",
      description:
        "A programme covering programming, algorithms, systems, networks and software engineering.",
      durationYears: 3,
    },
  });

  console.log("Creating courses…");

  const courseSeeds = [
    {
      code: "BBICT1101",
      title: "Fundamentals of Information Technology",
      programmeId: bbict.id,
      yearOfStudy: 1,
      semester: 1,
      credits: 10,
      description:
        "Computer hardware, software, number systems and the role of IT in organisations.",
    },
    {
      code: "BBICT1202",
      title: "Business Information Systems",
      programmeId: bbict.id,
      yearOfStudy: 1,
      semester: 2,
      credits: 10,
      description:
        "Information systems in business, transaction processing and decision support.",
    },
    {
      code: "BBICT2103",
      title: "Database Management Systems",
      programmeId: bbict.id,
      yearOfStudy: 2,
      semester: 1,
      credits: 15,
      description:
        "Relational modelling, normalisation, SQL, transactions and database administration.",
    },
    {
      code: "BBICT2204",
      title: "Web Technologies",
      programmeId: bbict.id,
      yearOfStudy: 2,
      semester: 2,
      credits: 15,
      description:
        "HTML, CSS, JavaScript, server-side scripting and web application architecture.",
    },
    {
      code: "BBICT3105",
      title: "Systems Analysis and Design",
      programmeId: bbict.id,
      yearOfStudy: 3,
      semester: 1,
      credits: 15,
      description:
        "Requirements engineering, process modelling, UML and system development life cycles.",
    },
    {
      code: "CSC1101",
      title: "Programming Fundamentals",
      programmeId: cs.id,
      yearOfStudy: 1,
      semester: 1,
      credits: 15,
      description:
        "Variables, control structures, functions, arrays and problem decomposition.",
    },
    {
      code: "CSC1202",
      title: "Object-Oriented Programming",
      programmeId: cs.id,
      yearOfStudy: 1,
      semester: 2,
      credits: 15,
      description:
        "Classes, inheritance, polymorphism, encapsulation and design principles.",
    },
    {
      code: "CSC2103",
      title: "Data Structures and Algorithms",
      programmeId: cs.id,
      yearOfStudy: 2,
      semester: 1,
      credits: 15,
      description:
        "Lists, stacks, queues, trees, graphs, sorting, searching and complexity analysis.",
    },
    {
      code: "CSC2204",
      title: "Computer Networks",
      programmeId: cs.id,
      yearOfStudy: 2,
      semester: 2,
      credits: 15,
      description:
        "Network models, addressing, routing, transport protocols and network security.",
    },
    {
      code: "CSC3105",
      title: "Operating Systems",
      programmeId: cs.id,
      yearOfStudy: 3,
      semester: 1,
      credits: 15,
      description:
        "Processes, scheduling, memory management, file systems and concurrency.",
    },
  ];

  const courses: Record<string, { id: string; programmeId: string }> = {};

  for (const seed of courseSeeds) {
    const course = await prisma.course.create({ data: seed });
    courses[seed.code] = { id: course.id, programmeId: course.programmeId };
  }

  console.log("Creating users…");

  const [adminHash, lecturerHash, studentHash] = await Promise.all([
    bcrypt.hash("Admin@123", 10),
    bcrypt.hash("Lecturer@123", 10),
    bcrypt.hash("Student@123", 10),
  ]);

  const admin = await prisma.user.create({
    data: {
      fullName: "System Administrator",
      email: "admin@mku.ac.rw",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const lecturerB = await prisma.user.create({
    data: {
      fullName: "Emmanuel Habimana",
      email: "lecturer@mku.ac.rw",
      passwordHash: lecturerHash,
      role: "LECTURER",
      programmeId: bbict.id,
    },
  });

  const lecturerC = await prisma.user.create({
    data: {
      fullName: "Claudine Mukamana",
      email: "claudine@mku.ac.rw",
      passwordHash: lecturerHash,
      role: "LECTURER",
      programmeId: cs.id,
    },
  });

  const alice = await prisma.user.create({
    data: {
      fullName: "Alice Uwase",
      email: "student@mku.ac.rw",
      passwordHash: studentHash,
      role: "STUDENT",
      regNumber: "BBICT/2024/0142",
      programmeId: bbict.id,
      yearOfStudy: 2,
    },
  });

  const jean = await prisma.user.create({
    data: {
      fullName: "Jean Bosco Nkurunziza",
      email: "jean@mku.ac.rw",
      passwordHash: studentHash,
      role: "STUDENT",
      regNumber: "BSC-CS/2024/0087",
      programmeId: cs.id,
      yearOfStudy: 2,
    },
  });

  // Assign lecturers to their courses.
  await prisma.course.updateMany({
    where: { code: { in: ["BBICT2103", "BBICT3105", "BBICT2204"] } },
    data: { lecturerId: lecturerB.id },
  });

  await prisma.course.updateMany({
    where: { code: { in: ["CSC2103", "CSC2204", "CSC3105"] } },
    data: { lecturerId: lecturerC.id },
  });

  console.log("Enrolling students…");

  const aliceCourses = await prisma.course.findMany({
    where: { programmeId: bbict.id, yearOfStudy: { lte: 2 } },
    select: { id: true },
  });

  const jeanCourses = await prisma.course.findMany({
    where: { programmeId: cs.id, yearOfStudy: { lte: 2 } },
    select: { id: true },
  });

  await prisma.enrollment.createMany({
    data: [
      ...aliceCourses.map((course) => ({
        studentId: alice.id,
        courseId: course.id,
      })),
      ...jeanCourses.map((course) => ({
        studentId: jean.id,
        courseId: course.id,
      })),
    ],
  });

  console.log("Creating study materials…");

  const materialSeeds = [
    {
      title: "Week 5 — Normalisation",
      description:
        "Functional dependencies, 1NF to BCNF, worked examples and common exam mistakes.",
      courseCode: "BBICT2103",
      uploaderId: lecturerB.id,
      fileName: "bbict2103-week5-normalisation.txt",
      text: NOTES_NORMALISATION,
      pages: 6,
    },
    {
      title: "Week 3 — The Relational Model and SQL",
      description:
        "Keys, integrity constraints, joins, aggregation and null semantics.",
      courseCode: "BBICT2103",
      uploaderId: lecturerB.id,
      fileName: "bbict2103-week3-relational-sql.txt",
      text: NOTES_RELATIONAL_SQL,
      pages: 7,
    },
    {
      title: "Stacks, Queues and Linked Lists",
      description:
        "Abstract data types, LIFO and FIFO behaviour, circular queues and complexity.",
      courseCode: "CSC2103",
      uploaderId: lecturerC.id,
      fileName: "csc2103-stacks-queues-lists.txt",
      text: NOTES_DATA_STRUCTURES,
      pages: 8,
    },
    {
      title: "The OSI Reference Model",
      description:
        "All seven layers, encapsulation, and how OSI compares with TCP/IP.",
      courseCode: "CSC2204",
      uploaderId: lecturerC.id,
      fileName: "csc2204-osi-model.txt",
      text: NOTES_OSI,
      pages: 5,
    },
  ];

  const documentIds: Record<string, string> = {};

  for (const material of materialSeeds) {
    const pieces = chunk(material.text);

    const created = await prisma.document.create({
      data: {
        title: material.title,
        description: material.description,
        courseId: courses[material.courseCode].id,
        uploadedById: material.uploaderId,
        fileName: material.fileName,
        fileType: "text/plain",
        fileSize: Buffer.byteLength(material.text, "utf8"),
        pageCount: material.pages,
        charCount: material.text.length,
        status: "READY",
        chunks: {
          create: pieces.map((content, index) => ({
            chunkIndex: index,
            content,
            embedding: null,
          })),
        },
      },
    });

    documentIds[material.title] = created.id;
  }

  // -------------------------------------------------------------------------
  // Quizzes
  // -------------------------------------------------------------------------

  console.log("Creating quizzes…");

  type SeedQuestion = {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    topic: string;
  };

  const normalisationQuestions: SeedQuestion[] = [
    {
      prompt: "What does First Normal Form (1NF) require of a relation?",
      options: [
        "Every attribute holds a single atomic value",
        "Every non-key attribute depends on the whole primary key",
        "No non-key attribute depends on another non-key attribute",
        "Every determinant is a candidate key",
      ],
      correctIndex: 0,
      explanation:
        "1NF forbids repeating groups. A cell holding several values, such as three phone numbers separated by commas, is not atomic and must be moved into a separate table.",
      topic: "First Normal Form",
    },
    {
      prompt:
        "An enrolment table stores StudentID, CourseID and CourseTitle, with a composite primary key of (StudentID, CourseID). Which normal form does CourseTitle violate?",
      options: ["1NF", "2NF", "3NF", "BCNF"],
      correctIndex: 1,
      explanation:
        "CourseTitle depends only on CourseID, which is part of the composite key. That is a partial dependency, and 2NF requires every non-key attribute to depend on the whole key.",
      topic: "Second Normal Form",
    },
    {
      prompt:
        "In a table holding (StudentID, ProgrammeCode, ProgrammeName), ProgrammeName depends on ProgrammeCode and ProgrammeCode depends on StudentID. What is this pattern called?",
      options: [
        "Partial dependency",
        "Transitive dependency",
        "Multivalued dependency",
        "Join dependency",
      ],
      correctIndex: 1,
      explanation:
        "A non-key attribute depending on another non-key attribute is a transitive dependency, which 3NF removes by moving ProgrammeName into its own Programme table.",
      topic: "Third Normal Form",
    },
    {
      prompt:
        "A relation is in Boyce-Codd Normal Form when, for every non-trivial functional dependency X → Y:",
      options: [
        "X is a superkey",
        "Y is a superkey",
        "X contains no null values",
        "Y is functionally dependent on a third attribute",
      ],
      correctIndex: 0,
      explanation:
        "BCNF tightens 3NF by requiring the left-hand side of every non-trivial dependency to be a superkey, which matters when a table has more than one candidate key.",
      topic: "Boyce-Codd Normal Form",
    },
    {
      prompt:
        "Why might a database designer deliberately denormalise a schema?",
      options: [
        "To reduce the number of joins required by read-heavy queries",
        "To remove all redundancy from the database",
        "To eliminate the need for foreign keys",
        "To make the schema satisfy 1NF",
      ],
      correctIndex: 0,
      explanation:
        "Denormalisation reintroduces controlled redundancy to avoid expensive joins in reporting queries. The cost is that the application must keep the duplicated values consistent.",
      topic: "Denormalisation",
    },
  ];

  const sqlQuestions: SeedQuestion[] = [
    {
      prompt:
        "Which integrity rule states that a primary key can never contain a null value?",
      options: [
        "Entity integrity",
        "Referential integrity",
        "Domain integrity",
        "User-defined integrity",
      ],
      correctIndex: 0,
      explanation:
        "Entity integrity guarantees that every row is uniquely identifiable, which fails if the primary key can be null. Referential integrity concerns foreign keys.",
      topic: "Integrity constraints",
    },
    {
      prompt:
        "Which join returns every row from the left table, even when no matching row exists on the right?",
      options: ["INNER JOIN", "CROSS JOIN", "LEFT OUTER JOIN", "SELF JOIN"],
      correctIndex: 2,
      explanation:
        "A left outer join keeps all left-hand rows and fills the right-hand columns with nulls where there is no match.",
      topic: "SQL joins",
    },
    {
      prompt: "Which clause filters groups after aggregation has taken place?",
      options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
      correctIndex: 1,
      explanation:
        "WHERE filters individual rows before grouping; HAVING filters the aggregated groups afterwards, which is why it can reference aggregate functions.",
      topic: "SQL aggregation",
    },
    {
      prompt: "How does the AVG() aggregate function treat NULL values?",
      options: [
        "It treats them as zero",
        "It returns NULL for the whole column",
        "It fails the query",
        "It ignores them",
      ],
      correctIndex: 3,
      explanation:
        "Aggregate functions skip nulls, so AVG divides the sum of non-null values by the count of non-null values, not by the total row count.",
      topic: "Null handling",
    },
  ];

  const stackQuestions: SeedQuestion[] = [
    {
      prompt: "Which data structure returns the most recently added element first?",
      options: ["Queue", "Stack", "Deque", "Priority queue"],
      correctIndex: 1,
      explanation:
        "A stack is last-in-first-out: push adds to the top and pop removes from the top, so the newest element leaves first.",
      topic: "Stacks",
    },
    {
      prompt:
        "What is the time complexity of push on a stack implemented with an array and a top index?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      correctIndex: 0,
      explanation:
        "Writing to the next free slot and incrementing the top index takes constant time, regardless of how many elements are already stored.",
      topic: "Stacks",
    },
    {
      prompt:
        "Why is a circular queue preferred over a naive array queue?",
      options: [
        "It allows elements to be searched faster",
        "It removes the need for a front pointer",
        "It avoids shifting every remaining element on dequeue",
        "It automatically sorts the elements",
      ],
      correctIndex: 2,
      explanation:
        "In a naive array queue, dequeue must shift every remaining element, which is O(n). Wrapping the rear index around the array keeps dequeue at O(1).",
      topic: "Queues",
    },
    {
      prompt:
        "Which operation costs O(n) on a singly linked list but O(1) on an array?",
      options: [
        "Inserting at the front",
        "Removing the first element",
        "Accessing an element by index",
        "Checking whether the structure is empty",
      ],
      correctIndex: 2,
      explanation:
        "An array computes an element address directly, while a linked list must traverse from the head, so indexed access is O(n) for a list.",
      topic: "Linked lists",
    },
  ];

  const normalisationQuiz = await prisma.quiz.create({
    data: {
      courseId: courses["BBICT2103"].id,
      documentId: documentIds["Week 5 — Normalisation"],
      createdById: lecturerB.id,
      title: "Normalisation checkpoint",
      description: "5 questions · from Week 5 — Normalisation",
      difficulty: "MEDIUM",
      questions: {
        create: normalisationQuestions.map((question, index) => ({
          prompt: question.prompt,
          options: JSON.stringify(question.options),
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          topic: question.topic,
          order: index,
        })),
      },
    },
  });

  const sqlQuiz = await prisma.quiz.create({
    data: {
      courseId: courses["BBICT2103"].id,
      documentId: documentIds["Week 3 — The Relational Model and SQL"],
      createdById: lecturerB.id,
      title: "SQL and the relational model",
      description: "4 questions · from Week 3 — The Relational Model and SQL",
      difficulty: "EASY",
      questions: {
        create: sqlQuestions.map((question, index) => ({
          prompt: question.prompt,
          options: JSON.stringify(question.options),
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          topic: question.topic,
          order: index,
        })),
      },
    },
  });

  const stackQuiz = await prisma.quiz.create({
    data: {
      courseId: courses["CSC2103"].id,
      documentId: documentIds["Stacks, Queues and Linked Lists"],
      createdById: lecturerC.id,
      title: "Stacks and queues checkpoint",
      description: "4 questions · from Stacks, Queues and Linked Lists",
      difficulty: "MEDIUM",
      questions: {
        create: stackQuestions.map((question, index) => ({
          prompt: question.prompt,
          options: JSON.stringify(question.options),
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          topic: question.topic,
          order: index,
        })),
      },
    },
  });

  // -------------------------------------------------------------------------
  // Quiz attempts (gives the progress charts a real history)
  // -------------------------------------------------------------------------

  console.log("Creating quiz attempts…");

  function daysAgo(days: number, hour = 19) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, 15, 0, 0);
    return date;
  }

  function dueIn(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(23, 59, 0, 0);
    return date;
  }

  await prisma.quizAttempt.create({
    data: {
      quizId: normalisationQuiz.id,
      studentId: alice.id,
      score: 2,
      total: 5,
      answers: JSON.stringify([0, 1, 0, 3, 2]),
      startedAt: daysAgo(5),
      completedAt: daysAgo(5),
    },
  });

  await prisma.quizAttempt.create({
    data: {
      quizId: sqlQuiz.id,
      studentId: alice.id,
      score: 3,
      total: 4,
      answers: JSON.stringify([0, 2, 1, 2]),
      startedAt: daysAgo(3),
      completedAt: daysAgo(3),
    },
  });

  await prisma.quizAttempt.create({
    data: {
      quizId: normalisationQuiz.id,
      studentId: alice.id,
      score: 4,
      total: 5,
      answers: JSON.stringify([0, 1, 1, 0, 2]),
      startedAt: daysAgo(1),
      completedAt: daysAgo(1),
    },
  });

  await prisma.quizAttempt.create({
    data: {
      quizId: stackQuiz.id,
      studentId: jean.id,
      score: 3,
      total: 4,
      answers: JSON.stringify([1, 0, 2, 1]),
      startedAt: daysAgo(2),
      completedAt: daysAgo(2),
    },
  });

  // -------------------------------------------------------------------------
  // Recommendations and a study plan for the demo student
  // -------------------------------------------------------------------------

  console.log("Creating recommendations and study plan…");

  await prisma.recommendation.createMany({
    data: [
      {
        studentId: alice.id,
        courseId: courses["BBICT2103"].id,
        topic: "Denormalisation",
        reason:
          'You missed 2 questions on "Denormalisation" in the quiz "Normalisation checkpoint". Revise this topic and try again.',
        priority: 2,
        status: "NEW",
      },
      {
        studentId: alice.id,
        courseId: courses["BBICT2103"].id,
        topic: "Null handling",
        reason:
          'You missed 1 question on "Null handling" in the quiz "SQL and the relational model". Revise this topic and try again.',
        priority: 1,
        status: "NEW",
      },
    ],
  });

  const planStart = daysAgo(4);
  const planEnd = new Date();
  planEnd.setDate(planEnd.getDate() + 7);

  await prisma.studyPlan.create({
    data: {
      studentId: alice.id,
      courseId: courses["BBICT2103"].id,
      title: "Database exam revision",
      goal: "Reach 90% on the normalisation checkpoint",
      startDate: planStart,
      endDate: planEnd,
      activities: {
        create: [
          {
            title: "Revise: Third Normal Form",
            scheduledFor: daysAgo(4, 18),
            durationMinutes: 60,
            status: "DONE",
            completedAt: daysAgo(4, 19),
            courseId: courses["BBICT2103"].id,
          },
          {
            title: "Revise: Boyce-Codd Normal Form",
            scheduledFor: daysAgo(2, 18),
            durationMinutes: 45,
            status: "DONE",
            completedAt: daysAgo(2, 19),
            courseId: courses["BBICT2103"].id,
          },
          {
            title: "Revise: Denormalisation",
            scheduledFor: daysAgo(0, 18),
            durationMinutes: 60,
            status: "PENDING",
            courseId: courses["BBICT2103"].id,
          },
          {
            title: "Practice: SQL joins",
            scheduledFor: daysAgo(-2, 18),
            durationMinutes: 90,
            status: "PENDING",
            courseId: courses["BBICT2103"].id,
          },
          {
            title: "Revise: Null handling",
            scheduledFor: daysAgo(-4, 18),
            durationMinutes: 45,
            status: "PENDING",
            courseId: courses["BBICT2103"].id,
          },
          {
            title: "Full practice quiz",
            scheduledFor: daysAgo(-6, 18),
            durationMinutes: 60,
            status: "PENDING",
            courseId: courses["BBICT2103"].id,
          },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // Deadlines
  // -------------------------------------------------------------------------

  console.log("Creating deadlines…");

  await prisma.deadline.createMany({
    data: [
      {
        studentId: alice.id,
        courseId: courses["BBICT2103"].id,
        title: "Normalisation worksheet",
        type: "ASSIGNMENT",
        dueDate: dueIn(-2),
        notes: "Questions 1–8 from the tutorial sheet",
        status: "OPEN",
      },
      {
        studentId: alice.id,
        courseId: courses["BBICT2103"].id,
        title: "Database assignment 2",
        type: "ASSIGNMENT",
        dueDate: dueIn(3),
        notes: "Submit the ER diagram and the SQL script",
        status: "OPEN",
      },
      {
        studentId: alice.id,
        courseId: courses["BBICT2103"].id,
        title: "SQL practical test",
        type: "TEST",
        dueDate: dueIn(8),
        notes: "Lab 3 — joins, aggregation and subqueries",
        status: "OPEN",
      },
      {
        studentId: alice.id,
        courseId: courses["BBICT2204"].id,
        title: "Web project presentation",
        type: "OTHER",
        dueDate: dueIn(14),
        status: "OPEN",
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Supplementary resources
  // -------------------------------------------------------------------------

  console.log("Creating resources…");

  await prisma.resource.createMany({
    data: [
      {
        courseId: courses["BBICT2103"].id,
        title: "Khan Academy — Database Normalisation",
        url: "https://www.khanacademy.org/computing/computer-science/sql/relational-queries-in-sql/v/normalization",
        kind: "VIDEO",
        description: "12-minute video that walks through 1NF, 2NF and 3NF with examples.",
        createdById: lecturerB.id,
      },
      {
        courseId: courses["BBICT2103"].id,
        title: "W3Schools SQL Tutorial",
        url: "https://www.w3schools.com/sql/",
        kind: "LINK",
        description: "Interactive exercises for SELECT, JOIN, GROUP BY and subqueries.",
        createdById: lecturerB.id,
      },
      {
        courseId: courses["CSC2103"].id,
        title: "GeeksforGeeks — OSI Model",
        url: "https://www.geeksforgeeks.org/osi-model-layers/",
        kind: "ARTICLE",
        description: "Detailed article with diagrams for each of the seven layers.",
        createdById: lecturerC.id,
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Audit trail and last sign-in times
  // -------------------------------------------------------------------------

  console.log("Creating system events…");

  await prisma.user.updateMany({ data: { lastLoginAt: daysAgo(0, 9) } });

  await prisma.systemEvent.createMany({
    data: [
      {
        level: "INFO",
        category: "ADMIN",
        message: "Created course",
        detail: "BBICT2204 — Web Technologies",
        userId: admin.id,
        createdAt: daysAgo(5, 10),
      },
      {
        level: "INFO",
        category: "ADMIN",
        message: "Created programme",
        detail: "BSC-CS — Bachelor of Science in Computer Science",
        userId: admin.id,
        createdAt: daysAgo(5, 10),
      },
      {
        level: "ERROR",
        category: "UPLOAD",
        message: "PDF text extraction failed",
        detail:
          "scanned-handout.pdf (application/pdf, 2411520 bytes): no text layer found",
        userId: lecturerB.id,
        createdAt: daysAgo(2, 14),
      },
      {
        level: "WARN",
        category: "AI",
        message: "Quiz generation fell back to offline mode",
        detail: "This model is currently experiencing high demand. Spikes in demand are usually temporary.",
        userId: alice.id,
        createdAt: daysAgo(1, 20),
      },
      {
        level: "WARN",
        category: "AUTH",
        message: "Failed sign-in attempt",
        detail: "Email: unknown@mku.ac.rw",
        createdAt: daysAgo(0, 8),
      },
      {
        level: "INFO",
        category: "AUTH",
        message: "Signed in",
        detail: "Role: STUDENT",
        userId: alice.id,
        createdAt: daysAgo(0, 9),
      },
    ],
  });

  const counts = {
    programmes: await prisma.programme.count(),
    courses: await prisma.course.count(),
    users: await prisma.user.count(),
    enrollments: await prisma.enrollment.count(),
    documents: await prisma.document.count(),
    chunks: await prisma.documentChunk.count(),
    quizzes: await prisma.quiz.count(),
    questions: await prisma.question.count(),
    attempts: await prisma.quizAttempt.count(),
    plans: await prisma.studyPlan.count(),
    recommendations: await prisma.recommendation.count(),
    deadlines: await prisma.deadline.count(),
    resources: await prisma.resource.count(),
  };

  console.log("\nSeed complete:", counts);
  console.log("\nDemo accounts");
  console.log("  Student   student@mku.ac.rw  / Student@123");
  console.log("  Student   jean@mku.ac.rw     / Student@123");
  console.log("  Lecturer  lecturer@mku.ac.rw / Lecturer@123");
  console.log("  Admin     admin@mku.ac.rw    / Admin@123\n");

  void admin;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
