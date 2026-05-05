IntDoc.ai — AI-Powered Study Architect 🚀

IntDoc.ai is a full-stack, state-of-the-art document analysis platform designed to transform complex documents into structured study guides. Using advanced AI models (Llama 3.1), it automatically generates executive summaries, interactive quizzes, and flashcards from PDFs, Word docs, and even YouTube transcripts.

---

✨ Key Features

- 📄 Smart Document Parsing: Supports PDF, DOCX, TXT, and YouTube Video URLs.
- 🧠 AI Study Architect: Generates exhaustive overviews, core concepts, and deep-dive analysis.
- 📝 Interactive Quizzes: Automatically creates 10-question quizzes based on your document with real-time scoring.
- 🗂️ Smart Flashcards: Generates 10 study flashcards for quick revision.
- 💬 Document Chat: An integrated AI chat assistant to answer specific questions about your uploaded content.
- 📊 Admin Dashboard: Comprehensive control panel to monitor platform activity, manage users, and track AI usage metrics.
- 📂 History Tracking: Save and revisit your previous analyses at any time.

---

🛠️ Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, Framer Motion, Lucide React.
- Backend: Node.js, Express 5, MongoDB (Mongoose).
- AI Integration: NVIDIA AI Foundation (Llama-3.1-70B-Instruct).
- Authentication: JWT (JSON Web Tokens) & Bcryptjs.
- File Processing: PDF.js, Mammoth (DOCX), YouTube-Transcript.

---

🚀 Getting Started

1. Prerequisites
- Node.js (v18 or higher)
- MongoDB (Local or Atlas)
- NVIDIA API Key (Get it from the NVIDIA API Catalog)

2. Installation
Clone the repository and install dependencies:

npm install

3. Environment Setup
Create a .env file in the root directory and add the following:

# Server Configuration
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_random_secret

# AI Configuration
NVIDIA_API_KEY=your_nvidia_api_key

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

4. Running the Application

Start the Backend Server:

npm start

Start the Frontend (Vite):

npm run dev

The app will be available at http://localhost:5173.



📖 How it Works: Step-by-Step

1. Register/Login: Create an account to start tracking your study history.
2. Upload Content: 
    - Drag and drop a PDF or Word file.
    - Paste raw text.
    - Or paste a YouTube URL to extract the transcript.
3. AI Analysis: The system sends the text to the Llama 3.1 model, which parses the content into a structured Study Guide.
4. Study & Quiz:
    - Read the Executive Overview.
    - Take the Interactive Quiz to test your knowledge.
    - Use Flashcards for quick memorization.
5. Chat with Document: If you have specific questions, use the AI Chat at the bottom of the analysis page to get instant answers based only on the document context.
6. Manage (Admin): Admins can log in to view global activity, see which documents are being analyzed, and manage user accounts.



🔒 Security & Performance
- Rate Limiting: AI endpoints are protected to prevent abuse.
- Secure Auth: Passwords are encrypted using salted hashes.
- Robust Parsing: Includes JSON repair logic to handle complex AI responses reliably.



🤝 Contributing
Feel free to fork this project and submit pull requests for any improvements or new features!



Developed with ❤️ for students and professionals.
