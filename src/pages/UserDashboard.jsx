import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Zap, Sparkles, Download, Copy, Check, Settings, X, Video, Book, Presentation, Hexagon, Shield, Camera, MessageCircle, Briefcase, Trash2, User, Mail, LogOut, UserCircle, AlertCircle } from 'lucide-react';
import { AvatarWithName } from '@/components/ui/avatar-with-name';
import { useNavigate } from 'react-router-dom';
import TestimonialsSection from '../components/TestimonialsSectionNew';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { AnimatedAIChatSection } from '../components/AnimatedAIChatSection';
import { Footer } from '../components/ui/footer-1';
import AuthModal from '../components/ui/AuthModal';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { GradientBarsBackground } from '@/components/ui/gradient-bars-background';
import { DottedSurface } from '@/components/ui/dotted-surface';
import {
  getUser, fetchMe, logout,
  analyzeDocument as apiAnalyzeDocument,
  fetchHistory, deleteHistory,
  extractVideo,
  saveQuizScore,
  stopActivity
} from '../services/authService';
import { extractTextFromPDF, extractTextFromDOCX, extractTextFromPPTX } from '../utils/documentParsers';
import { downloadAsPDF, downloadAsDOCX } from '../utils/exportUtils';

const syncChannel = new BroadcastChannel('intdoc_sync');

export default function UserDashboard() {
  const navigate = useNavigate();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(getUser());
  const [userHistory, setUserHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const summaryRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const initUser = async () => {
      const u = await fetchMe();
      setUser(u);
    };
    initUser();

    const handleSync = (e) => {
      if (e.data?.type === 'ACTIVITY_UPDATED') {
        fetchHistory().then((h) => setUserHistory(h || [])).catch(() => { });
      }
    };
    syncChannel.addEventListener('message', handleSync);
    return () => syncChannel.removeEventListener('message', handleSync);
  }, []);

  // Load history from API whenever user changes
  useEffect(() => {
    if (user) {
      setHistoryLoading(true);
      fetchHistory()
        .then((h) => setUserHistory(h || []))
        .catch(() => setUserHistory([]))
        .finally(() => setHistoryLoading(false));
    } else {
      setUserHistory([]);
    }
  }, [user]);
  const [theme, setTheme] = useState(localStorage.getItem('intdoc_theme') || 'dark');
  const [backgroundStyle, setBackgroundStyle] = useState(localStorage.getItem('intdoc_bgstyle') || 'geometric');
  const [fontSize, setFontSize] = useState(localStorage.getItem('intdoc_fontsize') || 'medium');
  const [apiKey, setApiKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [activeTab, setActiveTab] = useState('All');
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisTimer, setAnalysisTimer] = useState(0);
  const [totalTimeTaken, setTotalTimeTaken] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [urlInput, setUrlInput] = useState('');

  // Quiz States
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [isQuizAnswered, setIsQuizAnswered] = useState(false);
  const [showQuizResult, setShowQuizResult] = useState(false);

  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [showFlashcardsModal, setShowFlashcardsModal] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);

  useEffect(() => {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('intdoc_theme', theme);
    localStorage.setItem('intdoc_bgstyle', backgroundStyle);
    let size = '16px';
    if (fontSize === 'small') size = '14px';
    if (fontSize === 'large') size = '18px';
    document.documentElement.style.fontSize = size;
  }, [theme, fontSize]);

  // (API key is now managed server-side — kept for settings UI compatibility)

  const tabs = [
    { id: 'All', icon: <Hexagon size={18} /> },
    { id: 'PDF', icon: <FileText size={18} /> },
    { id: 'Video', icon: <Video size={18} /> },
    { id: 'TXT', icon: <Book size={18} /> },
    { id: 'PPT', icon: <Presentation size={18} /> },
    { id: 'History', icon: <Zap size={18} /> }
  ];

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
  };

  const saveSettings = () => {
    localStorage.setItem('intdoc_api_key', apiKey);
    localStorage.setItem('intdoc_theme', theme);
    localStorage.setItem('intdoc_fontsize', fontSize);
    setIsSettingsOpen(false);
  };

  // Timer logic for analysis
  useEffect(() => {
    let interval;
    if (isProcessing) {
      setAnalysisTimer(0);
      interval = setInterval(() => {
        setAnalysisTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const runAnalysis = async (textToAnalyze, filename, fileType) => {
    // Create a fresh AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStopped(false);
    try {
      // Small delay to allow the server to receive the request and create the activity log
      setTimeout(() => {
        syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });
      }, 800);

      const result = await apiAnalyzeDocument(textToAnalyze, filename, fileType, controller.signal);
      syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });

      let extractedQuiz = [];
      if (Array.isArray(result.quiz)) extractedQuiz = result.quiz;
      else if (result.quiz?.questions) extractedQuiz = result.quiz.questions;

      let extractedCards = [];
      if (Array.isArray(result.flashcards)) extractedCards = result.flashcards;
      else if (result.flashcards?.cards) extractedCards = result.flashcards.cards;

      setSummaryText(result.summary || 'Summary generation failure.');
      setQuizQuestions(extractedQuiz);
      setFlashcards(extractedCards);
      setCurrentHistoryId(result.historyId);

      // Refresh history from API
      fetchHistory().then((h) => setUserHistory(h || [])).catch(() => { });

      syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });
      setIsProcessing(false);
      setTotalTimeTaken(analysisTimer);
      setShowSummary(true);
    } catch (err) {
      if (err.name === 'AbortError') {
        // User intentionally stopped — already handled in handleStop
        return;
      }
      console.error('AI Analysis Error:', err);
      syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });
      setErrorMsg('API Error: ' + err.message);
      setIsProcessing(false);
    }
  };

  const handleStop = async () => {
    // Abort the in-flight fetch
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setIsProcessing(false);
    setIsStopped(true);
    syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });
    try {
      await stopActivity();
      syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });
    } catch (e) {
      console.warn('Could not mark activity as stopped:', e.message);
    }
  };

  const handleBegin = () => {
    setIsStopped(false);
    setFile(null);
    setErrorMsg('');
  };

  const generateQuiz = () => {
    if (quizQuestions.length === 0) {
      setErrorMsg('No quiz data yet — analyze a document first.');
      return;
    }
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setShowQuizModal(true);
    setSelectedQuizOption(null);
    setIsQuizAnswered(false);
    setShowQuizResult(false);
  };

  const generateFlashcards = () => {
    if (flashcards.length === 0) {
      setErrorMsg('No flashcards yet — analyze a document first.');
      return;
    }
    setCurrentFlashcardIdx(0);
    setIsFlipped(false);
    setShowFlashcardsModal(true);
  };

  const handleFileUpload = (uploadedFile) => {
    if (!user) { setShowAuthModal(true); return; }
    setFile(uploadedFile);
    setErrorMsg('');
    setIsProcessing(true);

    const extension = uploadedFile.name.split('.').pop().toLowerCase();
    let fileType = activeTab !== 'All' ? activeTab.toLowerCase() : extension;
    const allowed = ['pdf', 'txt', 'ppt', 'file', 'pptx', 'docx'];
    if (!allowed.includes(fileType)) fileType = 'file';

    // Normalizing fileType for the AI and routing
    if (extension === 'pptx') fileType = 'ppt';
    if (extension === 'docx') fileType = 'file'; // or 'docx' if backend expects it
    if (extension === 'txt') fileType = 'txt';
    if (extension === 'pdf') fileType = 'pdf';

    const reader = new FileReader();
    reader.onload = async (e) => {
      let content = '';
      try {
        if (extension === 'pdf') {
          content = await extractTextFromPDF(uploadedFile);
        } else if (extension === 'docx') {
          content = await extractTextFromDOCX(uploadedFile);
        } else if (extension === 'pptx') {
          content = await extractTextFromPPTX(uploadedFile);
        } else if (extension === 'txt') {
          content = e.target.result;
        } else if (extension === 'ppt' || extension === 'doc') {
          throw new Error('Legacy .ppt and .doc formats are not supported. Please save them as .pptx or .docx and try again.');
        } else {
          // Fallback for other files (metadata only)
          content = `File: ${uploadedFile.name} (${uploadedFile.type || 'binary'}, ${uploadedFile.size} bytes).`;
        }

        if (!content || content.trim().length === 0) {
          throw new Error('Could not extract any text from this document. It might be empty or encrypted.');
        }

        await runAnalysis(content, uploadedFile.name, fileType);
      } catch (err) {
        console.error('Extraction/Analysis Error:', err);
        if (err.message.includes('extract any text')) {
          setErrorMsg(err.message);
        } else {
          setErrorMsg(`Extraction Failed: ${err.message}. If this is a scanned document (images), please convert it to text first.`);
        }
        setIsProcessing(false);
      }
    };

    if (extension === 'txt') {
      reader.readAsText(uploadedFile);
    } else {
      // Trigger the onload manually for binary/other files after checking them in the handler above
      reader.onload({ target: { result: null } });
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    if (!user) { setShowAuthModal(true); return; }
    if (!urlInput.startsWith('http')) {
      setErrorMsg('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setFile({ name: urlInput, type: 'url' });
    setErrorMsg('');
    setIsProcessing(true);

    try {
      const transcript = await extractVideo(urlInput);
      await runAnalysis(transcript, urlInput, 'youtube');
    } catch (err) {
      console.error('Video Extraction Error:', err);
      setErrorMsg(err.message);
      setIsProcessing(false);
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteHistory(id);
      setUserHistory((prev) => prev.filter((h) => h._id !== id));
    } catch (err) {
      setErrorMsg('Failed to delete: ' + err.message);
    }
  };

  const resetState = () => {
    setFile(null); setShowSummary(false); setIsProcessing(false); setSummaryText(''); setErrorMsg('');
    setShowQuizModal(false); setQuizQuestions([]); setCurrentQuizIndex(0); setQuizScore(0);
    setShowQuizResult(false);
    setShowFlashcardsModal(false); setFlashcards([]); setCurrentFlashcardIdx(0); setIsFlipped(false);
    setCurrentHistoryId(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summaryText);
    alert('Summary copied to clipboard!');
  };

  const handleQuizAnswer = (idx) => {
    if (isQuizAnswered) return;
    setSelectedQuizOption(idx);
    setIsQuizAnswered(true);
    if (idx === quizQuestions[currentQuizIndex].answer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleFinishQuiz = (finalScoreOverride) => {
    const scoreToSave = finalScoreOverride !== undefined ? finalScoreOverride : quizScore;
    setShowQuizResult(true);
    if (currentHistoryId) {
      saveQuizScore(currentHistoryId, scoreToSave)
        .then(() => {
          syncChannel.postMessage({ type: 'ACTIVITY_UPDATED' });
          fetchHistory().then((h) => setUserHistory(h || [])).catch(() => { });
        })
        .catch(err => console.error('Save score error', err));
    }
  };


  return (
    <>
      <div className="mesh-bg"></div>

      {/* Quiz Modal */}
      {showQuizModal && quizQuestions.length > 0 && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-float" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Zap size={24} color="var(--accent-pink)" />
                <h2 style={{ margin: 0 }}>Knowledge Check</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowQuizModal(false)}><X size={20} /></button>
            </div>

            <div className="scrollbar-thin" style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '70vh' }}>
              {!showQuizResult ? (
                <div style={{ padding: '1rem 0', textAlign: 'center' }} className="animate-fade-in">
                  {(() => {
                    const qIndex = currentQuizIndex;
                    const q = quizQuestions[qIndex];
                    if (!q) return null;
                    const selectedIdx = selectedQuizOption && typeof selectedQuizOption === 'object' ? selectedQuizOption[qIndex] : undefined;
                    const isAnswered = selectedIdx !== undefined;
                    const optionsArray = Array.isArray(q.options) ? q.options : (Array.isArray(q.choices) ? q.choices : []);
                    
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          <span>Question {currentQuizIndex + 1} of {quizQuestions.length}</span>
                          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                            {isAnswered ? 'Answered' : 'Select an answer'}
                          </span>
                        </div>

                        <div className="flashcard-container" style={{ cursor: 'default', height: 'auto', minHeight: '300px' }}>
                          <div className="flashcard-inner" style={{ transform: 'none' }}>
                            <div className="flashcard-front" style={{ position: 'relative', transform: 'none', backfaceVisibility: 'visible', textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <div className="flashcard-label">QUESTION</div>
                              <h3 style={{ fontSize: '1.3rem', marginBottom: '2rem', lineHeight: '1.4' }}>
                                {q.question || (typeof q === 'string' ? q : "No question text")}
                              </h3>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', flex: 1 }}>
                                {optionsArray.map((opt, idx) => {
                                  let border = '1px solid rgba(255,255,255,0.1)';
                                  let bg = 'rgba(0,0,0,0.2)';
                                  
                                  let correctAnswerIdx = parseInt(q.answer);
                                  if (isNaN(correctAnswerIdx)) {
                                    if (typeof q.answer === 'string') {
                                      const letterMatch = q.answer.match(/^[A-D]$/i);
                                      if (letterMatch) correctAnswerIdx = q.answer.toUpperCase().charCodeAt(0) - 65;
                                    }
                                  }

                                  if (isAnswered) {
                                    if (idx === correctAnswerIdx) {
                                      border = '1px solid #4CAF50';
                                      bg = 'rgba(76, 175, 80, 0.1)';
                                    } else if (idx === selectedIdx) {
                                      border = '1px solid #F44336';
                                      bg = 'rgba(244, 67, 54, 0.1)';
                                    }
                                  }

                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        if (isAnswered) return;
                                        const safeAnswers = selectedQuizOption || {};
                                        const newAnswers = { ...safeAnswers, [qIndex]: idx };
                                        setSelectedQuizOption(newAnswers);
                                        
                                        if (idx === correctAnswerIdx) {
                                          setQuizScore(prev => prev + 1);
                                        }
                                        
                                        if (Object.keys(newAnswers).length === quizQuestions.length) {
                                          const finalScore = idx === correctAnswerIdx ? quizScore + 1 : quizScore;
                                          setTimeout(() => handleFinishQuiz(finalScore), 1000);
                                        } else {
                                          setTimeout(() => setCurrentQuizIndex(prev => Math.min(quizQuestions.length - 1, prev + 1)), 1000);
                                        }
                                      }}
                                      disabled={isAnswered}
                                      style={{
                                        textAlign: 'left',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        background: bg,
                                        border: border,
                                        color: 'var(--text-main)',
                                        cursor: isAnswered ? 'default' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                      className={!isAnswered ? "quiz-option-hover" : ""}
                                    >
                                      <span style={{ 
                                        fontWeight: 'bold', 
                                        marginRight: '1rem', 
                                        color: isAnswered && idx === correctAnswerIdx ? '#4CAF50' : isAnswered && idx === selectedIdx ? '#F44336' : 'var(--text-muted)' 
                                      }}>
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                          <button
                            className="btn btn-secondary"
                            disabled={currentQuizIndex === 0}
                            onClick={() => setCurrentQuizIndex(prev => prev - 1)}
                          >
                            Previous
                          </button>
                          {currentQuizIndex === quizQuestions.length - 1 ? (
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handleFinishQuiz()}
                              disabled={Object.keys(selectedQuizOption || {}).length === 0}
                            >
                              Finish Quiz
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary"
                              onClick={() => setCurrentQuizIndex(prev => prev + 1)}
                            >
                              Next Question
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0' }} className="animate-fade-in">
                  <div style={{ fontSize: '4rem', fontWeight: 'bold', marginBottom: '1rem', background: 'linear-gradient(45deg, var(--accent-blue), var(--accent-pink))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {Math.round((quizScore / quizQuestions.length) * 100)}%
                  </div>
                  <h3 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
                    {quizScore === quizQuestions.length ? 'Perfect Score!' : quizScore >= quizQuestions.length / 2 ? 'Great Job!' : 'Keep Learning!'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    You got {quizScore} out of {quizQuestions.length} questions correct.
                  </p>
                  <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      {quizScore >= quizQuestions.length / 2
                        ? 'Excellent comprehension of the document material.'
                        : 'Review the document summary and try the quiz again to improve your score.'}
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => setShowQuizModal(false)} style={{ width: '100%', justifyContent: 'center' }}>
                    Close Quiz
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flashcards Modal */}
      {showFlashcardsModal && flashcards.length > 0 && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content animate-float" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Sparkles size={24} color="var(--accent-purple)" />
                <h2 style={{ margin: 0 }}>Flashcards Exploration</h2>
              </div>
              <button className="icon-btn" onClick={() => setShowFlashcardsModal(false)}><X size={20} /></button>
            </div>

            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <span>Card {currentFlashcardIdx + 1} of {flashcards.length}</span>
                <span
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{ cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 'bold' }}
                  className="hover:scale-105 transition-all"
                >
                  {isFlipped ? 'Show Question' : 'Click to flip & explain'}
                </span>
              </div>

              <div className="flashcard-container" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
                  <div className="flashcard-front">
                    <div className="flashcard-label">Question</div>
                    <h3 style={{ fontSize: '1.5rem', lineHeight: '1.4' }}>{flashcards[currentFlashcardIdx]?.front || flashcards[currentFlashcardIdx]?.question || "No question provided."}</h3>
                  </div>
                  <div className="flashcard-back">
                    <div className="flashcard-label">Explanation</div>
                    <p style={{ fontSize: '1.2rem', lineHeight: '1.6' }}>{flashcards[currentFlashcardIdx]?.back || flashcards[currentFlashcardIdx]?.answer || flashcards[currentFlashcardIdx]?.explanation || "No explanation provided."}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  className="btn btn-secondary"
                  disabled={currentFlashcardIdx === 0}
                  onClick={() => { setCurrentFlashcardIdx(prev => prev - 1); setIsFlipped(false); }}
                >
                  Previous
                </button>
                <button
                  className="btn btn-primary"
                  disabled={currentFlashcardIdx === flashcards.length - 1}
                  onClick={() => { setCurrentFlashcardIdx(prev => prev + 1); setIsFlipped(false); }}
                >
                  Next Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Wrapper Integration */}
      {(() => {
        const DashboardMain = (
          <div className="app-container">
            {/* Header */}
            <motion.header
              className="header"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <Zap size={28} /> IntDoc.ai
              </div>
              <div className="header-actions">
                <button className="icon-btn" onClick={() => setIsSettingsOpen(true)} title="Settings">
                  <Settings size={20} />
                </button>
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user.name}</span>
                    <AvatarWithName
                      size="sm"
                      name={user?.name || 'User'}
                      src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                      onClick={() => setShowProfile(!showProfile)}
                      className="cursor-pointer"
                    />

                    {/* Profile Popup */}
                    <AnimatePresence>
                      {showProfile && (
                        <motion.div
                          className="absolute top-20 right-8 z-50 glass-panel p-6 w-80 border border-[var(--accent-blue)]/30 shadow-[0_20px_60px_-10px_rgba(0,208,255,0.3)]"
                          style={{ textAlign: 'left' }}
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        >
                          <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                            <div className="p-3 rounded-full bg-blue-500/10 border border-blue-500/20">
                              <User size={28} className="text-[var(--accent-blue)]" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">{user?.name || 'User'}</h3>
                              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Student Account</p>
                            </div>
                          </div>

                          <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-4">
                              <Mail size={18} className="text-[var(--text-muted)]" />
                              <span className="text-sm text-[var(--text-main)] break-all">{user?.email || 'No email provided'}</span>
                            </div>
                          </div>

                          <button
                            className="btn btn-secondary w-full flex items-center justify-center gap-2"
                            onClick={() => { logout(); setUser(null); setShowProfile(false); }}
                            style={{ padding: '0.8rem', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}
                          >
                            <LogOut size={16} /> Sign Out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setShowAuthModal(true)}>Sign In</button>
                )}
              </div>
            </motion.header>

            {/* Auth Modal */}
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onSuccess={(u) => { setUser(u); setShowAuthModal(false); }}
            />

            {/* Settings Modal */}
            {isSettingsOpen && (
              <div className="modal-overlay">
                <div className="glass-panel modal-content animate-float" style={{ animationIterationCount: 1, animationDuration: '0.4s' }}>
                  <div className="modal-header">
                    <h2>Settings</h2>
                    <button className="icon-btn" style={{ width: '30px', height: '30px' }} onClick={() => setIsSettingsOpen(false)}>
                      <X size={16} />
                    </button>
                  </div>
                  <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label>Appearance</label>
                      <select className="form-input" value={theme} onChange={(e) => setTheme(e.target.value)}>
                        <option value="dark">Neon Dark</option>
                        <option value="light">Clean Light</option>
                        <option value="cyber">Cyber Industrial</option>
                        <option value="midnight">Deep Midnight</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Background Effect</label>
                      <select className="form-input" value={backgroundStyle} onChange={(e) => setBackgroundStyle(e.target.value)}>
                        <option value="geometric">Geometric Shapes</option>
                        <option value="bars">Gradient Bars</option>
                        <option value="dots">Dotted Surface</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Text Size</label>
                      <select className="form-input" value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={saveSettings}>
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            <main className="main-content">
              <AnimatePresence mode="wait">

                
                {!isProcessing && !showSummary && !isStopped && (
                  <motion.div
                    key="input-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* Hero Section */}
                    <motion.section
                      className="hero"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h1>Lightning Fast <span className="hero-highlight">AI Insights</span></h1>
                      <p>Stop reading and start doing. Transform hours of dense documents, contracts, and videos into crisp, actionable intelligence in seconds.</p>
                    </motion.section>



                    {/* Error Message */}
                    <AnimatePresence>
                      {errorMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          style={{
                            background: 'rgba(255, 107, 107, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 107, 107, 0.4)',
                            padding: '1rem 1.5rem',
                            borderRadius: '1.25rem',
                            color: '#ffa3a3',
                            textAlign: 'center',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            boxShadow: '0 8px 32px 0 rgba(255, 107, 107, 0.2)',
                            position: 'relative',
                            maxWidth: '600px',
                            margin: '0 auto 2rem auto'
                          }}
                        >
                          <AlertCircle size={20} className="shrink-0" />
                          <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{errorMsg}</span>
                          <button
                            onClick={() => setErrorMsg('')}
                            style={{
                              marginLeft: 'auto',
                              background: 'transparent',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              opacity: 0.6,
                              display: 'flex',
                              padding: '0.25rem'
                            }}
                            className="hover:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.div
                      className="category-tabs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      {tabs.map((tab, i) => (
                        <motion.button
                          key={tab.id}
                          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                          onClick={() => setActiveTab(tab.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + (i * 0.05) }}
                        >
                          {tab.icon} {tab.id}
                        </motion.button>
                      ))}
                    </motion.div>

                    {/* History Zone OR Upload Zone */}
                    {activeTab === 'History' ? (
                      <section className="glass-panel" style={{ padding: '2rem', textAlign: 'left' }}>
                        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Zap size={24} color="var(--accent-pink)" /> My Past Summaries
                        </h2>
                        {!user ? (
                          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <p>Please Sign In to view your summary history.</p>
                            <button className="btn btn-secondary" onClick={() => setShowAuthModal(true)} style={{ marginTop: '1rem' }}>Sign In</button>
                          </div>
                        ) : historyLoading ? (
                          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <p>Loading history...</p>
                          </div>
                        ) : userHistory.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <p>No past summaries found! Upload a document to get started.</p>
                          </div>
                        ) : (
                          <motion.div
                            key="history-list"
                            style={{ display: 'grid', gap: '1rem' }}
                            initial="hidden"
                            animate="show"
                            layout
                            variants={{
                              hidden: { opacity: 0 },
                              show: {
                                opacity: 1,
                                transition: {
                                  staggerChildren: 0.1
                                }
                              }
                            }}
                          >
                            {userHistory.map((item) => (
                              <motion.div
                                key={item._id}
                                className="history-card"
                                layout
                                variants={{
                                  hidden: { opacity: 0, x: -10 },
                                  show: { opacity: 1, x: 0 }
                                }}
                                whileHover={{ scale: 1.01, x: 5 }}
                                style={{
                                  background: 'var(--glass-bg)',
                                  border: '1px solid var(--glass-border)',
                                  padding: '1.5rem',
                                  borderRadius: '1rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  cursor: 'pointer'
                                }}
                                onClick={() => { setSummaryText(item.summary); setQuizQuestions(item.quiz || []); setFlashcards(item.flashcards || []); setCurrentHistoryId(item._id); setShowSummary(true); }}
                              >
                                <div>
                                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>{item.filename}</h3>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{item.fileType?.toUpperCase()}</span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                                  {item.bestQuizScore !== null && item.bestQuizScore !== undefined && (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-teal)', marginLeft: '1rem', fontWeight: 'bold' }}>Score: {item.bestQuizScore} / {item.quiz?.length || 15}</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>View</motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1, color: '#ff4d4d' }}
                                    whileTap={{ scale: 0.9 }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem', color: '#ff6b6b' }}
                                    onClick={(e) => handleDeleteHistory(e, item._id)}
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </motion.button>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </section>
                    ) : (
                      <div style={{ position: 'relative', width: '100%' }}>
                        {!user && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-[1.5rem] animate-fade-in border border-white/10">
                            <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '450px' }}>
                              <div className="flex justify-center mb-6">
                                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                  <Shield size={48} className="text-[var(--accent-blue)]" />
                                </div>
                              </div>
                              <h2 style={{ fontSize: '1.8rem', marginBottom: '0.8rem', fontWeight: '800' }}>Auth Required</h2>
                              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem', lineHeight: '1.6' }}>
                                Unlock the power of IntDoc AI by signing in. Your documents and insights will be securely saved to your personal account.
                              </p>
                              <button
                                className="btn btn-primary animate-glow"
                                onClick={() => setShowAuthModal(true)}
                                style={{ padding: '0.8rem 2rem', width: '100%', justifyContent: 'center', fontSize: '1rem' }}
                              >
                                Sign In to Start
                              </button>
                            </div>
                          </div>
                        )}

                        <section
                          className={`glass-panel upload-zone ${dragActive ? "drag-active" : ""} ${!user ? 'select-none pointer-events-none' : ''}`}
                          style={!user ? { filter: 'blur(10px)', opacity: 0.6 } : {}}
                          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                        >
                          <UploadCloud className="upload-icon" />
                          <div className="upload-text">
                            Drag & drop your {activeTab === 'All' ? 'document' : activeTab} here
                          </div>
                          <div className="upload-subtext">
                            {activeTab === 'All' ? 'Supports PDF, DOCX, TXT, PPT, Video' : `Uploading for ${activeTab} format`}
                          </div>

                          <div style={{ marginTop: '2rem' }}>
                            <label htmlFor="file-upload" className="btn btn-primary">
                              Select {activeTab !== 'All' ? activeTab : 'File'}
                            </label>
                            <input
                              id="file-upload" type="file" className="file-input"
                              onChange={handleChange}
                              accept={activeTab === 'Video' ? 'video/*' : activeTab === 'PDF' ? '.pdf' : activeTab === 'PPT' ? '.ppt,.pptx' : activeTab === 'TXT' ? '.txt' : '.pdf,.docx,.txt,.ppt,.pptx,video/*'}
                            />
                          </div>

                          {activeTab === 'Video' && (
                            <div style={{ marginTop: '1.5rem', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>— OR —</span>
                              </div>

                              <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px', margin: '0 auto' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Paste video URL (https://...)"
                                  value={urlInput}
                                  onChange={(e) => setUrlInput(e.target.value)}
                                  style={{ flex: 1, padding: '0.8rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}
                                />
                                <button type="submit" className="btn btn-secondary">
                                  Submit URL
                                </button>
                              </form>
                            </div>
                          )}
                        </section>
                      </div>
                    )}
                    <TestimonialsSection />
                  </motion.div>
                )}

                {isProcessing && (
                  <motion.section
                    key="processing-view"
                    className="glass-panel processing-container animate-glow"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                  >
                    <div className="loader-orbit">
                      <div className="orbit-ring"></div>
                      <div className="orbit-ring"></div>
                      <div className="orbit-ring"></div>
                      <div className="scanning-box">
                        <div className="scan-line"></div>
                        <FileText size={40} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5 }} />
                      </div>
                    </div>
                    <h2 style={{ marginBottom: '0.5rem' }}>Analyzing Document</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Powered by IntDoc AI. Extracting insights...</p>
                    <div style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Zap size={22} className="animate-pulse" />
                      {formatTime(analysisTimer)}
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: '1.5rem', padding: '0.6rem 2rem', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.4)', fontWeight: 600 }}
                      onClick={handleStop}
                    >
                      ⏹ Stop Processing
                    </button>
                  </motion.section>
                )}

                {isStopped && !isProcessing && !showSummary && (
                  <motion.section
                    key="stopped-view"
                    className="glass-panel processing-container"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ borderColor: 'rgba(255,165,0,0.4)' }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏹</div>
                    <h2 style={{ marginBottom: '0.5rem', color: 'orange' }}>Processing Stopped</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your document analysis was cancelled.</p>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.7rem 2.5rem', fontWeight: 700 }}
                      onClick={handleBegin}
                    >
                      ▶ Begin New Analysis
                    </button>
                  </motion.section>
                )}

                {showSummary && (
                  <motion.div
                    key="summary-view"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <section className="glass-panel summary-container animate-float" style={{ animationIterationCount: 1, animationDuration: '1s' }}>
                      <div className="summary-header">
                        <Sparkles size={28} style={{ color: 'var(--accent-pink)' }} />
                        <h2 className="summary-title">Response</h2>
                        <span className="badge">Success</span>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', position: 'relative' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={copyToClipboard} title="Copy to Clipboard">
                            <Copy size={18} />
                          </button>
                          <div style={{ position: 'relative' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.5rem' }}
                              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                              title="Download"
                            >
                              <Download size={18} />
                            </button>
                            {showDownloadMenu && (
                              <div className="glass-panel" style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                zIndex: 100, minWidth: '150px', padding: '0.5rem',
                                border: '1px solid var(--accent-blue)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                              }}>
                                <button
                                  className="menu-item"
                                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px' }}
                                  onClick={() => { downloadAsPDF(summaryRef.current, `Summary_${Date.now()}.pdf`); setShowDownloadMenu(false); }}
                                >
                                  Download as PDF
                                </button>
                                <button
                                  className="menu-item"
                                  style={{ width: '100%', textAlign: 'left', padding: '0.5rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '4px', marginTop: '0.2rem' }}
                                  onClick={() => { downloadAsDOCX(summaryText, `Summary_${Date.now()}.docx`); setShowDownloadMenu(false); }}
                                >
                                  Download as DOCX
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            onClick={generateQuiz}
                          >
                            View Quiz
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            onClick={generateFlashcards}
                          >
                            <Zap size={16} /> View Flashcards
                          </button>
                        </div>
                      </div>

                      <div className="summary-content" ref={summaryRef}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <ReactMarkdown
                    components={{
                      h2({ node, ...props }) {
                        return <h2 style={{ color: '#00ffa4', textTransform: 'uppercase', marginBottom: '1.5rem', marginTop: '2.5rem', letterSpacing: '-0.5px' }} {...props} />
                      },
                      h3({ node, ...props }) {
                        return <h3 style={{ color: '#00ffa4', textTransform: 'uppercase', marginBottom: '1rem', marginTop: '2rem', fontSize: '1.3rem' }} {...props} />
                      },
                      li({ node, ...props }) {
                        return <li style={{ marginBottom: '1rem', position: 'relative', paddingLeft: '1.5rem', listStyle: 'none', lineHeight: '1.6' }}>
                          <span style={{ color: '#00d0ff', position: 'absolute', left: 0, fontWeight: 'bold' }}>•</span>
                          {props.children}
                        </li>
                      },
                      strong({ node, ...props }) {
                        return <strong style={{ color: '#ff00a0', fontWeight: 'bold' }} {...props} />
                      },
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const [copied, setCopied] = useState(false);

                        const handleCopy = () => {
                          navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        };

                        return !inline && match ? (
                          <div className="relative group">
                            <button
                              onClick={handleCopy}
                              className="copy-code-btn opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Copy code"
                            >
                              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                              <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {summaryText}
                  </ReactMarkdown>
                        </div>
                      </div>

                      <div className="action-buttons">
                        <button className="btn btn-primary" onClick={resetState}>
                          Analyze Another Document
                        </button>
                      </div>
                    </section>
                    <AnimatedAIChatSection
                      context={summaryText}
                      layoutZone="inline"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Footer
                description="Empowering researchers and students to achieve success through AI-powered document analysis, instant quizzes, and interactive study flashcards."
                copyright={`© ${new Date().getFullYear()} IntDoc AI. All Rights Reserved.`}
                socialLinks={[
                  { icon: Camera, href: "#", label: "Instagram" },
                  { icon: MessageCircle, href: "#", label: "Community" },
                  { icon: Briefcase, href: "#", label: "LinkedIn" },
                ]}
                columns={[
                  {
                    title: "FEATURES",
                    links: [
                      { label: "Document Summaries", href: "#" },
                      { label: "AI Flashcards", href: "#", badge: "Pro" },
                      { label: "Interactive Quizzes", href: "#" },
                      { label: "Smart Assistant Chat", href: "#", badge: "New" },
                    ],
                  },
                  {
                    title: "RESOURCES",
                    links: [
                      { label: "Study Guides", href: "#" },
                      { label: "Knowledge Base", href: "#", badge: "New" },
                      { label: "API Documentation", href: "#" },
                      { label: "Help Center", href: "#" },
                    ],
                  },
                  {
                    title: "PLATFORM",
                    links: [
                      { label: "About IntDoc", href: "#" },
                      { label: "Pricing", href: "#" },
                      { label: "University Partners", href: "#" },
                      { label: "Contact Us", href: "#" },
                    ],
                  },
                  {
                    title: "LEGAL",
                    links: [
                      { label: "Privacy Policy", href: "#" },
                      { label: "Terms of Service", href: "#" },
                      { label: "Cookie Settings", href: "#" },
                      { label: "Data Security", href: "#" },
                    ],
                  },
                ]}
              />
            </main>
          </div>
        );

        if (backgroundStyle === 'bars') {
          return (
            <GradientBarsBackground numBars={15} gradientFrom="var(--accent-pink)">
              {DashboardMain}
            </GradientBarsBackground>
          );
        } else if (backgroundStyle === 'dots') {
          return (
            <DottedSurface theme={theme}>
              {DashboardMain}
            </DottedSurface>
          );
        } else {
          return (
            <HeroGeometric badge="IntDoc AI Platform" title1="Elevate Your" title2="Knowledge Experience">
              {DashboardMain}
            </HeroGeometric>
          );
        }
      })()}
    </>
  );
}
