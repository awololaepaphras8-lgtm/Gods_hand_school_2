import React, { useState } from 'react';

export const WhatsAppChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState('General Inquiry');
  const [customMessage, setCustomMessage] = useState("Hello God's Hand International Model School, I would like to make an inquiry.");

  const WHATSAPP_NUMBER = '2348130300837'; // 08130300837
  const DISPLAY_NUMBER = '08130300837';

  const quickOptions = [
    { label: '🎓 Admissions & Enrollment', text: "Hello God's Hand Model School, I would like to inquire about admissions, requirements, and registration for my child." },
    { label: '💰 School Fees & Payments', text: "Hello, I am inquiring about school fees, installment plans, and payment verification." },
    { label: '📋 Child Gate Pass & ID Help', text: "Hello, I need assistance linking my child or with the digital gate attendance QR pass." },
    { label: '📍 School Visit & Direction', text: "Hello, I would like to schedule a visit to the school at Wire and Cable, Apata, Ibadan." }
  ];

  const handleSelectOption = (optionText: string, label: string) => {
    setInquiryType(label);
    setCustomMessage(optionText);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const encoded = encodeURIComponent(customMessage.trim());
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans print:hidden">
      {/* Floating Popup Form */}
      {isOpen && (
        <div className="mb-4 w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-2xl border-2 border-emerald-500 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-emerald-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="God's Hand Logo" 
                  className="w-[80%] h-[80%] object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = 'hands.jpg';
                  }}
                />
              </div>
              <div>
                <h4 className="font-black text-sm tracking-wide font-serif">God's Hand Model School</h4>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-100 font-medium">
                  <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
                  <span>WhatsApp: {DISPLAY_NUMBER}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-emerald-700 text-white transition-colors"
              title="Close chat form"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSend} className="p-5 space-y-4 bg-slate-50/50">
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                Quick Topics:
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {quickOptions.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleSelectOption(opt.text, opt.label)}
                    className={`text-left px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      inquiryType === opt.label 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' 
                        : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                Your Message:
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
                placeholder="Type your message here..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 active:scale-95"
            >
              <span>💬</span>
              <span>Start WhatsApp Chat ({DISPLAY_NUMBER})</span>
            </button>

            <p className="text-[10px] text-center text-slate-400 font-bold">
              Direct line: 08130300837 • Apata, Ibadan
            </p>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl hover:shadow-emerald-500/40 border-2 border-white transition-all transform hover:scale-105 active:scale-95 group"
        title="Chat with God's Hand School on WhatsApp"
      >
        <span className="relative flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
        </span>
        
        {/* WhatsApp Icon */}
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>

        <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">
          WhatsApp: {DISPLAY_NUMBER}
        </span>
      </button>
    </div>
  );
};
