import { useState, useRef, useEffect } from 'react';
import { Send, FileText, Loader2, Sparkles, User, Presentation, Settings, CheckCircle2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Message = {
  id: string;
  role: 'user' | 'agent';
  text: string;
  page?: number;
};

// Catálogo oficial Natura hospedado no seu Supabase.
const PDF_URL = "https://ebryxxpwqeyofyydqjeq.supabase.co/storage/v1/object/public/images/natura-abril.pdf";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'agent',
      text: 'Olá! Sou sua consultora virtual. Experimente perguntar sobre nossa linha "Essencial", "Chronos" ou "Todo Dia".',
      page: 1,
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPdf, setShowPdf] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://artefinal-n8n.gumtcw.easypanel.host/webhook/rag');
  const [flipbookUrl, setFlipbookUrl] = useState('https://heyzine.com/flip-book/f6ec899e22.html');
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Mock simulando as respostas da Natura
  const simulateN8nAgent = async (query: string) => {
    return new Promise<{text: string, page: number}>((resolve) => {
      setTimeout(() => {
        const lower = query.toLowerCase();
        if (lower.includes("essencial") || lower.includes("perfume")) {
          resolve({
            text: "O Deo Parfum Essencial Exclusivo Feminino está por R$ 199,90! Uma fragrância floral intensa, ideal para momentos especiais. Veja notas olfativas completas na página 4.",
            page: 4
          });
        } else if (lower.includes("chronos") || lower.includes("rosto") || lower.includes("creme")) {
          resolve({
            text: "A linha Chronos Antissinais possui o Creme Dia 30+ por R$ 154,90. Reduz linhas de expressão com FPS 30. Dá uma olhada nas opções de refil na página 2.",
            page: 2
          });
        } else if (lower.includes("todo dia") || lower.includes("sabonete")) {
          resolve({
            text: "Os sabonetes Todo Dia de Noz Pecã e Cacau são maravilhosos! A caixa com 5 unidades sai por R$ 32,90. Tem bastante opção de fragrância na página 3.",
            page: 3
          });
        } else {
          resolve({
            text: "Não encontrei esta informação no catálogo Natura atual. Tente procurar por Essencial, Chronos ou Todo Dia!",
            page: 1
          });
        }
      }, 1500); 
    });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let responseData: { text: string; page?: number };

      if (webhookUrl.trim() !== '') {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: userMessage.text,
            sessionId: "react-rag-" + Math.random().toString(36).substring(2, 9)
          })
        });
        
        if (!res.ok) throw new Error('Falha na conexão com o n8n');
        const rawData = await res.json(); 
        
        // n8n often returns an array of items (e.g. `[ { "output": "..." } ]`)
        const dataObj = Array.isArray(rawData) ? rawData[0] : rawData;
        
        if (dataObj?.output) {
          try {
            responseData = typeof dataObj.output === 'string' 
              ? JSON.parse(dataObj.output) 
              : dataObj.output;
          } catch (e) {
            responseData = { text: dataObj.output, page: 1 };
          }
        } else if (dataObj?.text) {
          responseData = dataObj;
        } else {
          responseData = { text: JSON.stringify(dataObj || rawData), page: 1 };
        }
        
        // Offset removido: percebemos que o Google lê o rodapé das páginas (texto impresso), 
        // e essa numeração do rodapé das revistas pode distoar do índice do PDF em páginas diferentes.
        if (responseData.page && responseData.page > 0) {
           responseData.page = parseInt((responseData.page).toString(), 10);
        }
      } else {
        responseData = await simulateN8nAgent(userMessage.text);
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: responseData.text || "Ops, recebi uma resposta vazia do servidor.",
        page: responseData.page,
      };

      setMessages((prev) => [...prev, agentMessage]);
      if (responseData.page && responseData.page > 0) {
        setCurrentPage(responseData.page);
        setShowPdf(true);
      }
      
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        text: 'Erro de conexão. Verifique se a URL do Webhook do n8n está correta (Production URL).',
        page: currentPage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full font-sans bg-[#F9F7F5] selection:bg-orange-200">
      
      {/* Left Column: Chat Interface */}
      <div className="flex flex-col w-full lg:w-[40%] min-w-[380px] border-r border-[#EBE4DC] bg-white shadow-[10px_0_30px_rgba(0,0,0,0.03)] z-10">
        
        {/* Header */}
        <header className="flex flex-col px-7 py-5 border-b border-[#EBE4DC] bg-white shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-md shadow-orange-500/20">
                <Sparkles size={20} className="fill-current opacity-90" />
              </div>
              <div>
                <h1 className="font-semibold text-zinc-800 leading-tight text-lg tracking-tight">Consultoria</h1>
                <p className="text-xs text-orange-600 font-medium tracking-wide">Revista de Ciclo Digital</p>
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-full transition-all duration-300 ${showSettings ? 'bg-orange-50 text-orange-600 rotate-90' : 'text-zinc-400 hover:text-orange-500 hover:bg-orange-50'}`}
              title="Configurar Conexão n8n"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Settings Panel Expansion */}
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-[#FBF9F8] border border-[#EBE4DC] rounded-xl text-sm mt-3 shadow-inner">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    URL Webhook (n8n) <span className="px-1.5 py-0.5 bg-orange-100/60 text-orange-800 rounded font-mono text-[10px] border border-orange-200">POST</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://seu-n8n.com/webhook/..."
                      className="flex-1 px-3.5 py-2.5 bg-white border border-[#EBE4DC] rounded-lg text-[13px] focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all font-mono shadow-sm"
                    />
                  </div>
                  
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 mt-4 flex items-center gap-1.5">
                    Modo Livro 3D (HeyZine URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={flipbookUrl}
                      onChange={(e) => setFlipbookUrl(e.target.value)}
                      placeholder="Ex: https://heyzine.com/flip-book/hash.html"
                      className="flex-1 px-3.5 py-2.5 bg-white border border-[#EBE4DC] rounded-lg text-[13px] focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all font-mono shadow-sm"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-3 leading-relaxed">
                    O Webhook no n8n deve obrigatóriamente retornar a resposta JSON (sem markdown):<br/>
                    <code className="inline-block mt-1.5 px-2 py-1 bg-white border border-[#EBE4DC] rounded text-emerald-700 font-medium font-mono">{"{ \"text\": \"Sua resposta\", \"page\": 4 }"}</code>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Message Thread */}
        <main className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth bg-gradient-to-b from-white to-[#FAFAFA]">
          <div className="flex flex-col gap-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[90%] ${
                    message.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-1 shadow-sm ${
                    message.role === 'user' ? 'bg-[#F0EBE6] text-zinc-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {message.role === 'user' ? <User size={15} /> : <Sparkles size={15} />}
                  </div>
                  <div className={`px-5 py-4 shadow-sm text-[15px] leading-relaxed tracking-[0.01em] ${
                    message.role === 'user' 
                      ? 'bg-zinc-800 text-white rounded-2xl rounded-tr-sm shadow-md' 
                      : 'bg-white border border-[#F0EBE6] text-zinc-700 rounded-2xl rounded-tl-sm shadow-sm'
                  }`}>
                    {message.text}
                    {message.page !== undefined && message.page > 0 && message.role === 'agent' && (
                      <span className="inline-flex items-center gap-1.5 mt-3 text-[11px] uppercase tracking-wider font-bold text-orange-700 bg-orange-50/80 px-2.5 py-1.5 rounded-md border border-orange-100/50">
                        <Presentation size={13} />
                        Pág da Revista: {message.page}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 max-w-[85%] mr-auto"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-1 bg-orange-100 text-orange-600 shadow-sm">
                    <Sparkles size={15} />
                  </div>
                  <div className="px-6 py-4 rounded-2xl bg-white border border-[#F0EBE6] text-zinc-400 rounded-tl-sm flex items-center justify-center shadow-sm">
                    <Loader2 size={18} className="animate-spin text-orange-400" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </main>

        {/* Input Area */}
        <footer className="p-5 bg-white border-t border-[#F0EBE6] shrink-0">
          <form 
            onSubmit={handleSendMessage}
            className="flex items-center gap-3 p-2 bg-[#FBF9F8] border border-[#EBE4DC] rounded-full focus-within:ring-4 focus-within:ring-orange-500/10 focus-within:border-orange-400 transition-all shadow-inner"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Qual produto você procura?"
              className="flex-1 px-4 py-2.5 bg-transparent text-[15px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-orange-400 to-amber-500 text-white hover:from-orange-500 hover:to-amber-600 disabled:from-zinc-200 disabled:to-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
          <div className="text-center mt-4">
            {webhookUrl ? (
              <span className="inline-flex items-center justify-center gap-1.5 text-[10px] text-emerald-600 uppercase tracking-[0.1em] font-bold bg-emerald-50 px-2 py-1 rounded">
                <CheckCircle2 size={12} strokeWidth={2.5} /> Sincronizado com n8n
              </span>
            ) : (
              <span className="text-[10px] text-zinc-400 uppercase tracking-[0.1em] font-bold">
                Modo Simulação Offline
              </span>
            )}
          </div>
        </footer>
      </div>

      {/* Right Column: PDF Viewer */}
      <div className="hidden lg:flex flex-col flex-1 bg-[#F9F7F5] border-l border-[#EBE4DC] relative shadow-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          {!showPdf ? (
            <motion.div 
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#F9F7F5] p-10 z-20"
            >
              <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center mb-6 shadow-sm border border-orange-200">
                <BookOpen size={40} className="text-orange-500" />
              </div>
              <h3 className="text-xl font-medium text-zinc-800 mb-3 tracking-wide">Revista Inteligente</h3>
              <p className="text-[15px] text-zinc-500 max-w-[280px] text-center leading-relaxed">
                Faça uma pergunta sobre algum produto no chat ao lado e a revista abrirá automaticamente na página exata.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="viewer"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col z-10"
            >
              <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#1A1A1A]/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-2.5 text-zinc-200 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 pointer-events-auto shadow-2xl">
                  <FileText size={18} className="text-orange-400/90" />
                  <h2 className="font-medium text-xs tracking-wide uppercase">Revista_Ciclo_Atual.pdf</h2>
                </div>
                <div className="px-4 py-2 bg-black/40 backdrop-blur-md text-orange-50 flex items-center gap-2 rounded-xl border border-white/10 pointer-events-auto shadow-2xl">
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">Pág:</span> 
                  <span className="font-mono text-sm font-bold text-orange-400">{currentPage}</span>
                </div>
              </header>
              
              <main className="flex-1 relative w-full h-full bg-[#1A1A1A]">
                {flipbookUrl ? (
                  <iframe 
                    src={`${flipbookUrl}#page/${currentPage}`}
                    allowFullScreen
                    className="w-full h-full border-none transition-opacity duration-300"
                    title="Revista Flipbook 3D"
                  />
                ) : (
                  <iframe 
                    src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(PDF_URL)}#page=${currentPage}`}
                    className="w-full h-full border-none"
                    title="Revista PDF"
                  />
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

