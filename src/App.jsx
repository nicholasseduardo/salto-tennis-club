import React, { useState, useEffect } from 'react';
import { Bell, Users, Activity, Calendar, Coffee, Sparkles, ChevronRight, Trophy, CheckCircle2, X, Clock, MapPin, Hammer, User, TrendingUp, Star, Mail, Lock, ShieldCheck, GraduationCap } from 'lucide-react';
import Logo from '/Logo.svg';
import { supabase } from './supabaseClient'; 

// --- COMPONENTES AUXILIARES ---

const ServiceCard = ({ icon, title, subtitle, onClick }) => (
  <button onClick={onClick} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-amber-500/30 transition-all cursor-pointer group h-full text-left w-full text-slate-100 font-sans">
    <div className="text-amber-400 mb-4 group-hover:scale-110 transition-transform">{icon}</div>
    <p className="text-base font-medium">{title}</p>
    <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{subtitle}</p>
  </button>
);

const TabItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 transition-all px-1.5 py-2 rounded-xl ${active ? 'text-amber-400 bg-amber-400/5 scale-110' : 'text-slate-500 hover:text-slate-400'}`}
  >
    {icon}
    <span className="text-[8px] uppercase tracking-tighter font-bold">{label}</span>
  </button>
);

// --- COMPONENTE PRINCIPAL ---

export default function App() {
  const [isSplash, setIsSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [bookingStep, setBookingStep] = useState('menu'); 
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDate, setSelectedDate] = useState('28 Dez');
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedEndTime, setSelectedEndTime] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [myReservations, setMyReservations] = useState([]);
  const [favMatches, setFavMatches] = useState([]);
  const [selectedLessonLevel, setSelectedLessonLevel] = useState('Todos');
  const [tourneyViewMode, setTourneyViewMode] = useState('list');
  const [partners, setPartners] = useState([]);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Buscar reservas do Supabase ao carregar o App
  useEffect(() => {
    const fetchReservations = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados:', error);
      } else if (data) {
        setMyReservations(data);
      }
    };

    if (isLoggedIn) {
      fetchReservations();
    }
  }, [isLoggedIn]);

  const times = [];
  for(let h=7; h<=22; h++) { 
    times.push(`${h.toString().padStart(2,'0')}:00`); 
    times.push(`${h.toString().padStart(2,'0')}:30`); 
  }

  // MONITOR DE SESSÃO: Detecta login, logout e volta do e-mail
  useEffect(() => {
    // Checa se já existe alguém logado ao abrir o site
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Escuta eventos do Supabase (clique no link do e-mail gera o evento 'SIGNED_IN')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Evento Auth:", event);
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // FUNÇÃO DE CADASTRO
  const handleSignUp = async () => {
    if (!email || !password) return alert("Preencha e-mail e senha");
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        emailRedirectTo: window.location.origin, // Faz o link do e-mail voltar para onde você está
      }
    });

    if (error) return alert("Erro no cadastro: " + error.message);

    if (data?.user) {
      // Cria o perfil na tabela 'profiles'
      await supabase.from('profiles').upsert({ 
        id: data.user.id, 
        full_name: email.split('@')[0],
        updated_at: new Date()
      });
      alert("✅ Quase pronto! Verifique seu e-mail e clique no link para ativar sua conta.");
      setIsSignUp(false);
    }
  };

  // FUNÇÃO DE LOGIN
  const handleLogin = async () => {
    if (!email || !password) return alert("Digite e-mail e senha");
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        alert("E-mail ainda não confirmado! Verifique sua caixa de entrada.");
      } else {
        alert("Dados incorretos ou usuário inexistente.");
      }
    }
  };

  const handleConfirmBooking = async () => {
    const newReservation = {
      service: selectedService,
      category: selectedCategory || selectedService,
      date: selectedDate,
      time: selectedEndTime ? `${selectedTime} - ${selectedEndTime}` : selectedTime,
      court_number: selectedItem ? selectedItem.toString() : null,
      partners: partners // Verifique se este estado 'partners' não está vazio na hora do clique
    };
    

    // Tenta salvar no Supabase
    const { data, error } = await supabase
      .from('reservations')
      .insert([newReservation])
      .select();

    if (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao confirmar reserva. Tente novamente.');
    } else {
      // Se deu certo no banco, atualizamos a tela local
      setMyReservations([data[0], ...myReservations]);
      setShowConfirmation(true);
      setSelectedItem(null);
      setSelectedTime(null);
      setSelectedEndTime(null);
      setPartners([]);
    }
  };

  const handleCancelBooking = async (id) => {
    // 1. Deletar no Supabase
    const { error } = await supabase
      .from('reservations') // Nome exato da sua tabela
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro técnico:', error.message);
      alert('Erro ao apagar no banco: ' + error.message);
    } else {
      // 2. Se deletou no banco, removemos da tela
      setMyReservations(myReservations.filter(res => res.id !== id));
    }
  };

  const toggleFavoriteMatch = (matchName, timeInfo) => {
    if (favMatches.find(m => m.id === matchName)) {
      setFavMatches(favMatches.filter(m => m.id !== matchName));
    } else {
      setFavMatches([...favMatches, { id: matchName, name: matchName, time: timeInfo }]);
    }
  };

  const handleTimeClick = (hora) => {
    if (!selectedTime || (selectedTime && selectedEndTime)) {
      setSelectedTime(hora);
      setSelectedEndTime(null);
    } else {
      const startIdx = times.indexOf(selectedTime);
      const currentIdx = times.indexOf(hora);
      if (currentIdx > startIdx && currentIdx <= startIdx + 4) {
        setSelectedEndTime(hora);
      } else {
        setSelectedTime(hora);
        setSelectedEndTime(null);
      }
    }
  };

  const isTimeDisabled = (hora) => {
    if (!selectedTime || selectedEndTime) return false;
    const startIdx = times.indexOf(selectedTime);
    const currentIdx = times.indexOf(hora);
    return currentIdx < startIdx || currentIdx > startIdx + 4;
  };

  if (isSplash) {
  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
      <img 
        src={Logo} 
        className="w-80 md:w-100 lg:w-120 h-auto animate-pulse transition-all" 
        alt="Salto Tennis Club" 
      />
    </div>
  );
}

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex flex-col px-10 py-12 justify-center space-y-12 animate-in slide-in-from-bottom-10 duration-700 font-sans">
        <div className="space-y-5">
          <h1 className="text-6xl font-extralight text-white tracking-tighter leading-none text-left">
            {isSignUp ? 'Elite' : 'Elite'} <br /> 
            <span className="font-serif italic text-amber-400">{isSignUp ? 'Circle.' : 'Experience.'}</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-[260px] leading-relaxed text-left">
            {isSignUp 
              ? 'Crie sua credencial de sócio para acessar o Salto Tennis Club.' 
              : 'Acesse o portal exclusivo dos sócios Salto Tennis Club.'}
          </p>
        </div>

        <div className="space-y-4">
          {/* INPUTS DE LOGIN / CADASTRO */}
          <div className="space-y-3">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-400 transition-colors" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail de sócio" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-5 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-700 font-sans" 
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-400 transition-colors" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-5 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-700 font-sans" 
              />
            </div>
            <button 
              onClick={isSignUp ? handleSignUp : handleLogin}
              className="w-full py-5 bg-amber-400 text-black font-black uppercase rounded-2xl text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all font-sans"
            >
              {isSignUp ? 'Criar Minha Conta' : 'Acessar Club'}
            </button>
          </div>

          {/* BOTÃO PARA ALTERNAR ENTRE LOGIN E CADASTRO */}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-slate-500 text-[10px] uppercase font-bold tracking-widest hover:text-amber-400 transition-colors font-sans py-2"
          >
            {isSignUp ? 'Já possui uma conta? Fazer Login' : 'Novo por aqui? Criar conta de sócio'}
          </button>

          {/* SÓ MOSTRA OS BOTÕES SOCIAIS SE FOR CADASTRO (isSignUp === true) */}
          {isSignUp && (
            <div className="animate-in fade-in zoom-in duration-500 space-y-6 pt-4">
              <div className="flex items-center gap-4">
                <div className="h-[1px] flex-1 bg-slate-800"></div>
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest font-sans">Ou criar com</span>
                <div className="h-[1px] flex-1 bg-slate-800"></div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <button className="flex items-center justify-center py-4 bg-white/5 border border-slate-800 rounded-2xl hover:bg-white/10 transition-all active:scale-95">
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale" alt="Google" />
                </button>
                <button className="flex items-center justify-center py-4 bg-white/5 border border-slate-800 rounded-2xl hover:bg-white/10 transition-all active:scale-95">
                  <svg viewBox="0 0 384 512" className="w-4 h-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                  </svg>
                </button>
                <button className="flex items-center justify-center py-4 bg-white/5 border border-slate-800 rounded-2xl hover:bg-white/10 transition-all active:scale-95">
                  <img src="https://www.facebook.com/favicon.ico" className="w-4 h-4 grayscale" alt="Facebook" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        if (bookingStep === 'menu') {
          return (
            <div className="space-y-8 animate-in fade-in duration-700 font-sans text-slate-100">
              {/* IA INSIGHT */}
              <div className="bg-gradient-to-br from-amber-900/20 to-slate-900 p-6 rounded-3xl border border-amber-900/30 shadow-2xl text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={18} className="text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">IA Performance Insight</span>
                </div>
                <p className="text-lg text-slate-200 font-light leading-relaxed">
                  Sua fadiga muscular está em <span className="text-amber-400 font-bold">76%</span>. Sugerimos uma <span className="text-amber-400 font-bold">Recovery session</span>.
                </p>
              </div>

              {/* NOVA SEÇÃO: CLUB BULLETIN (AVISOS) */}
              <section className="animate-in slide-in-from-right duration-500 delay-200">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-slate-500 text-xs uppercase tracking-[0.3em] font-bold">Avisos do Clube</h3>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                  </div>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {[
                    { title: "Manutenção de Quadras", text: "Saibro 1 e 2 estarão em manutenção hoje das 12h às 13h.", tag: "Infra" },
                    { title: "Menu de Verão", text: "Novos drinks refrescantes disponíveis no deck do Bistrô.", tag: "Bistrô" },
                    { title: "Inscrições Abertas", text: "Últimas vagas para a Copa Salto de Verão. Garanta já!", tag: "Torneios" }
                  ].map((aviso, idx) => (
                    <div key={idx} className="min-w-[280px] bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-black uppercase tracking-widest">{aviso.tag}</span>
                        <ChevronRight size={14} className="text-slate-700" />
                      </div>
                      <p className="text-sm font-bold text-slate-200">{aviso.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{aviso.text}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* AGENDA */}
              {(myReservations.length > 0 || favMatches.length > 0) && (
                <section className="animate-in slide-in-from-left duration-500 text-left">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-500 text-xs uppercase tracking-[0.3em] font-bold">Sua Agenda</h3>
                    <button onClick={() => setBookingStep('view_reservations')} className="text-amber-400 text-[10px] font-bold uppercase underline">Ver Todos</button>
                  </div>
                  <div className="space-y-3">
                    {myReservations.slice(0, 1).map(res => (
                      <div key={res.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex justify-between items-center">
                          <div className="flex gap-4 items-center font-sans">
                            <div className="w-12 h-12 bg-amber-400/10 rounded-xl flex items-center justify-center text-amber-400 font-bold">{res.date.split(' ')[0]}</div>
                            <div>
                              <p className="text-sm font-bold">{res.category}</p>
                              <p className="text-[10px] text-slate-500 uppercase">{res.time} • {res.detail}</p>
                            </div>
                          </div>
                          <Clock size={16} className="text-slate-700" />
                      </div>
                    ))}
                    {favMatches.map(match => (
                      <div key={match.id} className="bg-slate-900/30 border border-dashed border-amber-400/30 p-5 rounded-2xl flex justify-between items-center font-sans">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-amber-400"><Star size={18} fill="currentColor" /></div>
                          <div>
                            <p className="text-sm font-bold">{match.name}</p>
                            <p className="text-[10px] text-amber-400 uppercase font-bold tracking-tighter">Evento p/ Assistir • {match.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SERVIÇOS */}
              <section className="text-left font-sans">
                <h3 className="text-slate-500 text-xs uppercase tracking-[0.3em] mb-6 font-bold">Serviços Concierge</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-slate-100">
                  <ServiceCard icon={<Calendar size={24} />} title="Quadras" subtitle="Tênis & Padel" onClick={() => { setSelectedService('Quadra'); setBookingStep('category'); }} />
                  <ServiceCard icon={<Sparkles size={24} />} title="Wellness" subtitle="Spa & Fisio" onClick={() => { setSelectedService('Wellness'); setBookingStep('category'); }} />
                  <ServiceCard icon={<Coffee size={24} />} title="Gastronomia" subtitle="Bistrô & Café" onClick={() => { setSelectedService('Gastronomia'); setBookingStep('category'); }} />
                  <ServiceCard icon={<Hammer size={24} />} title="Pro-Shop" subtitle="Equipamentos" onClick={() => { setSelectedService('Equipamentos'); setBookingStep('category'); }} />
                </div>
              </section>
            </div>
          );
        }

        if (bookingStep === 'category') {
          const categories = { 'Quadra': ['Tênis Estádio (Central)', 'Tênis Saibro Coberta', 'Tênis Saibro Aberta', 'Tênis Rápida Coberta', 'Tênis Rápida Aberta', 'Padel', 'Squash', 'Pickleball'], 'Wellness': ['Fisioterapia', 'Massagem', 'Recovery'], 'Gastronomia': ['Mesa Salão', 'Mesa Deck'], 'Equipamentos': ['Encordoamento', 'Troca de Grip'], 'Torneio': ['Simples Masculino A', 'Duplas Open'] };
          return (
            <div className="animate-in slide-in-from-right duration-500 space-y-6 max-w-2xl mx-auto text-left font-sans text-slate-100">
              <button onClick={() => setBookingStep('menu')} className="text-slate-500 flex items-center gap-1 text-sm font-sans font-bold"><ChevronRight size={16} className="rotate-180"/> Voltar</button>
              <h3 className="text-2xl font-light italic text-white font-sans">Selecione o serviço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-100">{categories[selectedService]?.map(cat => (<button key={cat} onClick={() => { setSelectedCategory(cat); setBookingStep('datetime'); }} className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-left flex justify-between items-center hover:border-amber-500/50 group transition-all font-sans"><span className="font-medium text-sm">{cat}</span><ChevronRight size={18} className="text-amber-400 group-hover:translate-x-1 transition-transform font-sans" /></button>))}</div>
            </div>
          );
        }

        if (bookingStep === 'datetime') {
          return (
            <div className="animate-in slide-in-from-right duration-500 space-y-8 max-w-4xl mx-auto text-left font-sans text-slate-100">
              <button onClick={() => setBookingStep('category')} className="text-slate-500 text-sm flex items-center gap-1 font-sans font-bold"><ChevronRight size={16} className="rotate-180"/> Voltar</button>
              <div className="flex justify-between items-end"><div><h3 className="text-2xl font-light italic">Selecione o Período</h3><p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">{selectedCategory}</p></div><div className="text-right"><p className={`text-[10px] font-bold uppercase ${selectedTime && !selectedEndTime ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>{!selectedTime ? 'Início' : !selectedEndTime ? 'Fim (Máx 2h)' : 'Confirmado'}</p></div></div>
              
              {/* DATAS DINÂMICAS GERADAS AUTOMATICAMENTE */}
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide text-slate-100">
                {Array.from({ length: 7 }).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() + i);
                  const dayStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
                  const isToday = i === 0;
                  
                  return (
                    <div 
                      key={dayStr} 
                      onClick={() => setSelectedDate(dayStr)} 
                      className={`min-w-[100px] p-5 rounded-2xl border text-center cursor-pointer transition-all ${selectedDate === dayStr ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-900'}`}
                    >
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">
                        {isToday ? 'Hoje' : date.getFullYear()}
                      </p>
                      <p className="font-bold font-sans uppercase">{dayStr}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-amber-400/20 font-sans">
                {times.map((hora) => {
                  const disabled = isTimeDisabled(hora);
                  const isStart = selectedTime === hora;
                  const isEnd = selectedEndTime === hora;
                  return (
                    <button key={hora} disabled={disabled} onClick={() => handleTimeClick(hora)} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isStart || isEnd ? 'bg-amber-400 border-amber-400 text-black shadow-lg shadow-amber-400/10' : disabled ? 'bg-slate-900/40 border-slate-800/50 text-slate-800 opacity-40 cursor-not-allowed' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}>
                      <div className="flex items-center gap-4 font-sans"><span className="text-xs font-bold font-sans">{hora}</span>{isStart && <span className="text-[9px] uppercase font-black tracking-tighter bg-black text-amber-400 px-2 rounded">Início</span>}{isEnd && <span className="text-[9px] uppercase font-black tracking-tighter bg-black text-amber-400 px-2 rounded">Fim</span>}</div>
                      <div className={`w-2 h-2 rounded-full ${isStart || isEnd ? 'bg-black' : 'bg-slate-800'}`}></div>
                    </button>
                  );
                })}
              </div>
              <button disabled={!selectedTime || !selectedEndTime} onClick={() => setBookingStep(selectedService === 'Quadra' ? 'courts' : 'confirm')} className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${selectedTime && selectedEndTime ? 'bg-amber-400 text-black shadow-2xl font-sans' : 'bg-slate-900 text-slate-600 cursor-not-allowed font-sans'}`}>Continuar</button>
            </div>
          );
        }

        if (bookingStep === 'courts') {
          const counts = { 'Tênis Estádio (Central)': 1, 'Tênis Saibro Coberta': 2, 'Tênis Saibro Aberta': 2, 'Tênis Rápida Coberta': 2, 'Tênis Rápida Aberta': 1, 'Padel': 4, 'Squash': 3, 'Pickleball': 3 };
          return (
            <div className="animate-in zoom-in-95 duration-500 space-y-8 text-left pb-24 text-slate-100 font-sans">
              <button onClick={() => setBookingStep('datetime')} className="text-slate-500 text-sm flex items-center gap-1 font-sans font-bold"><ChevronRight size={16} className="rotate-180"/> Voltar</button>
              <div className="flex justify-between items-end font-sans"><h3 className="text-2xl font-light italic text-white font-sans">Escolha sua Quadra</h3><span className="text-[9px] bg-amber-400 text-black px-3 py-1 rounded-full font-bold uppercase tracking-widest font-sans">{selectedCategory}</span></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 font-sans">
                {Array.from({ length: counts[selectedCategory] || 1 }).map((_, i) => (
                  <div key={i} onClick={() => { setSelectedItem(i+1); setBookingStep('confirm'); }} className="flex flex-col items-center gap-2 group cursor-pointer font-sans"><span className="text-[10px] text-slate-500 font-bold uppercase font-sans">Unidade {i+1}</span><div className="w-full h-32 rounded-2xl border-2 border-emerald-500/30 bg-emerald-900/10 hover:border-amber-400 transition-all flex items-center justify-center text-[8px] font-black text-emerald-500 uppercase tracking-widest">Livre</div></div>
                ))}
              </div>
            </div>
          );
        }

        if (bookingStep === 'confirm') {
          return (
            <div className="animate-in fade-in duration-500 max-w-md mx-auto text-left font-sans text-slate-100">
              <h3 className="text-2xl font-light mb-6 italic text-center text-white">Detalhes da Reserva</h3>
              
              {/* CARD DE RESUMO DOS DADOS */}
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6 shadow-2xl mb-6">
                <div className="flex justify-between border-b border-white/5 pb-3 font-sans">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Serviço</span>
                  <span className="text-amber-400 font-bold text-sm">{selectedCategory}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-3 font-sans">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Data e Hora</span>
                  <span className="text-slate-100 font-medium text-sm">
                    {selectedDate} • {selectedTime} {selectedEndTime ? `até ${selectedEndTime}` : ''}
                  </span>
                </div>
                {selectedItem && (
                  <div className="flex justify-between border-b border-white/5 pb-3 font-sans">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Local</span>
                    <span className="text-slate-100 font-medium text-sm">Unidade #{selectedItem}</span>
                  </div>
                )}
              </div>

              {/* SEÇÃO DE PARCEIROS / CONVIDADOS */}
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">
                    Jogadores ({partners.length + 1}/4)
                  </h4>
                  <span className="text-[10px] text-slate-700 font-bold uppercase tracking-widest italic">
                    Obrigatório para Padel
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-2 font-sans">
                  {/* CARD DO SÓCIO PRINCIPAL */}
                  <div className="flex items-center gap-3 p-3 bg-amber-400/5 border border-amber-400/20 rounded-2xl">
                    <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-black font-bold text-xs shadow-lg">
                      FF
                    </div>
                    <span className="text-sm font-bold text-white italic">Fernando Fontolan (Você)</span>
                  </div>

                  {/* LISTA DE PARCEIROS ADICIONADOS */}
                  {partners.map((p, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl animate-in slide-in-from-right duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs border border-white/5 uppercase">
                          {p.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-200">{p}</span>
                      </div>
                      <button 
                        onClick={() => setPartners(partners.filter((_, i) => i !== idx))} 
                        className="text-red-500/30 hover:text-red-500 transition-colors p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {/* CAMPO DE ENTRADA PARA NOVOS CONVIDADOS */}
                  {partners.length < 3 && (
                    <div className="relative mt-2">
                      <input 
                        type="text" 
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Nome do parceiro..."
                        className="w-full bg-black border border-slate-800 rounded-2xl py-4 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-700"
                        onKeyPress={(e) => {
                          if(e.key === 'Enter' && guestName.trim()) {
                            setPartners([...partners, guestName.trim()]);
                            setGuestName("");
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if(guestName.trim()) {
                            setPartners([...partners, guestName.trim()]);
                            setGuestName("");
                          }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-black active:scale-90 transition-transform shadow-lg"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTÃO FINALIZAR */}
              <button 
                onClick={handleConfirmBooking} 
                className="w-full py-5 bg-amber-400 text-black font-black uppercase rounded-2xl text-xs tracking-widest active:scale-95 shadow-2xl transition-all font-sans"
              >
                Finalizar Solicitação
              </button>
            </div>
          );
        }

        if (bookingStep === 'view_reservations') {
          return (
            <div className="animate-in slide-in-from-right duration-500 text-left space-y-6 max-w-2xl mx-auto font-sans text-slate-100">
              <button onClick={() => setBookingStep('menu')} className="text-slate-500 flex items-center gap-1 text-sm font-sans font-bold">
                <ChevronRight size={16} className="rotate-180"/> Voltar
              </button>
              <h3 className="text-2xl font-light italic text-white font-sans">Seus Agendamentos</h3>
              <div className="space-y-4">
                {myReservations.map(res => (
                  <div key={res.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex justify-between items-center group font-sans text-slate-100">
                    <div className="flex items-center gap-4 font-sans">
                      <div className="p-3 bg-amber-400/10 rounded-full text-amber-400 font-bold text-xs">
                        {res.date.split(' ')[0]}
                      </div>
                      <div>
                        <p className="font-bold">{res.category}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">{res.date} • {res.time}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleCancelBooking(res.id)} 
                      className="text-[10px] font-bold text-red-500/40 uppercase hover:text-red-500 transition-colors font-sans"
                    >
                      Cancelar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;

      case 'tournaments':
        if (tourneyViewMode === 'bracket') {
          return (
            <div className="space-y-8 animate-in zoom-in-95 duration-500 text-left font-sans text-slate-100 pb-10">
              <div className="flex justify-between items-center font-sans"><button onClick={() => setTourneyViewMode('list')} className="text-slate-500 text-sm flex items-center gap-1 font-bold font-sans"><ChevronRight size={16} className="rotate-180 font-sans"/> Voltar</button><span className="text-[10px] bg-amber-400 text-black px-3 py-1 rounded-full font-black uppercase tracking-tighter font-sans">Copa Salto de Verão</span></div>
              <div className="space-y-12 overflow-x-auto pb-8 scrollbar-hide font-sans"><section className="space-y-6 min-w-[280px] font-sans"><h4 className="text-[9px] text-slate-600 uppercase font-black tracking-[0.3em] pl-2 border-l border-amber-400 font-sans">Oitavas de Final</h4><div className="space-y-4 font-sans">
                    {[{ p1: 'Fernando F.', p2: 'Ricardo S.', score: '6/4 6/2', winner: 'Fernando F.' }, { p1: 'Marcos L.', p2: 'Bruno A.', score: '7/5 6/3', winner: 'Marcos L.' }, { p1: 'Alexandre T.', p2: 'Luís M.', score: 'Em Jogo', winner: null }].map((match, i) => (
                      <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl font-sans"><div className={`p-3 border-b border-white/5 flex justify-between items-center ${match.winner === match.p1 ? 'bg-amber-400/5' : ''}`}><span className={`text-xs ${match.winner === match.p1 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>{match.p1}</span>{match.winner === match.p1 && <CheckCircle2 size={12} className="text-amber-400 font-sans"/>}</div><div className={`p-3 flex justify-between items-center ${match.winner === match.p2 ? 'bg-amber-400/5' : ''}`}><span className={`text-xs ${match.winner === match.p2 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>{match.p2}</span>{match.winner === match.p2 && <CheckCircle2 size={12} className="text-amber-400 font-sans"/>}</div><div className="bg-black/40 px-3 py-1.5 flex justify-between items-center font-sans"><span className="text-[8px] text-slate-600 font-bold uppercase font-sans">Resultado</span><span className="text-[10px] font-mono text-amber-400/80 font-sans">{match.score}</span></div></div>
                    ))}
                  </div></section><section className="space-y-6 min-w-[280px] opacity-50 font-sans"><h4 className="text-[9px] text-slate-600 uppercase font-black tracking-[0.3em] pl-2 border-l border-slate-800 font-sans">Quartas de Final</h4><div className="p-8 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center font-sans"><Clock size={24} className="text-slate-700 mb-2 font-sans"/><p className="text-[10px] text-slate-600 uppercase font-bold font-sans">Aguardando rodada</p></div></section></div>
            </div>
          );
        }
        return (
          <div className="space-y-8 animate-in slide-in-from-right duration-500 text-left font-sans text-slate-100">
            <div><h3 className="text-2xl font-light italic text-white font-sans">Torneios & Eventos</h3><p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold font-sans">Inscrições e Chaves</p></div>
            <section className="space-y-4 font-sans"><h4 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold font-sans">Inscrições Abertas</h4><div className="bg-slate-900 border-l-4 border-amber-400 p-6 rounded-r-2xl space-y-4 shadow-xl font-sans"><div className="flex justify-between items-start font-medium text-white font-sans"><div><p className="text-lg font-sans">Copa Salto de Verão</p><p className="text-[10px] text-amber-400 uppercase font-bold font-sans">Simples Masculino A</p></div><Trophy size={18} className="text-amber-400 font-sans" /></div><div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase font-sans"><span>15-20 Jan</span><span>Premiação: R$ 5.000</span></div><div className="grid grid-cols-2 gap-3 pt-2 font-sans font-sans font-sans"><button onClick={() => { setSelectedService('Torneio'); setSelectedCategory('Copa Salto de Verão'); setSelectedTime('08:00'); setSelectedDate('15 Jan'); setBookingStep('confirm'); setActiveTab('Home'); }} className="py-3 bg-white text-black text-[9px] font-black uppercase rounded-lg tracking-widest hover:bg-amber-400 shadow-lg font-sans font-sans font-sans">Garantir Inscrição</button><button onClick={() => setTourneyViewMode('bracket')} className="py-3 bg-slate-800 text-slate-300 text-[9px] font-black uppercase rounded-lg tracking-widest border border-slate-700 font-sans font-sans font-sans">Visualizar Chave</button></div></div></section>
            <section className="space-y-4 pt-4 font-sans"><h4 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold font-sans">Para assistir</h4><div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex justify-between items-center group hover:border-amber-400/30 transition-all font-sans text-slate-100 font-sans"><div><p className="text-slate-100 font-medium italic group-hover:text-amber-400 transition-colors font-sans">Exibição Pro: Alexandre vs. Luís</p><p className="text-xs text-slate-500 mt-1 uppercase tracking-tighter font-sans">22 Jan • 19:30</p></div><button onClick={() => toggleFavoriteMatch("Exibição Pro: Alexandre vs. Luís", "22 Jan • 19:30")} className={`p-3 rounded-xl transition-all ${favMatches.find(m => m.id === "Exibição Pro: Alexandre vs. Luís") ? 'bg-amber-400 text-black' : 'bg-slate-800 text-amber-400'}`}><Star size={20} fill={favMatches.find(m => m.id === "Exibição Pro: Alexandre vs. Luís") ? "currentColor" : "none"} /></button></div></section>
          </div>
        );

      case 'lessons':
        const instructors = [{ name: 'Jair', level: 'Competitivo', specialty: 'Alta Performance', rating: '5.0', students: '22'}, { name: 'Ricardo Santos', level: 'Competitivo', specialty: 'Saibro / Alta Performance', rating: '4.9', students: '32' }, { name: 'Gabriel Medeiros', level: 'Iniciante', specialty: 'Fundamentos', rating: '5.0', students: '27'}, { name: 'Marcos Lima', level: 'Intermediário', specialty: 'Tática de Duplas', rating: '4.8', students: '25' }, { name: 'Armando Marques', level: 'Iniciante', specialty: 'Fundamentos & Técnica', rating: '4.9', students: '17'}, { name: 'Bruno Aguiar', level: 'Intermediário', specialty: 'Saque', rating: '4.6', students: '12'}, { name: 'Gabriela Passos', level: 'Intermediário', specialty: 'Preparação Física', rating: '4.7', students: '33'}, { name: 'Ana Paula', level: 'Iniciante', specialty: 'Fundamentos & Técnica', rating: '5.0', students: '40' }, { name: 'Felipe Costa', level: 'Competitivo', specialty: 'Preparação Física', rating: '4.7', students: '18' }];
        const filteredInstructors = selectedLessonLevel === 'Todos' ? instructors : instructors.filter(i => i.level === selectedLessonLevel);
        return (
          <div className="space-y-8 animate-in slide-in-from-right duration-500 text-left font-sans text-slate-100 font-sans text-slate-100">
            <div><h3 className="text-2xl font-light italic text-white italic font-sans font-sans">Aulas & Treinamento</h3><p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold font-sans font-sans">Evolua seu jogo com profissionais</p></div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide text-slate-100 font-sans font-sans">{['Todos', 'Iniciante', 'Intermediário', 'Competitivo'].map(level => (<button key={level} onClick={() => setSelectedLessonLevel(level)} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase border transition-all font-sans font-sans ${selectedLessonLevel === level ? 'bg-amber-400 border-amber-400 text-black shadow-lg font-sans' : 'bg-slate-900 border-slate-800 text-slate-500 font-sans'}`}>{level}</button>))}</div>
            <div className="grid grid-cols-1 gap-4 font-sans text-slate-100 font-sans">
              {filteredInstructors.map((prof, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center group hover:border-amber-400/30 transition-all font-sans font-sans"><div className="space-y-3 font-sans"><div className="flex items-center gap-3 font-sans"><div className="w-12 h-12 bg-gradient-to-tr from-amber-600 to-amber-300 rounded-full flex items-center justify-center text-black font-serif italic text-lg font-bold font-sans">{prof.name.split(' ').map(n => n[0]).join('')}</div><div><p className="text-white font-bold font-sans font-sans">{prof.name}</p><span className="text-[9px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20 uppercase font-black font-sans">{prof.level}</span></div></div><div className="space-y-1 font-sans font-sans font-sans font-sans"><p className="text-xs text-slate-400 italic font-sans">{prof.specialty}</p><div className="flex gap-4 text-[9px] text-slate-500 font-bold uppercase tracking-tighter font-sans font-sans font-sans font-sans font-sans"><span className="flex items-center gap-1 font-sans font-sans font-sans"><Star size={12} fill="currentColor" className="text-amber-400 font-sans" /> {prof.rating}</span><span className="flex items-center gap-1 font-sans font-sans font-sans"><Users size={12} font-sans /> {prof.students} Alunos</span></div></div></div><button onClick={() => { setSelectedService('Aula'); setSelectedCategory(`Aula com ${prof.name}`); setBookingStep('datetime'); setActiveTab('Home'); }} className="p-4 bg-white text-black rounded-2xl hover:bg-amber-400 transition-colors active:scale-90 font-sans font-sans"><ChevronRight size={20} font-sans /></button></div>
              ))}
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500 text-left font-sans text-slate-100 font-sans text-slate-100">
            <section className="space-y-4 text-left font-sans font-sans font-sans font-sans"><h3 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold font-sans font-sans">No Clube Agora</h3><div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide font-sans font-sans">{[{ name: 'Ricardo', img: 'RS', status: 'Quadra 2' }, { name: 'Bruna', img: 'BG', status: 'Wellness' }, { name: 'Marcos', img: 'ML', status: 'Bistrô' }, { name: 'Ana', img: 'AP', status: 'Quadra 5' }, { name: 'Felipe', img: 'FC', status: 'Quadra 1' }].map((socio, i) => (<div key={i} className="flex flex-col items-center gap-2 min-w-[70px] font-sans font-sans"><div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 p-[2px] font-sans font-sans font-sans"><div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold border-2 border-black text-white font-sans font-sans font-sans font-sans font-sans">{socio.img}</div></div><span className="text-[10px] text-white font-medium font-sans font-sans font-sans">{socio.name}</span><span className="text-[8px] text-amber-500/80 uppercase font-bold tracking-tighter font-sans font-sans font-sans font-sans">{socio.status}</span></div>))}</div></section>
            <section className="space-y-4 text-left font-sans font-sans font-sans font-sans font-sans"><div className="flex justify-between items-center font-sans font-sans font-sans"><h3 className="text-slate-500 text-[10px] uppercase tracking-widest font-bold font-sans font-sans font-sans">Procurando Parceiro</h3><button className="text-amber-400 text-[10px] font-bold uppercase font-sans font-sans font-sans font-sans">+ Publicar</button></div><div className="space-y-3 font-sans font-sans font-sans">
                {[{ user: 'Marcos L.', level: '4.5', time: 'Hoje, 19:00', type: 'Tênis Saibro', need: 'Falta 1 p/ Duplas' }, { user: 'Ana P.', level: '3.5', time: 'Amanhã, 08:30', type: 'Padel', need: 'Treino Individual' }].map((match, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center group hover:border-amber-400/30 transition-all text-slate-100 font-sans font-sans font-sans"><div><div className="flex items-center gap-2 font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans font-sans"><span className="text-xs font-bold text-white font-sans font-sans font-sans font-sans font-sans">{match.user}</span><span className="text-[9px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20 font-sans font-sans font-sans font-sans">Nível {match.level}</span></div><p className="text-sm text-slate-300 font-medium font-sans font-sans font-sans font-sans">{match.need}</p><div className="flex gap-3 text-[10px] text-slate-500 uppercase font-bold font-sans font-sans font-sans font-sans"><span>{match.type}</span><span>{match.time}</span></div></div><button className="px-4 py-2 bg-white text-black text-[10px] font-black uppercase rounded-xl hover:bg-amber-400 transition-colors font-sans font-sans font-sans font-sans">Solicitar</button></div>
                ))}
              </div>
            </section>
          </div>
        );

      case 'health':
        return (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500 font-sans text-left pb-10">
            {/* CABEÇALHO ANALYTICS */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-light italic text-white italic">Biometria & Performance</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Sincronizado com Smartwatch há 5 min</p>
              </div>
              <div className="p-2 bg-amber-400/10 rounded-lg border border-amber-400/20 text-amber-400">
                <Activity size={20} className="animate-pulse" />
              </div>
            </div>

            {/* ANÉIS DE STATUS - LUXURY STYLE */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-4 border-amber-400 border-t-transparent -rotate-45 group-hover:rotate-45 transition-all duration-1000"></div>
                   <div className="text-center">
                     <p className="text-2xl font-light text-white italic leading-none">76%</p>
                     <p className="text-[7px] text-slate-500 uppercase font-black mt-1 tracking-tighter">Recuperação</p>
                   </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="w-24 h-24 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                   <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-l-transparent rotate-90 group-hover:-rotate-90 transition-all duration-1000"></div>
                   <div className="text-center">
                     <p className="text-2xl font-light text-white italic leading-none">Optimal</p>
                     <p className="text-[7px] text-slate-500 uppercase font-black mt-1 tracking-tighter">Carga Semanal</p>
                   </div>
                </div>
              </div>
            </div>

            {/* WIDGETS RÁPIDOS */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Em Quadra', val: '12h', unit: 'esta semana', color: 'text-amber-400' },
                { label: 'Batimentos', val: '58', unit: 'bpm repouso', color: 'text-white' },
                { label: 'Sono', val: '7h 45m', unit: 'qualidade alta', color: 'text-white' }
              ].map((item, i) => (
                <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                  <p className="text-[7px] text-slate-500 uppercase font-black mb-1">{item.label}</p>
                  <p className={`text-lg font-light italic ${item.color}`}>{item.val}</p>
                  <p className="text-[6px] text-slate-600 uppercase font-bold">{item.unit}</p>
                </div>
              ))}
            </div>

            {/* GRÁFICO DE FADIGA MUSCULAR */}
            <section className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem]">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Nível de Stress Muscular</h4>
                <div className="flex items-center gap-1.5 text-[8px] text-emerald-500 font-bold uppercase">
                   <TrendingUp size={12} /> Estável
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-24 px-2">
                {[30, 45, 80, 50, 40, 75, 90, 60, 40, 35, 55, 76].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-800 rounded-full relative group transition-all">
                    <div 
                      style={{ height: `${h}%` }} 
                      className={`w-full rounded-full transition-all duration-1000 ${h > 75 ? 'bg-amber-400' : 'bg-slate-600'}`}
                    ></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[7px] text-slate-600 font-bold uppercase tracking-widest px-1">
                <span>07:00</span><span>12:00</span><span>17:00</span><span>22:00</span>
              </div>
            </section>

            {/* BOTÃO DE AÇÃO */}
            <button className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
              Gerar Relatório PDF Mensal
            </button>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-8 animate-in slide-in-from-right duration-500 text-left font-sans text-slate-100">
            {/* ... seu código existente do perfil ... */}
            
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setIsLoggedIn(false);
              }}
              className="w-full py-4 border border-red-500/20 text-red-500 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all"
            >
              Sair da Conta (Logout)
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans selection:bg-amber-400 selection:text-black text-left">
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 animate-in zoom-in-95 duration-500 text-center font-sans">
          <CheckCircle2 size={80} className="text-emerald-500 mb-8 shadow-[0_0_50px_rgba(16,185,129,0.2)]" /><h2 className="text-4xl font-light italic mb-3 text-white italic text-center font-sans font-serif font-bold tracking-tighter">Confirmado!</h2><p className="text-slate-400 text-sm text-center mb-12 max-w-xs leading-relaxed mx-auto font-sans">Solicitação registrada com sucesso. Verifique sua agenda na página inicial.</p><button onClick={() => {setShowConfirmation(false); setBookingStep('menu'); setActiveTab('Home');}} className="w-full max-w-xs py-5 border border-slate-700 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white hover:text-black transition-all shadow-xl font-sans text-slate-100">Ok, Entendido</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col min-h-screen relative text-slate-100">
        <header className="p-6 md:p-10 pt-12 flex justify-between items-center shrink-0 font-sans">
          <div className="text-left font-sans"><p className="text-amber-400/60 text-[10px] uppercase tracking-[0.4em] mb-2 font-bold italic text-left">Salto Tennis Club</p><h1 className="text-3xl md:text-4xl font-extralight tracking-tighter uppercase tracking-widest text-white text-left italic font-bold">{activeTab === 'profile' ? 'Performance' : activeTab === 'tournaments' ? 'Torneios' : activeTab === 'social' ? 'Social' : activeTab === 'health' ? 'Analytics' : activeTab === 'lessons' ? 'Aulas' : 'Home'}</h1></div>
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 relative group cursor-pointer hover:border-amber-400 transition-colors font-sans"><Bell size={24} className="text-slate-400 group-hover:text-amber-400 transition-colors font-sans" />{(myReservations.length > 0 || favMatches.length > 0) && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-slate-900 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]"></span>}</div>
        </header>

        <main className="flex-1 px-6 md:px-10 pb-44 text-left font-sans">{renderContent()}</main>

        <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center z-50 font-sans">
            <nav className="w-full max-w-xl bg-slate-900/95 backdrop-blur-3xl border border-white/10 px-3 py-4 rounded-3xl flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] font-sans">
                <TabItem icon={<Calendar size={18} />} label="Home" active={activeTab === 'Home'} onClick={() => {setActiveTab('Home'); setBookingStep('menu');}} />
                <TabItem icon={<Trophy size={18} />} label="Play" active={activeTab === 'tournaments'} onClick={() => setActiveTab('tournaments')} />
                <TabItem icon={<GraduationCap size={18} />} label="Aulas" active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} />
                <TabItem icon={<Users size={18} />} label="Social" active={activeTab === 'social'} onClick={() => setActiveTab('social')} />
                <TabItem icon={<Activity size={18} />} label="Saúde" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
                <TabItem icon={<User size={18} />} label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
            </nav>
        </div>
      </div>
    </div>
  );
}