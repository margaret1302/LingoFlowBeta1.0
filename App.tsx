import React, { useState, useEffect, useRef } from 'react';
import { View, Term, PrepResult, Session, ChatMessage } from './types';
import { generatePrepMaterial } from './services/geminiService';
import { ChatPanel } from './components/ChatWidget';
import { RapidFire } from './components/RapidFire';
import { BookOpen, Layers, Zap, Search, Volume2, RotateCw, X, Edit, Check, Download, Plus, GripVertical, FileText, Save, Trash, MessageCircle, ArrowLeft, Folder, Calendar, MoreVertical, ArrowRight } from './components/Icons';

// --- Sub-components defined here for single-file coherence in specific output ---

const DashboardView = ({ onPrepStart }: { onPrepStart: (topic: string) => void }) => {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    await onPrepStart(topic);
    setIsGenerating(false);
  };

  return (
    <div className="max-w-3xl mx-auto pt-20 px-6 text-center">
      <h1 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">
        Your AI Booth Partner.
      </h1>
      <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
        Prepare for your next conference in seconds. Deep background research, precision terminology extraction, and context assistance.
      </p>
      
      <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto mb-16">
        <input 
          type="text" 
          placeholder="Enter conference topic (e.g., Generative AI in Healthcare)..."
          className="w-full pl-6 pr-14 py-4 text-lg rounded-full shadow-lg border border-transparent focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none text-slate-700 placeholder-slate-400"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isGenerating}
        />
        <button 
          type="submit" 
          disabled={isGenerating}
          className="absolute right-2 top-2 h-10 w-10 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-70"
        >
          {isGenerating ? <RotateCw className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5" />}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
         {[
           { icon: Layers, title: "Deep Briefing", desc: "Comprehensive industry context." },
           { icon: BookOpen, title: "Smart Glossary", desc: "Editable bilingual terms." },
           { icon: Zap, title: "Rapid Drill", desc: "High-pressure sight translation." }
         ].map((item, i) => (
           <div key={i} className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <item.icon className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500">{item.desc}</p>
           </div>
         ))}
      </div>
    </div>
  );
};

interface PrepViewProps {
  session: Session;
  onUpdateSession: (session: Session) => void;
  onBack: () => void;
}

const PrepView: React.FC<PrepViewProps> = ({ session, onUpdateSession, onBack }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ english: string, chinese: string }>({ english: '', chinese: '' });
  
  // Layout State
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(380);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Right Panel State
  const [activeTab, setActiveTab] = useState<'chat' | 'notes'>('chat');
  
  // Local state for notes to prevent excessive parent re-renders, sync on blur/delay
  const [notes, setNotes] = useState(session.notes);

  useEffect(() => {
    setNotes(session.notes);
  }, [session.notes]);

  const handleNotesChange = (val: string) => {
    setNotes(val);
  };

  const handleNotesBlur = () => {
    if (notes !== session.notes) {
      onUpdateSession({ ...session, notes, lastModified: Date.now() });
    }
  };

  const handleMessagesChange = (updatedMessages: ChatMessage[]) => {
    onUpdateSession({ ...session, chatHistory: updatedMessages, lastModified: Date.now() });
  };

  // --- Resizing Logic ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      if (isDraggingLeft) {
        const newWidth = e.clientX - containerRect.left;
        if (newWidth > 200 && newWidth < 600) setLeftWidth(newWidth);
      }
      if (isDraggingRight) {
        const newWidth = containerRect.right - e.clientX;
        if (newWidth > 250 && newWidth < 600) setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      document.body.style.cursor = 'default';
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isDraggingRight]);

  // --- Glossary Logic ---
  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  const handleEditClick = (term: Term) => {
    setEditingId(term.id);
    setEditForm({ english: term.english, chinese: term.chinese });
  };

  const handleSaveEdit = (id: string) => {
    const updatedTerms = session.terms.map(t => t.id === id ? { ...t, english: editForm.english, chinese: editForm.chinese } : t);
    onUpdateSession({ ...session, terms: updatedTerms, lastModified: Date.now() });
    setEditingId(null);
  };

  const handleAddTerm = () => {
    const newTerm: Term = {
      id: Date.now().toString(),
      english: "",
      chinese: "",
      definition: "Manual Entry",
      tags: [session.topic],
      masteryLevel: 0
    };
    const updatedTerms = [newTerm, ...session.terms];
    onUpdateSession({ ...session, terms: updatedTerms, lastModified: Date.now() });
    setEditingId(newTerm.id);
    setEditForm({ english: "", chinese: "" });
  };

  const handleRemoveTerm = (id: string) => {
    if (confirm("Delete this term?")) {
        const updatedTerms = session.terms.filter(t => t.id !== id);
        onUpdateSession({ ...session, terms: updatedTerms, lastModified: Date.now() });
    }
  };

  const handleExportGlossary = () => {
    const headers = "English,Chinese,Definition,Topic\n";
    const rows = session.terms.map(t => 
      `"${t.english.replace(/"/g, '""')}","${t.chinese.replace(/"/g, '""')}","${t.definition.replace(/"/g, '""')}","${t.tags?.join(';') || ''}"`
    ).join("\n");
    
    // Fix: Add BOM (\uFEFF) so Excel opens UTF-8 CSVs correctly
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${session.topic.replace(/\s+/g, '_')}_glossary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Notes Logic ---
  const handleCaptureSelection = () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      const timestamp = new Date().toLocaleTimeString();
      const newNoteFragment = `[${timestamp}] ${selection}`;
      const updatedNotes = notes + (notes ? '\n\n' : '') + newNoteFragment;
      setNotes(updatedNotes);
      onUpdateSession({ ...session, notes: updatedNotes, lastModified: Date.now() });
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white" ref={containerRef}>
      
      {/* 1. Brief Side (Left) */}
      <div 
        style={{ width: leftWidth }} 
        className="hidden md:flex flex-col border-r border-slate-200 bg-slate-50 shrink-0"
      >
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
           <button onClick={onBack} className="text-slate-500 hover:text-orange-500 flex items-center gap-1 text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Library
           </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2 sticky top-0 bg-slate-50 py-2">
            <Layers className="w-4 h-4 text-orange-500" />
            Background Briefing
          </h2>
          <div className="prose prose-sm prose-slate max-w-none">
            <h3 className="text-lg font-bold capitalize text-slate-800 mb-4">{session.topic}</h3>
            <ul className="space-y-4">
              {session.summary.map((point, i) => (
                <li key={i} className="flex gap-3 text-slate-600 leading-relaxed text-sm">
                  <span className="text-orange-500 font-bold shrink-0 mt-1">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Resizer Left */}
      <div 
        className="w-1 hover:w-2 hover:bg-orange-400 bg-slate-200 cursor-col-resize transition-all z-10 hidden md:block"
        onMouseDown={() => setIsDraggingLeft(true)}
      />

      {/* 2. Glossary Side (Middle - Main) */}
      <div className="flex-1 flex flex-col min-w-[300px] bg-white">
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-100 flex justify-between items-center px-4 md:px-6 shrink-0 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-bold text-slate-800">Glossary</h2>
             <span className="text-xs font-semibold px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">{session.terms.length}</span>
          </div>
          <div className="flex gap-2">
             <button onClick={handleAddTerm} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
               <Plus className="w-4 h-4" /> Add
             </button>
             <button onClick={handleExportGlossary} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
               <Download className="w-4 h-4" /> CSV
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-white text-slate-400 text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-semibold w-5/12 border-b border-slate-100">English</th>
                <th className="p-4 font-semibold w-5/12 border-b border-slate-100">Chinese</th>
                <th className="p-4 font-semibold text-right w-2/12 border-b border-slate-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {session.terms.map((term) => (
                  <tr key={term.id} className="hover:bg-slate-50 transition-colors group">
                    {/* English Column */}
                    <td className="p-4 align-top break-words">
                      {editingId === term.id ? (
                          <input 
                            type="text" 
                            autoFocus
                            placeholder="English Term"
                            className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                            value={editForm.english}
                            onChange={(e) => setEditForm(prev => ({...prev, english: e.target.value}))}
                          />
                      ) : (
                          <>
                              <div className="font-bold text-slate-800">{term.english}</div>
                              <div className="text-xs text-slate-400 mt-1 line-clamp-2">{term.definition}</div>
                          </>
                      )}
                    </td>
                    
                    {/* Chinese Column */}
                    <td className="p-4 align-top break-words">
                      {editingId === term.id ? (
                        <input 
                            type="text" 
                            placeholder="Chinese Translation"
                            className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={editForm.chinese}
                            onChange={(e) => setEditForm(prev => ({...prev, chinese: e.target.value}))}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(term.id)}
                          />
                      ) : (
                        <div className="text-slate-700 font-medium">{term.chinese}</div>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="p-4 text-right align-top">
                      {editingId === term.id ? (
                          <div className="flex justify-end gap-2">
                              <button onClick={() => handleSaveEdit(term.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded">
                                  <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded">
                                  <X className="w-4 h-4" />
                              </button>
                          </div>
                      ) : (
                          <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => speak(term.english)} 
                                className="p-1.5 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                <Volume2 className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleEditClick(term)} 
                                className="p-1.5 hover:bg-blue-100 rounded text-blue-500 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleRemoveTerm(term.id)} 
                                className="p-1.5 hover:bg-red-100 rounded text-red-500 transition-colors"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                          </div>
                      )}
                    </td>
                  </tr>
              ))}
              {session.terms.length === 0 && (
                  <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-400">
                          No terms yet.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resizer Right */}
      <div 
        className="w-1 hover:w-2 hover:bg-orange-400 bg-slate-200 cursor-col-resize transition-all z-10 hidden md:block"
        onMouseDown={() => setIsDraggingRight(true)}
      />

      {/* 3. Context Side (Right Sidebar) */}
      <div 
        style={{ width: rightWidth }} 
        className="hidden md:flex flex-col shrink-0 bg-white border-l border-slate-200"
      >
         {/* Sidebar Tabs */}
         <div className="flex border-b border-slate-100 bg-slate-50">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-white text-slate-800 border-t-2 border-orange-500' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <MessageCircle className="w-4 h-4" /> Assistant
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-white text-slate-800 border-t-2 border-orange-500' : 'text-slate-500 hover:text-slate-700'}`}
            >
               <FileText className="w-4 h-4" /> My Notes
            </button>
         </div>

         <div className="flex-1 overflow-hidden relative">
            <div className={`h-full flex flex-col ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
               <ChatPanel 
                  messages={session.chatHistory || []} 
                  onMessagesChange={handleMessagesChange}
               />
            </div>
            
            <div className={`h-full flex flex-col bg-yellow-50/30 ${activeTab === 'notes' ? 'block' : 'hidden'}`}>
                 {/* Notes Toolbar */}
                 <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
                    <button 
                      onClick={handleCaptureSelection}
                      className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors border border-blue-100"
                    >
                       + Capture Selection
                    </button>
                    <span className="text-xs text-slate-400 italic">Auto-saves to Session</span>
                 </div>
                 <textarea 
                   className="flex-1 w-full p-4 resize-none bg-transparent focus:outline-none text-slate-700 leading-relaxed text-sm font-mono"
                   placeholder="Type your notes here or select text from the left panels and click 'Capture Selection'..."
                   value={notes}
                   onChange={(e) => handleNotesChange(e.target.value)}
                   onBlur={handleNotesBlur}
                 />
            </div>
         </div>
      </div>
    </div>
  );
};

const NotebookView = ({ 
  sessions, 
  onOpenSession, 
  onRenameSession, 
  onDeleteSession,
  onExportSession 
}: { 
  sessions: Session[], 
  onOpenSession: (id: string) => void,
  onRenameSession: (id: string, newName: string) => void,
  onDeleteSession: (id: string) => void,
  onExportSession: (session: Session) => void
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dropdownOpenId, setDropdownOpenId] = useState<string | null>(null);

  const startRename = (session: Session) => {
    setRenamingId(session.id);
    setRenameValue(session.topic);
    setDropdownOpenId(null);
  };

  const submitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRenameSession(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  if (sessions.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Folder className="w-16 h-16 mb-4 opacity-30"/>
              <p className="text-lg mb-2">Your library is empty.</p>
              <p className="text-sm">Start a new prep session to create a notebook.</p>
          </div>
      )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Library</h2>
          <p className="text-slate-500">Manage your topic-based notebooks.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map(session => (
          <div key={session.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group relative">
             <div className="flex justify-between items-start mb-4">
                <div className="bg-orange-50 p-2.5 rounded-lg text-orange-500">
                   <Folder className="w-6 h-6" />
                </div>
                <div className="relative">
                   <button 
                    onClick={() => setDropdownOpenId(dropdownOpenId === session.id ? null : session.id)}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded-full"
                   >
                     <MoreVertical className="w-5 h-5"/>
                   </button>
                   
                   {/* Dropdown */}
                   {dropdownOpenId === session.id && (
                     <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-10">
                        <button onClick={() => startRename(session)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                           <Edit className="w-4 h-4"/> Rename
                        </button>
                        <button onClick={() => { onExportSession(session); setDropdownOpenId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                           <Download className="w-4 h-4"/> Export JSON
                        </button>
                        <button onClick={() => { onDeleteSession(session.id); setDropdownOpenId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                           <Trash className="w-4 h-4"/> Delete
                        </button>
                     </div>
                   )}
                </div>
             </div>
             
             {renamingId === session.id ? (
               <input 
                 autoFocus
                 className="w-full border border-blue-300 rounded px-2 py-1 mb-2 font-bold text-slate-800 text-lg focus:outline-none"
                 value={renameValue}
                 onChange={(e) => setRenameValue(e.target.value)}
                 onBlur={submitRename}
                 onKeyDown={(e) => e.key === 'Enter' && submitRename()}
               />
             ) : (
               <h3 onClick={() => onOpenSession(session.id)} className="font-bold text-slate-800 text-lg mb-2 cursor-pointer hover:text-orange-600 truncate">{session.topic}</h3>
             )}

             <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                <div className="flex items-center gap-1">
                   <Calendar className="w-3.5 h-3.5" />
                   {new Date(session.lastModified).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                   <Layers className="w-3.5 h-3.5" />
                   {session.terms.length} terms
                </div>
             </div>

             <button 
               onClick={() => onOpenSession(session.id)}
               className="w-full py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
             >
               Open Notebook <ArrowRight className="w-4 h-4" />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  
  // Topic-Based Notebook State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lingoflow_sessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (e) { console.error("Load error", e); }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('lingoflow_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Derived state
  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Actions
  const handlePrepStart = async (topic: string) => {
    try {
      const result = await generatePrepMaterial(topic);
      const newSession: Session = {
        id: Date.now().toString(),
        topic: result.topic,
        summary: result.summary,
        terms: result.terms,
        notes: "",
        chatHistory: [], // Initialize empty chat history
        createdAt: Date.now(),
        lastModified: Date.now()
      };
      
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setCurrentView(View.PREP);
    } catch (error) {
      alert("Failed to generate prep material. Please check your API Key and try again.");
    }
  };

  const handleUpdateSession = (updatedSession: Session) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleRenameSession = (id: string, newName: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, topic: newName, lastModified: Date.now() } : s));
  };

  const handleDeleteSession = (id: string) => {
    if (confirm("Are you sure you want to delete this notebook? This cannot be undone.")) {
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setCurrentView(View.NOTEBOOK);
      }
    }
  };

  const handleExportSession = (session: Session) => {
    const jsonString = JSON.stringify(session, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${session.topic.replace(/\s+/g, '_')}_package.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startDrill = () => {
     if (activeSession && activeSession.terms.length > 0) {
         setCurrentView(View.RAPID_FIRE);
     } else {
         alert("Please open a notebook with terms to start a drill.");
     }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-100">
      
      {/* Navigation */}
      {currentView !== View.RAPID_FIRE && (
        <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setCurrentView(View.DASHBOARD)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                L
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800">Lingo<span className="text-orange-500">Flow</span></span>
            </div>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setCurrentView(View.NOTEBOOK)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${currentView === View.NOTEBOOK ? 'text-orange-500' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Folder className="w-4 h-4" /> My Library
                {sessions.length > 0 && (
                   <span className="bg-orange-100 text-orange-600 text-xs py-0.5 px-2 rounded-full">{sessions.length}</span>
                )}
              </button>
              
              {activeSession && currentView === View.PREP && (
                 <button 
                  onClick={startDrill}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-full hover:bg-slate-800 transition shadow-sm flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 text-orange-400" /> 
                  Drill Session
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content Area */}
      <main className={`${currentView === View.RAPID_FIRE ? 'h-screen' : 'min-h-[calc(100vh-64px)]'}`}>
        {currentView === View.DASHBOARD && <DashboardView onPrepStart={handlePrepStart} />}
        
        {currentView === View.PREP && activeSession && (
          <PrepView 
            session={activeSession}
            onUpdateSession={handleUpdateSession}
            onBack={() => setCurrentView(View.NOTEBOOK)}
          />
        )}

        {currentView === View.NOTEBOOK && (
          <NotebookView 
            sessions={sessions}
            onOpenSession={(id) => { setActiveSessionId(id); setCurrentView(View.PREP); }}
            onRenameSession={handleRenameSession}
            onDeleteSession={handleDeleteSession}
            onExportSession={handleExportSession}
          />
        )}

        {currentView === View.RAPID_FIRE && activeSession && (
          <RapidFire 
            terms={activeSession.terms} 
            onExit={() => setCurrentView(View.PREP)} 
          />
        )}
      </main>
      
    </div>
  );
};

export default App;