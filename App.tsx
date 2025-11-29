import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Chatbot from './pages/Chatbot';
import DestinationDetails from './pages/DestinationDetails';
import DestinationCard from './components/DestinationCard';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Notification, { NotificationType } from './components/Notification';
import { ViewState, Destination, User as UserType } from './types';
import { MOCK_DESTINATIONS } from './services/mockData';
import { AuthService } from './services/authService';
import { Search, Map, Calendar, Users, MapPin, ArrowUpRight, User } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = ["All", "Beach", "Mountain", "City", "Cultural", "Nature", "Luxury", "Budget Friendly"];

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.HOME);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  
  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState("All");
  
  // Booking Context States (passed from Home -> Details)
  const [searchDate, setSearchDate] = useState('');
  const [searchGuests, setSearchGuests] = useState('');

  // Global Auth State
  const [user, setUser] = useState<UserType | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Global Notification State
  const [notification, setNotification] = useState<{ message: string; type: NotificationType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type, isVisible: true });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isVisible: false }));
  };

  // Check for existing session on load using Firebase Listener
  useEffect(() => {
    // AuthService.subscribeToAuth sets up a real-time listener on the Firestore document
    const unsubscribe = AuthService.subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDestinationClick = (dest: Destination) => {
    setSelectedDestination(dest);
    setView(ViewState.DETAILS);
  };

  const toggleVisited = async (id: string) => {
    if (!user) {
      setView(ViewState.LOGIN);
      return;
    }
    const isVisited = user.visitedPlaces.includes(id);
    try {
      await AuthService.toggleVisited(user.uid, id, isVisited);
      if (!isVisited) {
        showNotification("Added to your Travel Log!", "success");
      }
    } catch (error) {
      console.error("Failed to update visited places", error);
      showNotification("Failed to update status", "error");
    }
  };

  const toggleWishlist = async (id: string) => {
    if (!user) {
      setView(ViewState.LOGIN);
      return;
    }
    const isWishlisted = user.wishlist.includes(id);
    try {
      await AuthService.toggleWishlist(user.uid, id, isWishlisted);
      if (!isWishlisted) {
        showNotification("Added to Wishlist", "success");
      } else {
        showNotification("Removed from Wishlist", "info");
      }
    } catch (error) {
      console.error("Failed to update wishlist", error);
      showNotification("Failed to update wishlist", "error");
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    setView(ViewState.LOGIN); 
    showNotification("Logged out successfully", "info");
  };

  const handleAuthSuccess = (authenticatedUser: UserType) => {
    setUser(authenticatedUser);
    setView(ViewState.DASHBOARD); 
    showNotification(`Welcome back, ${authenticatedUser.name}!`, "success");
  };
  
  const handleHomeSearch = () => {
    setView(ViewState.EXPLORE);
  };

  const filteredDestinations = MOCK_DESTINATIONS.filter(d => {
    const matchesCategory = activeCategory === "All" || 
                           d.category === activeCategory ||
                           (activeCategory === "Budget Friendly" && d.price <= 1500);
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         d.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderContent = () => {
    switch (view) {
      case ViewState.LOGIN:
        return (
          <Login 
            onLoginSuccess={handleAuthSuccess} 
            onSwitchToRegister={() => setView(ViewState.REGISTER)} 
          />
        );

      case ViewState.REGISTER:
        return (
          <Register 
            onRegisterSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setView(ViewState.LOGIN)}
          />
        );

      case ViewState.CHATBOT:
        return <Chatbot />;
      
      case ViewState.DETAILS:
        return selectedDestination ? (
          <DestinationDetails 
            destination={selectedDestination} 
            onBack={() => setView(ViewState.EXPLORE)}
            isVisited={user?.visitedPlaces.includes(selectedDestination.id) || false}
            isWishlisted={user?.wishlist.includes(selectedDestination.id) || false}
            onToggleVisited={() => toggleVisited(selectedDestination.id)}
            onToggleWishlist={() => toggleWishlist(selectedDestination.id)}
            user={user}
            initialDate={searchDate}
            initialGuests={searchGuests}
            onLoginReq={() => setView(ViewState.LOGIN)}
            onBookingSuccess={() => {
              setView(ViewState.DASHBOARD);
              showNotification("Adventure Booked! Packing your bags...", "success");
            }}
            notify={showNotification}
          />
        ) : (
          setView(ViewState.EXPLORE)
        );

      case ViewState.DASHBOARD:
        return (
          <ProtectedRoute 
            user={user} 
            loading={authLoading}
            onRedirect={() => setView(ViewState.LOGIN)}
          >
             {user && (
               <Dashboard 
                 user={user} 
                 allDestinations={MOCK_DESTINATIONS}
                 onDestinationClick={handleDestinationClick}
                 onToggleVisited={toggleVisited}
                 onToggleWishlist={toggleWishlist}
                 notify={showNotification}
               />
             )}
          </ProtectedRoute>
        );

      case ViewState.EXPLORE:
        return (
          <div className="min-h-screen pt-28 pb-12 px-4 max-w-7xl mx-auto">
             <div className="flex flex-col gap-8 mb-12">
               <div className="text-center max-w-2xl mx-auto">
                 <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">Find Your Escape</h1>
                 <p className="text-gray-400 text-base leading-relaxed">30+ curated destinations. Real reviews from real travelers. Filter by mood, budget, or vibe.</p>
               </div>

               {/* Filters & Search */}
               <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                     <input 
                       type="text" 
                       placeholder="Search by destination name or country... (e.g., Bali, Thailand, Kyoto)" 
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full bg-white/8 border border-white/15 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all placeholder-gray-500"
                     />
                  </div>
                  
                  {/* Category Filters */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                     {CATEGORIES.map(cat => (
                        <motion.button 
                           key={cat}
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                           onClick={() => setActiveCategory(cat)}
                           className={`px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                              activeCategory === cat 
                              ? 'bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-lg shadow-primary-500/25' 
                              : 'bg-white/8 border border-white/15 text-gray-300 hover:bg-white/12 hover:border-white/25'
                           }`}
                        >
                           {cat}
                        </motion.button>
                     ))}
                  </div>

                  {/* Results Count */}
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-400">Showing <span className="font-bold text-white">{filteredDestinations.length}</span> destinations</p>
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="text-gray-400 hover:text-white text-xs font-medium transition-colors"
                      >
                        Clear search ✕
                      </button>
                    )}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDestinations.map(dest => (
                <DestinationCard 
                  key={dest.id} 
                  destination={dest} 
                  onClick={() => handleDestinationClick(dest)}
                  isVisited={user?.visitedPlaces.includes(dest.id)}
                  isWishlisted={user?.wishlist.includes(dest.id)}
                  onToggleVisited={(e) => {
                    e?.stopPropagation();
                    toggleVisited(dest.id);
                  }}
                  onToggleWishlist={(e) => {
                    e?.stopPropagation();
                    toggleWishlist(dest.id);
                  }}
                />
              ))}
            </div>
            
            {filteredDestinations.length === 0 && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="text-center py-20 px-4"
               >
                  <p className="text-5xl mb-4">🔍</p>
                  <p className="text-gray-400 text-lg mb-4">No destinations match your search</p>
                  <p className="text-gray-500 text-sm mb-6">Try different keywords or explore all categories</p>
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setActiveCategory('All');
                    }}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Reset Filters
                  </button>
               </motion.div>
            )}
          </div>
        );

      case ViewState.HOME:
      default:
        return (
          <div className="min-h-screen">
            {/* Hero Section */}
            <div className="relative min-h-screen flex items-center justify-center px-4 pt-20 overflow-hidden">
              <div className="absolute inset-0">
                <img 
                  src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
                  alt="Hero Background"
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/70 via-[#0f172a]/50 to-[#0f172a]" />
                <div className="absolute inset-0 hero-gradient opacity-60 mix-blend-overlay" />
              </div>
              
              <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
                <motion.div 
                   initial={{ y: -20, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ duration: 0.8 }}
                   className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8"
                >
                  <Map size={14} className="text-secondary-500" />
                  <span className="text-xs font-bold tracking-widest text-gray-200 uppercase">Explore the world with AI</span>
                </motion.div>
                
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight"
                >
                  Discover Your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-400">
                    Next Adventure
                  </span>
                </motion.h1>
                
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-lg md:text-lg text-gray-300 mb-10 max-w-2xl font-light leading-relaxed"
                >
                  Real places. Honest recommendations. AI-powered planning. Let's find your perfect destination together.
                </motion.p>

                {/* Search Bar Widget - Functional Now */}
                <motion.div 
                   initial={{ y: 30, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ delay: 0.6, duration: 0.8 }}
                   className="w-full max-w-4xl glass-panel p-2.5 rounded-xl hidden md:flex items-center shadow-2xl shadow-primary-500/10"
                >
                   <div className="flex-1 px-5 py-3 border-r border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                         <MapPin size={16} className="text-gray-400" />
                         <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Where</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Bali, Paris, Tokyo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent text-white font-medium w-full focus:outline-none placeholder-gray-500 text-sm" 
                      />
                   </div>
                   <div className="flex-1 px-5 py-3 border-r border-white/10">
                      <div className="flex items-center gap-2 mb-1">
                         <Calendar size={16} className="text-gray-400" />
                         <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">When</span>
                      </div>
                      <input 
                        type="date" 
                        value={searchDate}
                        onChange={(e) => setSearchDate(e.target.value)}
                        className="bg-transparent text-white font-medium w-full focus:outline-none placeholder-gray-500 text-sm [color-scheme:dark]" 
                      />
                   </div>
                   <div className="flex-1 px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                         <Users size={16} className="text-gray-400" />
                         <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Guests</span>
                      </div>
                      <input 
                        type="number" 
                        placeholder="1" 
                        min="1"
                        value={searchGuests}
                        onChange={(e) => setSearchGuests(e.target.value)}
                        className="bg-transparent text-white font-medium w-full focus:outline-none placeholder-gray-500 text-sm" 
                      />
                   </div>
                   <button 
                     onClick={handleHomeSearch}
                     className="bg-gradient-to-r from-primary-600 to-secondary-500 hover:from-primary-500 hover:to-secondary-400 text-white rounded-lg p-3 transition-all shadow-lg shadow-primary-500/25"
                   >
                      <Search size={20} />
                   </button>
                </motion.div>
                
                {/* Mobile CTA */}
                 <motion.button 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => setView(ViewState.EXPLORE)}
                    className="md:hidden w-full px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-500 text-white rounded-lg font-bold text-lg shadow-lg shadow-primary-500/25"
                  >
                    Let's Explore
                  </motion.button>
              </div>
            </div>

            {/* Promo Section */}
            <div className="py-20 bg-white/5 backdrop-blur-sm border-y border-white/10">
               <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
                  <div className="flex-1">
                     <h2 className="text-4xl md:text-4xl font-bold text-white mb-4">Meet TravelMate AI</h2>
                     <p className="text-gray-300 text-lg mb-8 leading-relaxed">Your personal travel assistant that understands your style. Get custom itineraries, real budget breakdowns, and recommendations only locals know about.</p>
                     <div className="flex gap-4 flex-wrap">
                       <button 
                          onClick={() => setView(ViewState.CHATBOT)}
                          className="px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-500 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-primary-500/25 transition-all"
                       >
                          Try AI Planner
                       </button>
                       {!user && (
                         <button 
                           onClick={() => setView(ViewState.REGISTER)}
                           className="px-8 py-3 bg-white/15 text-white border border-white/25 rounded-lg font-bold hover:bg-white/25 transition-all flex items-center gap-2"
                         >
                            Sign Up <ArrowUpRight size={18} />
                         </button>
                       )}
                     </div>
                  </div>
                  <div className="flex-1 flex justify-center">
                     <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 blur-3xl opacity-15 rounded-3xl" />
                        <div className="relative bg-gradient-to-br from-white/10 to-white/5 p-6 rounded-2xl border border-white/20 max-w-sm backdrop-blur-md">
                           <div className="flex gap-3 mb-4">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                                 <span className="text-white text-xs font-bold">AI</span>
                              </div>
                              <div className="bg-white/10 p-3 rounded-lg rounded-tl-none text-sm text-gray-200 border border-white/10">
                                 I'm thinking a 4-day itinerary to Kyoto with tea ceremonies and quiet temples? ☕
                              </div>
                           </div>
                           <div className="flex gap-3 flex-row-reverse">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                                 <User size={14} className="text-white" />
                              </div>
                              <div className="bg-primary-600/40 p-3 rounded-lg rounded-tr-none text-sm text-white border border-primary-500/30">
                                 That's exactly what I had in mind! How much should I budget?
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Why Choose WanderSphere Section */}
            <div className="py-20 px-6">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Travelers Love WanderSphere</h2>
                  <p className="text-gray-400 text-lg max-w-2xl mx-auto">Built by travelers, for travelers. Real experiences from real people around the world.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-primary-500/30 transition-colors">
                    <div className="text-4xl mb-4">✈️</div>
                    <h3 className="text-xl font-bold text-white mb-3">Real Destinations</h3>
                    <p className="text-gray-400">Curated by our team of adventurers who've actually been there and loved it. No generic tourist spots—only places worth your time.</p>
                  </motion.div>
                  
                  <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-primary-500/30 transition-colors">
                    <div className="text-4xl mb-4">🤖</div>
                    <h3 className="text-xl font-bold text-white mb-3">AI-Powered Planning</h3>
                    <p className="text-gray-400">TravelMate AI learns your preferences and creates personalized itineraries. Save hours of research and get smarter recommendations.</p>
                  </motion.div>
                  
                  <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-panel p-8 rounded-2xl border border-white/10 hover:border-primary-500/30 transition-colors">
                    <div className="text-4xl mb-4">💰</div>
                    <h3 className="text-xl font-bold text-white mb-3">Budget-Friendly</h3>
                    <p className="text-gray-400">Find amazing trips at every price point. From backpacker hostels to luxury resorts—we have something for every wallet.</p>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Travel Stories Section */}
            <div className="py-20 px-6 bg-white/5 backdrop-blur-sm border-t border-white/10">
              <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Real Stories from Real Travelers</h2>
                  <p className="text-gray-400 text-lg">See what people are discovering with WanderSphere</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} className="glass-panel p-6 rounded-xl border border-white/15 hover:border-white/30 transition-colors">
                    <div className="flex gap-3 mb-5">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-white text-sm">Sarah from NYC</p>
                        <p className="text-xs text-gray-400">Bali Trip, March 2025</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">"Planned 2 weeks in Bali in one evening. Found places my friends never knew existed. The AI suggestions were spot on—saved me hours of research!"</p>
                    <div className="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                  </motion.div>
                  
                  <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-xl border border-white/15 hover:border-white/30 transition-colors">
                    <div className="flex gap-3 mb-5">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary-500 to-primary-500 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-white text-sm">James & Emma</p>
                        <p className="text-xs text-gray-400">Honeymoon in Europe</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">"Every recommendation was perfect. We felt like locals, not tourists. The hidden gems WanderSphere suggested made our honeymoon truly unforgettable."</p>
                    <div className="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                  </motion.div>
                  
                  <motion.div initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="glass-panel p-6 rounded-xl border border-white/15 hover:border-white/30 transition-colors">
                    <div className="flex gap-3 mb-5">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent-500 to-primary-500 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-white text-sm">Marco from Brasil</p>
                        <p className="text-xs text-gray-400">Solo Travel, SE Asia</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">"Budget solo traveler here. This app helped me find the best hostels and meet other travelers. Saved money without sacrificing experiences!"</p>
                    <div className="text-yellow-400 text-sm">⭐⭐⭐⭐⭐</div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <footer className="border-t border-white/10 py-12 px-6 bg-gradient-to-b from-white/2 to-transparent">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                  {/* Brand Column */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="bg-gradient-to-br from-primary-500 to-secondary-500 p-2 rounded-lg">
                        <Map className="text-white" size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-white">WanderSphere</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-5 leading-relaxed">Making travel planning human again. Real recommendations, real connections.</p>
                    <div className="flex gap-3">
                      <a href="#" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-primary-500/30 flex items-center justify-center text-gray-400 hover:text-white transition text-sm">f</a>
                      <a href="#" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-primary-500/30 flex items-center justify-center text-gray-400 hover:text-white transition text-sm">𝕏</a>
                      <a href="#" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-primary-500/30 flex items-center justify-center text-gray-400 hover:text-white transition text-sm">in</a>
                    </div>
                  </div>

                  {/* Explore Column */}
                  <div>
                    <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wide">Explore</h4>
                    <ul className="space-y-2">
                      <li><button onClick={() => setView(ViewState.EXPLORE)} className="text-gray-400 text-sm hover:text-white transition font-light">All Destinations</button></li>
                      <li><button onClick={() => setView(ViewState.CHATBOT)} className="text-gray-400 text-sm hover:text-white transition font-light">Plan with AI</button></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Travel Guides</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Budget Tips</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Travel Stories</a></li>
                    </ul>
                  </div>

                  {/* Support Column */}
                  <div>
                    <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wide">Support</h4>
                    <ul className="space-y-2">
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Help Center</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Contact Us</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">FAQ</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Booking Support</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Report Issue</a></li>
                    </ul>
                  </div>

                  {/* Legal Column */}
                  <div>
                    <h4 className="font-semibold text-white mb-5 text-sm uppercase tracking-wide">Legal</h4>
                    <ul className="space-y-2">
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Privacy Policy</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Terms of Service</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Cookie Policy</a></li>
                      <li><a href="#" className="text-gray-400 text-sm hover:text-white transition font-light">Accessibility</a></li>
                    </ul>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 pt-8">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-xs font-light">© 2025 WanderSphere. Crafted with ❤️ for travelers. <span className="text-gray-600">Travel responsibly, explore fearlessly.</span></p>
                    <div className="flex gap-6 text-xs text-gray-500">
                      <a href="#" className="hover:text-gray-300 transition font-light">Sitemap</a>
                      <a href="#" className="hover:text-gray-300 transition font-light">Partners</a>
                      <a href="#" className="hover:text-gray-300 transition font-light">Careers</a>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen font-sans text-gray-100 overflow-x-hidden selection:bg-primary-500/30 selection:text-white">
      <Navbar currentView={view} setView={setView} user={user} onLogout={handleLogout} />
      
      {renderContent()}

      <Notification 
        message={notification.message} 
        type={notification.type} 
        isVisible={notification.isVisible} 
        onClose={closeNotification} 
      />
    </div>
  );
};

export default App;